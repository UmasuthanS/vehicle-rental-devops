require('dotenv').config({ path: require('node:path').resolve(__dirname, '../../.env'), quiet: true });
const jwt = require('jsonwebtoken');
function getConfig(env = process.env) {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 32 || env.JWT_SECRET.startsWith('replace-')) {
    throw new Error('Set JWT_SECRET to at least 32 random characters.');
  }
  const expiresIn = env.JWT_EXPIRES_IN || '1h';
  const payload = jwt.decode(jwt.sign({}, env.JWT_SECRET, { expiresIn }));
  const maxAge = (payload.exp - payload.iat) * 1000;
  if (maxAge <= 0) throw new Error('JWT_EXPIRES_IN must be positive.');
  const origin = new URL(env.FRONTEND_URL || 'http://localhost:5173').origin;
  return { secret: env.JWT_SECRET, expiresIn, maxAge, origin, secure: env.NODE_ENV === 'production' };
}
module.exports = { getConfig };
