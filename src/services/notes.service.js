import { randomUUID } from "node:crypto";
import { decrypt, encrypt, noteAAD } from "../lib/crypto.js";

export function notesService(repository, key) {
  if (!Buffer.isBuffer(key) || key.length !== 32)
    throw new Error("La clave de notas debe tener 32 bytes");
  const encode = (ownerId, id, data) => ({
    id,
    ownerId,
    title: encrypt(data.title, key, noteAAD(ownerId, id, "title")),
    content: encrypt(data.content, key, noteAAD(ownerId, id, "content")),
    keyVersion: "v1",
  });
  const decode = (ownerId, note) => {
    if (note.owner_id !== ownerId || note.key_version !== "v1")
      throw new Error("No se puede abrir la nota");
    return {
      id: note.id,
      title: decrypt(
        note.encrypted_title,
        key,
        noteAAD(ownerId, note.id, "title"),
      ),
      content: decrypt(
        note.encrypted_content,
        key,
        noteAAD(ownerId, note.id, "content"),
      ),
      updatedAt: note.updated_at,
    };
  };
  return {
    async list(ownerId, page) {
      const rows = await repository.list(ownerId, (page - 1) * 100);
      return {
        notes: rows.slice(0, 100).map((note) => decode(ownerId, note)),
        hasNext: rows.length > 100,
      };
    },
    async find(ownerId, id) {
      const note = await repository.find(ownerId, id);
      return note ? decode(ownerId, note) : null;
    },
    async create(ownerId, data) {
      const id = randomUUID();
      await repository.create(encode(ownerId, id, data));
      return id;
    },
    update(ownerId, id, data) {
      return repository.update(encode(ownerId, id, data));
    },
    remove(ownerId, id) {
      return repository.remove(ownerId, id);
    },
  };
}
