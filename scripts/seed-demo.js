import "dotenv/config";
import { loadConfig } from "../src/config/env.js";
import { createDatabase } from "../src/config/database.js";
import { provisionDemoAccounts } from "../src/services/demo.service.js";
import { auditRepository } from "../src/repositories/audit.repository.js";
import { auditService } from "../src/services/audit.service.js";

let database;
try {
  const config = loadConfig();
  if (
    config.NODE_ENV !== "production" &&
    !["127.0.0.1", "localhost", "::1"].includes(config.DB_HOST.toLowerCase())
  )
    throw new Error("La preparación local requiere una base local");
  if (
    config.NODE_ENV === "production" &&
    process.env.ALLOW_PRODUCTION_DEMO !== "yes"
  )
    throw new Error("Producción requiere autorización explícita");
  database = createDatabase(config);
  const created = await provisionDemoAccounts(
    database,
    auditService(
      auditRepository(database),
      Buffer.from(config.AUDIT_HMAC_KEY, "hex"),
    ),
    {
      userEmail: process.env.DEMO_USER_EMAIL,
      userPassword: process.env.DEMO_USER_PASSWORD,
      adminEmail: process.env.DEMO_ADMIN_EMAIL,
      adminPassword: process.env.DEMO_ADMIN_PASSWORD,
    },
  );
  console.log(
    `Cuentas nuevas creadas: ${created}. No se mostraron credenciales.`,
  );
} catch {
  console.error(
    "No se prepararon las cuentas: revisa la configuración y las cuentas existentes.",
  );
  process.exitCode = 1;
} finally {
  if (database) await database.close();
}
