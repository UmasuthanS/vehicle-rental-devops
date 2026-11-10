const fs = require('node:fs/promises');
const path = require('node:path');
async function initializeSchema(pool) {
  const sql = await fs.readFile(path.join(__dirname, '../database/int.sql'), 'utf8');
  const statements = sql
    .split(/;\s*[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  for (const statement of statements) {
    await pool.query(statement);
  }
  await pool.query('SELECT id, name, email, password_hash, role, created_at FROM users LIMIT 0');
  await pool.query('SELECT id, name, type, location, daily_rate FROM vehicles LIMIT 0');
}
module.exports = { initializeSchema };
