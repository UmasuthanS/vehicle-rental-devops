const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const { authentication, authorize, cookieOptions } = require('../middleware/auth');
const validEmail = email => typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validPassword = password => typeof password === 'string' && password.length >= 8 && Buffer.byteLength(password, 'utf8') <= 72 && /[a-zA-Z]/.test(password) && /[0-9]/.test(password);
function authRoutes(pool, config) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in 15 minutes.' } });
  router.post('/register', limiter, async (req, res) => {
    const { name, email, password } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100 || !validEmail(email) || !validPassword(password)) {
      return res.status(400).json({ message: 'Enter a name (1–100 characters), valid email, and password with 8+ characters, a letter and a number (maximum 72 UTF-8 bytes).' });
    }
    const hash = await bcrypt.hash(password, 12);
    try {
      const [result] = await pool.execute('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [name.trim(), email.trim().toLowerCase(), hash, 'customer']);
      res.status(201).json({ message: 'Account created. Please log in.', user: { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role: 'customer' } });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'An account with that email already exists.' });
      throw err;
    }
  });
  // Precomputed valid bcrypt hash keeps unknown-account comparisons on the same code path.
  const dummyHash = bcrypt.hashSync('unused-dummy-password', 12);
  router.post('/login', limiter, async (req, res) => {
    const { email, password } = req.body || {};
    if (!validEmail(email) || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) {
      return res.status(400).json({ message: 'Enter a valid email and password.' });
    }
    const [users] = await pool.execute('SELECT id, name, email, password_hash, role, created_at FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    const user = users[0];
    const matches = await bcrypt.compare(password, user?.password_hash || dummyHash);
    if (!user || !matches) return res.status(401).json({ message: 'Invalid email or password.' });
    const token = jwt.sign({ role: user.role }, config.secret, { algorithm: 'HS256', subject: String(user.id), expiresIn: config.expiresIn, issuer: 'vehicle-rental', audience: 'vehicle-rental-web' });
    res.cookie('session', token, { ...cookieOptions(config), maxAge: config.maxAge });
    const { password_hash: omitted, ...profile } = user;
    res.json({ user: profile });
  });
  const requireAuth = authentication(pool, config);
  router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));
  router.get('/dashboard/:role', requireAuth, (req, res, next) => authorize(req.params.role)(req, res, next), (req, res) => {
    if (!['customer', 'owner', 'admin'].includes(req.params.role)) return res.sendStatus(404);
    res.json({ user: req.user, message: `Welcome to your ${req.user.role} dashboard.` });
  });
  router.post('/logout', (req, res) => {
    res.clearCookie('session', cookieOptions(config));
    res.json({ message: 'Logged out.' });
  });
  return router;
}
module.exports = { authRoutes, validEmail, validPassword };
