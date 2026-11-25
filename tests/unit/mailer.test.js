import test from "node:test";
import assert from "node:assert/strict";
import { configuredMailer } from "../../src/config/mailer.js";

test("SMTP deshabilitado por defecto y configuración parcial rechazada", async () => {
  assert.equal(configuredMailer({}), null);
  assert.throws(() => configuredMailer({ SMTP_HOST: "smtp.example.invalid" }));
  assert.equal(configuredMailer({ MAIL_PROVIDER: "none" }), null);
  assert.throws(() => configuredMailer({ MAIL_PROVIDER: "smtp" }));
  const configured = {
    SMTP_HOST: "smtp.example.invalid",
    SMTP_PORT: "587",
    SMTP_USER: "synthetic",
    SMTP_PASSWORD: "synthetic-password",
    SMTP_FROM: "demo@example.invalid",
    PUBLIC_BASE_URL: "https://example.invalid",
  };
  assert.equal(
    typeof configuredMailer(configured).mailer.sendRecovery,
    "function",
  );
  const alias = {
    ...configured,
    MAIL_PROVIDER: "smtp",
    SMTP_PASS: configured.SMTP_PASSWORD,
    SMTP_PASSWORD: "",
    SMTP_SECURE: "false",
  };
  assert.equal(typeof configuredMailer(alias).mailer.sendRecovery, "function");
  assert.throws(() =>
    configuredMailer({ ...alias, SMTP_PASSWORD: "different-password" }),
  );
  assert.throws(() =>
    configuredMailer({ ...configured, MAIL_PROVIDER: "unknown" }),
  );
  assert.throws(() =>
    configuredMailer({ ...configured, SMTP_SECURE: "maybe" }),
  );
  let transportOptions;
  let sentMessage;
  const factory = (options) => {
    transportOptions = options;
    return {
      async sendMail(message) {
        sentMessage = message;
      },
    };
  };
  const starttls = configuredMailer(alias, factory);
  assert.equal(transportOptions.secure, false);
  assert.equal(transportOptions.requireTLS, true);
  await starttls.mailer.sendRecovery(
    "person@example.invalid",
    "https://example.invalid/restablecer?token=synthetic",
  );
  assert.equal(sentMessage.to, "person@example.invalid");
  assert.match(sentMessage.text, /restablecer/);
  configuredMailer(
    { ...configured, SMTP_PORT: "465", SMTP_SECURE: "true" },
    factory,
  );
  assert.equal(transportOptions.secure, true);
  assert.throws(() =>
    configuredMailer({
      ...configured,
      PUBLIC_BASE_URL: "http://example.invalid",
    }),
  );
});
