import { signEvent, verifyEvent } from "../lib/crypto.js";

export function auditService(repository, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32)
    throw new Error("Clave de auditoría inválida");
  const canonical = (value) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
  const fields = (event) => [
    event.actorId || null,
    event.type,
    event.severity,
    event.requestId || null,
    canonical(event.metadata),
    event.createdAt,
  ];
  return {
    async record(type, severity, actorId = null, metadata = {}, transaction) {
      const createdAt = new Date()
        .toISOString()
        .replace("T", " ")
        .replace("Z", "");
      const event = {
        actorId,
        type,
        severity,
        requestId: null,
        metadata,
        createdAt,
      };
      await repository.create(
        event,
        signEvent(fields(event), key),
        transaction,
      );
    },
    async list(page) {
      const rows = await repository.list((page - 1) * 50);
      return {
        events: rows.slice(0, 50).map((row) => {
          const metadata =
            typeof row.metadata === "string"
              ? JSON.parse(row.metadata)
              : row.metadata;
          const event = {
            actorId: row.actor_user_id,
            type: row.event_type,
            severity: row.severity,
            requestId: row.request_id,
            metadata,
            createdAt: row.created_at_text.slice(0, 23),
          };
          return {
            ...event,
            id: row.id,
            valid: verifyEvent(fields(event), row.integrity_signature, key),
          };
        }),
        hasNext: rows.length > 50,
      };
    },
  };
}
