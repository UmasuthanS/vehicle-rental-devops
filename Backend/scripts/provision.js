// Local administrative operation: existing accounts only; passwords never enter shell history.
const { createPool } = require('../src/config/database');
const [email, role] = process.argv.slice(2);
if (!email || !['customer', 'owner', 'admin'].includes(role)) {
  console.error('Usage: npm run provision -- email owner|admin|customer'); process.exit(1);
}
(async () => {
  const pool = createPool();
  try {
    const [result] = await pool.execute('UPDATE users SET role = ? WHERE email = ?', [role, email.trim().toLowerCase()]);
    if (!result.affectedRows) throw new Error('Account not found');
    console.log('Account role updated.');
  } finally { await pool.end(); }
})().catch(() => { console.error('Provisioning failed. Check account and database access.'); process.exitCode = 1; });
