// Fail closed until the missing application and deployment gates are implemented.
console.error(
  "Liberación bloqueada: faltan funciones de cuenta y administración, controles de seguridad completos y despliegue verificado.",
);
process.exitCode = 1;
