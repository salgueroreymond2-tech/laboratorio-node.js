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

test("Resend usa HTTPS, rechaza configuración incompleta y oculta errores del proveedor", async () => {
  const env = {
    MAIL_PROVIDER: "resend",
    RESEND_API_KEY: "synthetic-api-key",
    RESEND_FROM: "sender@example.invalid",
    APP_URL: "https://example.invalid",
  };
  assert.throws(() => configuredMailer({ ...env, RESEND_API_KEY: "" }));
  assert.throws(() =>
    configuredMailer({ ...env, SMTP_HOST: "smtp.example.invalid" }),
  );
  assert.throws(() => configuredMailer({ ...env, MAIL_PROVIDER: "none" }));
  assert.throws(() =>
    configuredMailer({ ...env, APP_URL: "http://example.invalid" }),
  );
  let request;
  const send = async (url, options) => {
    request = { url, options };
    return { ok: true };
  };
  const result = configuredMailer(env, undefined, send);
  await result.mailer.sendRecovery(
    "person@example.invalid",
    "https://example.invalid/reset?token=synthetic",
  );
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.redirect, "error");
  const body = JSON.parse(request.options.body);
  assert.equal(body.from, env.RESEND_FROM);
  assert.deepEqual(body.to, ["person@example.invalid"]);
  assert.match(body.text, /token=synthetic/);
  const failed = configuredMailer(env, undefined, async () => ({ ok: false }));
  await assert.rejects(
    failed.mailer.sendRecovery(
      "person@example.invalid",
      "https://example.invalid/reset",
    ),
    /^Error: No se pudo enviar el correo$/,
  );
});
