import session from "express-session";
import { QueryTypes } from "sequelize";

export class MysqlSessionStore extends session.Store {
  constructor(database) {
    super();
    this.database = database;
  }
  get(id, callback) {
    this.database
      .query(
        "SELECT data FROM sessions WHERE session_id = $id AND expires > $now LIMIT 1",
        {
          bind: { id, now: Math.floor(Date.now() / 1000) },
          type: QueryTypes.SELECT,
        },
      )
      .then((rows) =>
        callback(null, rows.length ? JSON.parse(rows[0].data) : null),
      )
      .catch(callback);
  }
  set(id, data, callback = () => {}) {
    const expires = Math.floor(new Date(data.cookie.expires).getTime() / 1000);
    this.database
      .query(
        "INSERT INTO sessions (session_id, expires, data) VALUES ($id, $expires, $data) ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)",
        {
          bind: { id, expires, data: JSON.stringify(data) },
        },
      )
      .then(() => callback(null))
      .catch(callback);
  }
  destroy(id, callback = () => {}) {
    this.database
      .query("DELETE FROM sessions WHERE session_id = $id", { bind: { id } })
      .then(() => callback(null))
      .catch(callback);
  }
  touch(id, data, callback = () => {}) {
    this.database
      .query("UPDATE sessions SET expires = $expires WHERE session_id = $id", {
        bind: {
          id,
          expires: Math.floor(new Date(data.cookie.expires).getTime() / 1000),
        },
      })
      .then(() => callback(null))
      .catch(callback);
  }
}
