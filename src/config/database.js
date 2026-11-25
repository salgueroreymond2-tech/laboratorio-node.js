import { Sequelize } from "sequelize";

export function createDatabase(config) {
  return new Sequelize(config.DB_NAME, config.DB_USER, config.DB_PASSWORD, {
    dialect: "mysql",
    host: config.DB_HOST,
    port: config.DB_PORT,
    logging: false,
    dialectOptions: {
      connectTimeout: 5000,
      ...(config.NODE_ENV === "production"
        ? { ssl: { ca: config.DB_TLS_CA, rejectUnauthorized: true } }
        : {}),
    },
    pool: { max: 5, min: 0, acquire: 5000, idle: 10000 },
  });
}
