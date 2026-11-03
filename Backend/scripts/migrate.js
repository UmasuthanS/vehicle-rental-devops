const { createPool } = require('../src/config/database');
const { initializeSchema } = require('./schema');
const { startupError } = require('../src/config/startup-error');
(async () => {
  const pool = createPool();
  try {
    await initializeSchema(pool);
    console.log('Users schema initialized (existing records preserved).');
  } finally { await pool.end(); }
})().catch(error => { console.error('Migration failed: ' + startupError(error)); process.exitCode = 1; });
