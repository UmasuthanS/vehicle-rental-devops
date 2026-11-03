const fs = require('node:fs/promises');
const path = require('node:path');
const { createPool } = require('../src/config/database');
(async () => {
  const pool = createPool();
  try {
    await pool.query(await fs.readFile(path.join(__dirname, '../database/int.sql'), 'utf8'));
    console.log('Users schema initialized (existing records preserved).');
  } finally { await pool.end(); }
})().catch(() => { console.error('Migration failed. Check database access and schema compatibility.'); process.exitCode = 1; });
