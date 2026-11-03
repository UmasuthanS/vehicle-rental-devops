require('dotenv').config({ path: require('node:path').resolve(__dirname, '../../.env'), quiet: true });
const mysql = require('mysql2/promise');
function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, connectionLimit: 10, waitForConnections: true,
    charset: 'utf8mb4', multipleStatements: false,
  });
}
module.exports = { createPool };
