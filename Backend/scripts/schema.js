const fs = require('node:fs/promises');
const path = require('node:path');
async function initializeSchema(pool) {
  await pool.query(await fs.readFile(path.join(__dirname, '../database/int.sql'), 'utf8'));
  await pool.query('SELECT id, name, email, password_hash, role, created_at FROM users LIMIT 0');
}
module.exports = { initializeSchema };
