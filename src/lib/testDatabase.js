// Restrict test tooling to a dedicated database on this machine.
// A localhost tunnel could still point elsewhere; use a dedicated MySQL instance.
export function assertIsolatedTestDatabase({ nodeEnv, host, database }) {
  if (
    nodeEnv !== "test" ||
    database !== "securevault_test_db" ||
    !["127.0.0.1", "localhost", "::1"].includes(host)
  ) {
    throw new Error(
      "La base de pruebas debe ser local, aislada y usar NODE_ENV=test.",
    );
  }
}
