const { createPool } = require('../src/config/database');
(async () => {
  const pool = createPool();
  try {
    await pool.query('SELECT 1');
    const response = await fetch(`http://127.0.0.1:${process.env.PORT || 5000}/api/auth/me`, { signal: AbortSignal.timeout(3000) });
    // An unauthenticated profile request must be rejected by a healthy API.
    if (response.status !== 401) throw new Error('Unexpected API response');
  } finally { await pool.end(); }
})().catch(() => { process.exitCode = 1; });
