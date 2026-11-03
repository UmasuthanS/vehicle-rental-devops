// Run from any directory after `docker compose up -d --wait`.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const base = process.env.SMOKE_BASE_URL || 'http://localhost:8080';
const email = `docker-smoke-${randomUUID()}@example.com`;
const password = randomUUID() + 'A1';
let registered = false;
async function api(endpoint, data, cookie) {
  return fetch(`${base}/api/auth${endpoint}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: { Connection: 'close', 'Content-Type': 'application/json', 'X-Requested-With': 'VehicleRental', Origin: new URL(base).origin,
      ...(cookie ? { Cookie: cookie } : {}) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    signal: AbortSignal.timeout(10000),
  });
}
(async () => {
  try {
    const homepage = await fetch(base, { headers: { Connection: 'close' } });
    assert.equal(homepage.status, 200); assert.match(await homepage.text(), /<div id="root">/);
    assert.equal((await api('/me')).status, 401);
    const signup = await api('/register', { name: 'Docker smoke test', email, password, role: 'admin' });
    assert.equal(signup.status, 201); registered = true;
    assert.equal((await signup.json()).user.role, 'customer');
    const login = await api('/login', { email, password }); assert.equal(login.status, 200);
    const setCookie = login.headers.get('set-cookie'); assert.match(setCookie, /HttpOnly/);
    const cookie = setCookie.split(';')[0];
    const profile = await api('/me', undefined, cookie); assert.equal(profile.status, 200);
    assert.equal((await profile.json()).user.email, email);
    assert.equal((await api('/dashboard/customer', undefined, cookie)).status, 200);
    assert.equal((await api('/dashboard/admin', undefined, cookie)).status, 403);
    if (process.env.SMOKE_RESTART === '1') {
      for (const args of [['down'], ['up', '-d', '--wait', '--wait-timeout', '180']]) {
        const result = spawnSync('docker', ['compose', ...args], {
          cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 240000,
        });
        if (result.status !== 0) throw new Error('Compose restart verification failed: ' + result.stderr);
      }
      const restored = await api('/me', undefined, cookie);
      assert.equal(restored.status, 200);
      assert.equal((await restored.json()).user.email, email);
      console.log('PASS: database record and signed session survived container removal and recreation.');
    }
    const logout = await api('/logout', {}, cookie); assert.equal(logout.status, 200);
    assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
    assert.equal((await api('/me')).status, 401);
    console.log('PASS: website, registration, MySQL-backed login/profile, role protection and logout.');
  } finally {
    if (registered) {
      const cleanup = spawnSync('docker', ['compose', 'exec', '-T', 'backend', 'node'], {
        cwd: path.join(__dirname, '..'), encoding: 'utf8',
        input: `const {createPool}=require('./src/config/database');(async()=>{const p=createPool();try{await p.execute('DELETE FROM users WHERE email = ?',[${JSON.stringify(email)}]);}finally{await p.end()}})().catch(()=>{process.exitCode=1});`,
      });
      if (cleanup.status !== 0) throw new Error('Smoke test account cleanup failed; check Docker access.');
      console.log('Synthetic smoke-test account removed.');
    }
  }
})().catch(error => { console.error('Smoke test failed:', error.message); process.exitCode = 1; });
