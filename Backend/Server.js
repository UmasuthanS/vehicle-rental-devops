const { getConfig } = require('./src/config/env');
const { createPool } = require('./src/config/database');
const { createApp } = require('./src/app');
const { startupError } = require('./src/config/startup-error');
(async () => {
  const config = getConfig();
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.');
  const pool = createPool();
  let server;
  try {
    await pool.query('SELECT id, name, email, password_hash, role, created_at FROM users LIMIT 0');
    server = createApp(pool, config).listen(port);
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  } catch (error) { await pool.end(); throw error; }
  console.log(`Authentication API listening on http://localhost:${port}`);
  const shutdown = () => server.close(() => pool.end());
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
})().catch(error => { console.error('Startup failed: ' + startupError(error)); process.exitCode = 1; });
