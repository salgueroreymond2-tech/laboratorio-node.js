import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "../../src/app.js";

async function withServer(database, callback) {
  const server = createServer(createApp({ database }));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  }
}

test("health failure does not disclose a synthetic internal error", async () => {
  await withServer(
    {
      authenticate: async () => {
        throw new Error("synthetic-private-detail");
      },
    },
    async (url) => {
      const response = await fetch(`${url}/health`);
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { status: "unavailable" });
      assert.equal(response.headers.get("x-powered-by"), null);
      const directives = response.headers
        .get("content-security-policy")
        .split(";")
        .map((item) => item.trim());
      assert.ok(directives.includes("script-src 'self'"));
      assert.ok(directives.includes("script-src-attr 'none'"));
    },
  );
});

test("unknown mutations are denied and oversized JSON is rejected", async () => {
  await withServer({ authenticate: async () => {} }, async (url) => {
    const unknown = await fetch(`${url}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "synthetic" }),
    });
    assert.equal(unknown.status, 404);
    const large = await fetch(`${url}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content: "x".repeat(17000) }),
    });
    assert.equal(large.status, 413);
  });
});
