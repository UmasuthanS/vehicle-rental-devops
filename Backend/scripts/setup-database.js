const mysql = require('mysql2/promise');
const { getDatabaseConfig, createPool } = require('../src/config/database');
const { initializeSchema } = require('./schema');
const { startupError } = require('../src/config/startup-error');
(async () => {
  const { database, ...config } = getDatabaseConfig();
  const connection = await mysql.createConnection(config);
  try {
    // escapeId quotes the identifier; no existing database or table is removed.
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${mysql.escapeId(database)} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally { await connection.end(); }
  const pool = createPool();
  try { await initializeSchema(pool); }
  finally { await pool.end(); }
  console.log('Database and users table are ready. Existing records preserved.');
})().catch(error => { console.error('Database setup failed: ' + startupError(error)); process.exitCode = 1; });
