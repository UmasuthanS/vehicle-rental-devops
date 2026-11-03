const jwt = require('jsonwebtoken');
const cookieOptions = config => ({ httpOnly: true, secure: config.secure, sameSite: 'lax', path: '/api' });
function authentication(pool, config) {
  return async (req, res, next) => {
    try {
      const token = req.cookies.session;
      if (!token) return res.status(401).json({ message: 'Authentication required.' });
      let identity;
      try { identity = jwt.verify(token, config.secret, { algorithms: ['HS256'], issuer: 'vehicle-rental', audience: 'vehicle-rental-web' }); }
      catch { return res.status(401).json({ message: 'Session expired or invalid. Please log in.' }); }
      if (!/^\d+$/.test(identity.sub)) return res.status(401).json({ message: 'Invalid session.' });
      const [users] = await pool.execute('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [identity.sub]);
      if (!users[0]) return res.status(401).json({ message: 'Authentication required.' });
      req.user = users[0];
      next();
    } catch (err) { next(err); }
  };
}
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Authentication required.' });
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Permission denied.' });
  next();
};
function csrf(config) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('X-Requested-With') !== 'VehicleRental' || (req.get('Origin') && req.get('Origin') !== config.origin)) {
      return res.status(403).json({ message: 'Request origin could not be verified.' });
    }
    next();
  };
}
function errorHandler(err, req, res, next) { // Express recognizes error handlers by their four arguments.
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON.' });
  if (err.status === 413) return res.status(413).json({ message: 'Request too large.' });
  res.status(500).json({ message: 'Service unavailable. Please try again later.' });
}
module.exports = { authentication, authorize, csrf, cookieOptions, errorHandler };
