import { QueryTypes } from "sequelize";

export function auditRepository(database) {
  return {
    create(event, signature, transaction) {
      return database.query(
        "INSERT INTO security_events (actor_user_id, event_type, severity, request_id, metadata, integrity_signature, created_at) VALUES ($actorId, $type, $severity, $requestId, $metadata, $signature, $createdAt)",
        {
          bind: {
            ...event,
            metadata: JSON.stringify(event.metadata),
            signature,
          },
          transaction,
        },
      );
    },
    list(offset) {
      return database.query(
        "SELECT id, actor_user_id, event_type, severity, request_id, metadata, integrity_signature, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS created_at_text FROM security_events ORDER BY id DESC LIMIT 51 OFFSET $offset",
        { bind: { offset }, type: QueryTypes.SELECT },
      );
    },
  };
}
