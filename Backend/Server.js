const { getConfig } = require('./src/config/env');
const { createPool } = require('./src/config/database');
const { createApp } = require('./src/app');
(async () => {
  const config = getConfig();
  const pool = createPool();
  try { await pool.query('SELECT id, name, email, password_hash, role, created_at FROM users LIMIT 0'); }
  catch (err) { await pool.end(); throw err; }
  const server = createApp(pool, config).listen(Number(process.env.PORT || 5000), () => console.log('Authentication API listening.'));
  const shutdown = () => server.close(() => pool.end());
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})().catch(() => { console.error('Startup failed. Check environment, database connection, and migration.'); process.exitCode = 1; });
