require('dotenv').config({ path: require('node:path').resolve(__dirname, '../../.env'), quiet: true });
const mysql = require('mysql2/promise');
function getDatabaseConfig(env = process.env) {
  if (!env.DB_USER) throw new Error('Set DB_USER in Backend/.env to your MySQL username.');
  if (!env.DB_NAME || !/^[a-zA-Z0-9_]{1,64}$/.test(env.DB_NAME)) {
    throw new Error('Set DB_NAME in Backend/.env (1–64 letters, digits or underscores).');
  }
  if (env.DB_PASSWORD?.startsWith('replace-')) throw new Error('Replace DB_PASSWORD in Backend/.env with your MySQL password.');
  const port = Number(env.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT must be a port between 1 and 65535.');
  return { host: env.DB_HOST || '127.0.0.1', port, user: env.DB_USER,
    password: env.DB_PASSWORD || '', database: env.DB_NAME, charset: 'utf8mb4',
    connectTimeout: 5000, multipleStatements: false };
}
function createPool() {
  return mysql.createPool({ ...getDatabaseConfig(), connectionLimit: 10, waitForConnections: true });
}
module.exports = { createPool, getDatabaseConfig };
