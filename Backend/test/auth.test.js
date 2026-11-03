const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { getConfig } = require('../src/config/env');

const config = getConfig({ JWT_SECRET: crypto.randomBytes(48).toString('hex'), FRONTEND_URL: 'http://localhost:5173', JWT_EXPIRES_IN: '1h' });
function memoryPool() {
  const rows = [];
  return { rows, async execute(sql, params) {
    if (sql.startsWith('INSERT')) {
      if (rows.some(row => row.email === params[1])) throw Object.assign(new Error(), { code: 'ER_DUP_ENTRY' });
      const row = { id: rows.length + 1, name: params[0], email: params[1], password_hash: params[2], role: params[3], created_at: new Date() };
      rows.push(row); return [{ insertId: row.id }];
    }
    if (sql.startsWith('UPDATE')) { rows.find(row => row.email === params[1]).role = params[0]; return [{ affectedRows: 1 }]; }
    const found = rows.filter(row => sql.includes('WHERE email') ? row.email === params[0] : String(row.id) === String(params[0]));
    return [found.map(row => {
      const copy = { ...row };
      if (!sql.includes('password_hash')) delete copy.password_hash;
      return copy;
    })];
  } };
}
function workflow(label, realDatabase) {
  describe(label, { skip: realDatabase && !process.env.TEST_DB_NAME }, () => {
    let pool, server, base, cookie, userId;
    const email = `test-${crypto.randomUUID()}@example.com`;
    async function call(path, data, session, extra = {}) {
      return fetch(`${base}${path}`, { method: data === undefined ? 'GET' : 'POST', headers: {
        'Content-Type': 'application/json', 'X-Requested-With': 'VehicleRental', Origin: config.origin,
        ...(session ? { Cookie: session } : {}), ...extra,
      }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    }
    before(async () => {
      if (realDatabase) {
        assert.match(process.env.TEST_DB_NAME, /^test_auth_[a-z0-9_]+$/);
        const mysql = require('mysql2/promise');
        pool = mysql.createPool({ host: process.env.TEST_DB_HOST || '127.0.0.1', port: Number(process.env.TEST_DB_PORT || 3306), user: process.env.TEST_DB_USER, password: process.env.TEST_DB_PASSWORD, database: process.env.TEST_DB_NAME });
        const sql = await fs.readFile(require('node:path').join(__dirname, '../database/int.sql'), 'utf8');
        await pool.query(sql); await pool.query(sql);
      } else pool = memoryPool();
      server = createApp(pool, config).listen(0, '127.0.0.1');
      await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
      base = `http://127.0.0.1:${server.address().port}/api/auth`;
    });
    after(async () => {
      if (server) await new Promise(resolve => server.close(resolve));
      if (realDatabase && pool) {
        await pool.execute('DELETE FROM users WHERE email = ?', [email]);
        await pool.end();
      }
    });
    it('rejects invalid registration data', async () => {
      for (const data of [{}, { name: 'User', email: 'bad', password: 'Password123' }, { name: 'User', email, password: 'short' }, { name: 'User', email, password: 'é'.repeat(40) + '1' }]) {
        assert.equal((await call('/register', data)).status, 400);
      }
    });
    it('registers a customer, ignores injected roles, and stores only a bcrypt hash', async () => {
      const response = await call('/register', { name: 'Test User', email, password: 'Password123', role: 'admin' });
      assert.equal(response.status, 201);
      const body = await response.json(); userId = body.user.id;
      assert.equal(body.user.role, 'customer'); assert.equal(body.user.password_hash, undefined);
      const [[stored]] = await pool.execute('SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?', [email]);
      assert.notEqual(stored.password_hash, 'Password123');
      assert.ok(await bcrypt.compare('Password123', stored.password_hash));
      if (realDatabase) {
        await pool.query(await fs.readFile(require('node:path').join(__dirname, '../database/int.sql'), 'utf8'));
        const [[preserved]] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
        assert.equal(preserved.id, userId);
      }
    });
    it('rejects duplicate normalized emails', async () => {
      assert.equal((await call('/register', { name: 'Test User', email: email.toUpperCase(), password: 'Password123' })).status, 409);
    });
    it('returns the same error for wrong password and nonexistent account', async () => {
      const a = await call('/login', { email, password: 'Wrong123' });
      const b = await call('/login', { email: 'missing@example.com', password: 'Wrong123' });
      assert.equal(a.status, 401); assert.equal(b.status, 401); assert.deepEqual(await a.json(), await b.json());
    });
    it('logs in with a safe HttpOnly cookie and no exposed token/hash', async () => {
      const response = await call('/login', { email, password: 'Password123' });
      assert.equal(response.status, 200);
      cookie = response.headers.get('set-cookie');
      assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\/api/);
      cookie = cookie.split(';')[0];
      const body = await response.json(); assert.equal(body.user.id, userId); assert.equal(body.user.password_hash, undefined); assert.equal(body.token, undefined);
    });
    it('restores a session and returns database profile', async () => {
      const response = await call('/me', undefined, cookie);
      assert.equal(response.status, 200);
      const body = await response.json(); assert.equal(body.user.email, email); assert.equal(body.user.password_hash, undefined);
    });
    it('rejects missing, invalid, and expired JWTs', async () => {
      const expired = jwt.sign({ role: 'admin' }, config.secret, { subject: String(userId), expiresIn: -1, issuer: 'vehicle-rental', audience: 'vehicle-rental-web' });
      for (const value of [undefined, 'session=invalid', `session=${expired}`]) assert.equal((await call('/me', undefined, value)).status, 401);
    });
    it('protects role routes using the current database role', async () => {
      assert.equal((await call('/dashboard/customer', undefined)).status, 401);
      assert.equal((await call('/dashboard/customer', undefined, cookie)).status, 200);
      assert.equal((await call('/dashboard/admin', undefined, cookie)).status, 403);
      const forged = jwt.sign({ role: 'admin' }, config.secret, { subject: String(userId), expiresIn: '1h', issuer: 'vehicle-rental', audience: 'vehicle-rental-web' });
      assert.equal((await call('/dashboard/admin', undefined, `session=${forged}`)).status, 403);
      for (const role of ['owner', 'admin']) {
        await pool.execute('UPDATE users SET role = ? WHERE email = ?', [role, email]);
        assert.equal((await call(`/dashboard/${role}`, undefined, cookie)).status, 200);
        assert.equal((await (await call('/me', undefined, cookie)).json()).user.role, role);
      }
    });
    it('rejects foreign origins and missing CSRF headers', async () => {
      assert.equal((await call('/logout', {}, cookie, { Origin: 'https://attacker.example' })).status, 403);
      assert.equal((await call('/logout', {}, cookie, { 'X-Requested-With': '' })).status, 403);
    });
    it('clears the cookie on logout and rejects subsequent requests without it', async () => {
      const response = await call('/logout', {}, cookie);
      assert.equal(response.status, 200); assert.match(response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
      assert.equal((await call('/me')).status, 401);
    });
    it('sets Secure cookies in production configuration', async () => {
      const { cookieOptions } = require('../src/middleware/auth');
      assert.equal(cookieOptions({ secure: true }).secure, true);
    });
  });
}
workflow('HTTP authentication contract (isolated in-memory repository)', false);
workflow('MySQL integration (explicit isolated test database)', true);
