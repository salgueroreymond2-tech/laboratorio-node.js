import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { URLSearchParams } from "node:url";
import { Sequelize, QueryTypes } from "sequelize";
import signature from "cookie-signature";
import { createApp } from "../../src/app.js";
import { hashPassword } from "../../src/lib/password.js";
import { assertIsolatedTestDatabase } from "../../src/lib/testDatabase.js";
import { notesRepository } from "../../src/repositories/notes.repository.js";
import { notesService } from "../../src/services/notes.service.js";

test("notas cifradas: CRUD, aislamiento entre cuentas y CSRF", async () => {
  const env = process.env;
  assertIsolatedTestDatabase({
    nodeEnv: env.NODE_ENV,
    host: env.TEST_DB_HOST,
    database: "securevault_test_db",
  });
  assert.ok(env.TEST_DB_USER && env.TEST_DB_PASSWORD && env.TEST_DB_PORT);
  const db = new Sequelize(
    "securevault_test_db",
    env.TEST_DB_USER,
    env.TEST_DB_PASSWORD,
    {
      dialect: "mysql",
      host: env.TEST_DB_HOST,
      port: Number(env.TEST_DB_PORT),
      logging: false,
    },
  );
  const secret = "test-session-secret-".repeat(4);
  const notesKey = randomBytes(32);
  const app = createApp({
    database: db,
    authConfig: {
      sessionSecret: secret,
      csrfSecret: "test-csrf-secret-".repeat(4),
    },
    notesKey,
  });
  const server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const ids = [randomUUID(), randomUUID()];
  const emails = ids.map((id) => `${id}@example.invalid`);
  const password = "Ejemplo#seguro-298371";
  const sessions = new Set();
  function client() {
    const cookies = new Map();
    return {
      async request(path, options = {}) {
        const response = await fetch(base + path, {
          ...options,
          redirect: "manual",
          headers: {
            ...(options.headers || {}),
            cookie: [...cookies]
              .map(([key, value]) => `${key}=${value}`)
              .join("; "),
          },
        });
        for (const item of response.headers.getSetCookie()) {
          const [pair] = item.split(";");
          const i = pair.indexOf("=");
          const key = pair.slice(0, i);
          const value = pair.slice(i + 1);
          cookies.set(key, value);
          if (key === "sv.sid" && value) {
            const decoded = decodeURIComponent(value);
            const id =
              decoded.startsWith("s:") &&
              signature.unsign(decoded.slice(2), secret);
            if (id) sessions.add(id);
          }
        }
        return response;
      },
      async token(path) {
        const response = await this.request(path);
        assert.equal(response.status, 200);
        const html = await response.text();
        const match = html.match(/name="_csrf" value="([^"]+)"/);
        assert.ok(match);
        return match[1];
      },
      post(path, fields) {
        return this.request(path, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(fields),
        });
      },
      async login(email) {
        const csrf = await this.token("/acceso");
        assert.equal(
          (await this.post("/acceso", { email, password, _csrf: csrf })).status,
          303,
        );
      },
    };
  }
  const owner = client(),
    other = client(),
    anonymous = client();
  try {
    const hash = await hashPassword(password);
    await db.query(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES ($id, 'Prueba', $email, $hash, 'user')",
      { bind: { id: ids[0], email: emails[0], hash } },
    );
    await db.query(
      "INSERT INTO users (id, name, email, password_hash, role) VALUES ($id, 'Prueba admin', $email, $hash, 'admin')",
      { bind: { id: ids[1], email: emails[1], hash } },
    );
    assert.equal((await anonymous.request("/notas")).status, 303);
    await owner.login(emails[0]);
    await other.login(emails[1]);
    let csrf = await owner.token("/notas/nueva");
    assert.equal(
      (
        await owner.post("/notas", {
          title: "Título privado",
          content: "contenido privado",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await owner.post("/notas", {
          title: "Título privado",
          content: "contenido privado",
          owner_id: ids[1],
          _csrf: csrf,
        })
      ).status,
      400,
    );
    csrf = await owner.token("/notas/nueva");
    const created = await owner.post("/notas", {
      title: "Título privado",
      content: "contenido privado <script>alert(1)</script>",
      _csrf: csrf,
    });
    assert.equal(created.status, 303);
    const path = created.headers.get("location");
    assert.match(path, /^\/notas\/[0-9a-f-]+$/);
    const id = path.split("/").at(-1);
    const stored = (
      await db.query(
        "SELECT owner_id, encrypted_title, encrypted_content, key_version FROM notes WHERE id = $id",
        { bind: { id }, type: QueryTypes.SELECT },
      )
    )[0];
    assert.equal(stored.owner_id, ids[0]);
    assert.equal(stored.key_version, "v1");
    assert.match(stored.encrypted_title, /^v1\./);
    assert.match(stored.encrypted_content, /^v1\./);
    assert.doesNotMatch(stored.encrypted_title, /Título privado/);
    assert.doesNotMatch(stored.encrypted_content, /contenido privado/);
    const shown = await owner.request(path);
    assert.equal(shown.status, 200);
    assert.equal(shown.headers.get("cache-control"), "no-store");
    const html = await shown.text();
    assert.match(html, /Título privado/);
    assert.match(html, /&lt;script&gt;/);
    assert.doesNotMatch(html, /<script>alert/);
    assert.match(
      await (await owner.request("/notas")).text(),
      /Título privado/,
    );
    assert.doesNotMatch(
      await (await other.request("/notas")).text(),
      /Título privado/,
    );
    assert.equal((await other.request(path)).status, 404);
    assert.equal((await other.request(`${path}/editar`)).status, 404);
    assert.equal((await other.request(`${path}/eliminar`)).status, 404);
    const otherCsrf = await other.token("/notas/nueva");
    assert.equal(
      (
        await other.post(`${path}/editar`, {
          title: "Ataque",
          content: "Ataque",
          _csrf: otherCsrf,
        })
      ).status,
      404,
    );
    assert.equal(
      (await other.post(`${path}/eliminar`, { _csrf: otherCsrf })).status,
      404,
    );
    assert.match(await (await owner.request(path)).text(), /contenido privado/);
    csrf = await owner.token(`${path}/editar`);
    assert.equal(
      (
        await owner.post(`${path}/editar`, {
          title: "Título actualizado",
          content: "Texto actualizado",
          _csrf: csrf,
        })
      ).status,
      303,
    );
    assert.match(await (await owner.request(path)).text(), /Texto actualizado/);
    csrf = await owner.token(`${path}/eliminar`);
    assert.equal(
      (await owner.post(`${path}/eliminar`, { _csrf: csrf })).status,
      303,
    );
    assert.equal((await owner.request(path)).status, 404);
    assert.equal((await owner.request("/notas/no-es-uuid")).status, 404);
    const service = notesService(notesRepository(db), notesKey);
    await Promise.all(
      Array.from({ length: 101 }, (_, i) =>
        service.create(ids[0], {
          title: `Nota ${i}`,
          content: "contenido de prueba",
        }),
      ),
    );
    const firstPage = await (await owner.request("/notas")).text();
    assert.match(firstPage, /Página siguiente/);
    const secondPage = await owner.request("/notas?page=2");
    assert.equal(secondPage.status, 200);
    assert.match(await secondPage.text(), /Página anterior/);
    assert.equal((await owner.request("/notas?page=0")).status, 400);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    for (const id of sessions)
      await db.query("DELETE FROM sessions WHERE session_id = $id", {
        bind: { id },
      });
    for (const id of ids)
      await db.query("DELETE FROM users WHERE id = $id", { bind: { id } });
    await db.close();
  }
});
