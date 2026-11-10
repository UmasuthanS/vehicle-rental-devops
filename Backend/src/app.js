const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { csrf, errorHandler } = require('./middleware/auth');
const { authRoutes } = require('./routes/auth');
const { vehicleRoutes } = require('./routes/vehicles');
const { reservationRoutes } = require('./routes/reservations');
function createApp(pool, config) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.origin, credentials: true }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.json({ limit: '10kb' }), cookieParser(), csrf(config));
  app.use('/api/auth', authRoutes(pool, config));
  app.use('/api/vehicles', vehicleRoutes(pool, config));
  app.use('/api/reservations', reservationRoutes(pool, config));
  app.use((req, res) => res.status(404).json({ message: 'Endpoint not found.' }));
  app.use(errorHandler);
  return app;
}
module.exports = { createApp };
