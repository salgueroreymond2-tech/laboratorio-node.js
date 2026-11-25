import { QueryTypes } from "sequelize";

export function notesRepository(database) {
  return {
    list(ownerId, offset) {
      return database.query(
        "SELECT id, owner_id, encrypted_title, encrypted_content, key_version, updated_at FROM notes WHERE owner_id = $ownerId ORDER BY updated_at DESC, id DESC LIMIT 101 OFFSET $offset",
        { bind: { ownerId, offset }, type: QueryTypes.SELECT },
      );
    },
    async find(ownerId, id) {
      const rows = await database.query(
        "SELECT id, owner_id, encrypted_title, encrypted_content, key_version, updated_at FROM notes WHERE owner_id = $ownerId AND id = $id LIMIT 1",
        { bind: { ownerId, id }, type: QueryTypes.SELECT },
      );
      return rows[0] || null;
    },
    create(values) {
      return database.query(
        "INSERT INTO notes (id, owner_id, encrypted_title, encrypted_content, key_version) VALUES ($id, $ownerId, $title, $content, $keyVersion)",
        { bind: values },
      );
    },
    async update(values) {
      const [, result] = await database.query(
        "UPDATE notes SET encrypted_title = $title, encrypted_content = $content, key_version = $keyVersion WHERE id = $id AND owner_id = $ownerId",
        { bind: values },
      );
      return result.affectedRows > 0;
    },
    async remove(ownerId, id) {
      const [, result] = await database.query(
        "DELETE FROM notes WHERE id = $id AND owner_id = $ownerId",
        { bind: { ownerId, id } },
      );
      return result.affectedRows > 0;
    },
  };
}
