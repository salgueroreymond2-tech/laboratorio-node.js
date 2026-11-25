import { randomUUID } from "node:crypto";
import { QueryTypes } from "sequelize";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { strongPassword } from "../validators/profile.validator.js";

const schema = z
  .object({
    userEmail: z.string().trim().toLowerCase().email().max(254),
    userPassword: strongPassword,
    adminEmail: z.string().trim().toLowerCase().email().max(254),
    adminPassword: strongPassword,
  })
  .strict()
  .refine(
    (value) =>
      value.userEmail !== value.adminEmail &&
      value.userPassword !== value.adminPassword,
  );

export async function provisionDemoAccounts(database, audit, input) {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new Error("Configuración de demostración inválida");
  const accounts = [
    {
      email: parsed.data.userEmail,
      password: parsed.data.userPassword,
      role: "user",
      name: "Usuario de demostración",
    },
    {
      email: parsed.data.adminEmail,
      password: parsed.data.adminPassword,
      role: "admin",
      name: "Administrador de demostración",
    },
  ];
  const hashes = await Promise.all(
    accounts.map((account) => hashPassword(account.password)),
  );
  return database.transaction(async (transaction) => {
    let created = 0;
    for (const [index, account] of accounts.entries()) {
      const existing = await database.query(
        "SELECT role, status, password_hash FROM users WHERE email = $email FOR UPDATE",
        {
          bind: { email: account.email },
          type: QueryTypes.SELECT,
          transaction,
        },
      );
      if (existing.length) {
        if (
          existing[0].role !== account.role ||
          existing[0].status !== "active" ||
          !(await verifyPassword(existing[0].password_hash, account.password))
        )
          throw new Error("Una cuenta existente no coincide; no se modificó");
        continue;
      }
      const id = randomUUID();
      await database.query(
        "INSERT INTO users (id, name, email, password_hash, role) VALUES ($id, $name, $email, $hash, $role)",
        {
          bind: {
            id,
            name: account.name,
            email: account.email,
            hash: hashes[index],
            role: account.role,
          },
          transaction,
        },
      );
      await audit.record(
        "demo_account_created",
        "info",
        null,
        { targetId: id, role: account.role },
        transaction,
      );
      created++;
    }
    return created;
  });
}
