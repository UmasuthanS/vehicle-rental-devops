const { it } = require('node:test');
const assert = require('node:assert/strict');
const { getDatabaseConfig } = require('../src/config/database');
const { startupError } = require('../src/config/startup-error');
it('rejects missing database credentials and unsafe database names', () => {
  assert.throws(() => getDatabaseConfig({}), /DB_USER/);
  assert.throws(() => getDatabaseConfig({ DB_USER: 'app', DB_NAME: 'bad;name' }), /DB_NAME/);
  assert.throws(() => getDatabaseConfig({ DB_USER: 'app', DB_NAME: 'vehicle_rental', DB_PORT: 'invalid' }), /DB_PORT/);
});
it('supports local MySQL defaults and explicit database settings', () => {
  const config = getDatabaseConfig({ DB_USER: 'app', DB_NAME: 'vehicle_rental', DB_PASSWORD: 'synthetic-test-only' });
  assert.equal(config.port, 3306); assert.equal(config.host, '127.0.0.1');
  assert.equal(config.database, 'vehicle_rental'); assert.equal(config.multipleStatements, false);
});
it('explains startup errors without exposing driver messages or credentials', () => {
  for (const code of ['ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ECONNREFUSED', 'EADDRINUSE', 'ER_BAD_FIELD_ERROR']) {
    const message = startupError({ code, message: 'private-password-in-driver-message' });
    assert.ok(!message.includes('private-password')); assert.ok(message.length > 20);
  }
});
