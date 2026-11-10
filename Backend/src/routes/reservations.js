const { Router } = require('express');
const { authentication } = require('../middleware/auth');

function parseDate(str) {
  if (typeof str !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return null;
  const [y, m, d] = str.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

function formatReservation(row) {
  return {
    ...row,
    id: Number(row.id),
    vehicle_id: Number(row.vehicle_id),
    customer_id: Number(row.customer_id),
    start_date: typeof row.start_date === 'string' ? row.start_date.slice(0, 10) : new Date(row.start_date).toISOString().slice(0, 10),
    end_date: typeof row.end_date === 'string' ? row.end_date.slice(0, 10) : new Date(row.end_date).toISOString().slice(0, 10),
    total_price: String(row.total_price),
    daily_rate: row.daily_rate ? String(row.daily_rate) : undefined,
  };
}

function reservationRoutes(pool, config) {
  const router = Router();
  const requireAuth = authentication(pool, config);

  router.post('/', requireAuth, async (req, res, next) => {
    let runner;
    let isConn = false;
    try {
      const { vehicle_id, start_date, end_date } = req.body || {};
      const vehicleId = Number(vehicle_id);

      if (!Number.isInteger(vehicleId) || vehicleId < 1) {
        return res.status(400).json({ message: 'Valid vehicle ID is required.' });
      }

      const startDate = parseDate(start_date);
      const endDate = parseDate(end_date);

      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Enter valid start and end dates (YYYY-MM-DD).' });
      }

      const now = new Date();
      const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

      if (startDate < today) {
        return res.status(400).json({ message: 'Start date cannot be in the past.' });
      }

      if (endDate < startDate) {
        return res.status(400).json({ message: 'End date must be on or after start date.' });
      }

      const msPerDay = 1000 * 60 * 60 * 24;
      const days = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

      if (days > 90) {
        return res.status(400).json({ message: 'Rental duration cannot exceed 90 days.' });
      }

      runner = typeof pool.getConnection === 'function' ? await pool.getConnection() : pool;
      isConn = runner !== pool;

      if (isConn) await runner.beginTransaction();

      const [vehicles] = await runner.query(
        'SELECT id, name, daily_rate, available FROM vehicles WHERE id = ?' + (isConn ? ' FOR UPDATE' : ''),
        [vehicleId]
      );

      if (!vehicles || vehicles.length === 0) {
        if (isConn) await runner.rollback();
        return res.status(404).json({ message: 'Vehicle not found.' });
      }

      const vehicle = vehicles[0];
      if (!vehicle.available) {
        if (isConn) await runner.rollback();
        return res.status(400).json({ message: 'This vehicle is currently unavailable for rentals.' });
      }

      const [conflicts] = await runner.query(
        "SELECT id FROM reservations WHERE vehicle_id = ? AND status = 'confirmed' AND start_date <= ? AND end_date >= ?" +
          (isConn ? ' FOR UPDATE' : ''),
        [vehicleId, end_date, start_date]
      );

      if (conflicts && conflicts.length > 0) {
        if (isConn) await runner.rollback();
        return res.status(409).json({ message: 'Vehicle is already reserved for the selected dates.' });
      }

      const dailyRate = Number(vehicle.daily_rate);
      const totalPrice = (dailyRate * days).toFixed(2);

      const [result] = await runner.execute(
        "INSERT INTO reservations (vehicle_id, customer_id, start_date, end_date, status, total_price) VALUES (?, ?, ?, ?, 'confirmed', ?)",
        [vehicleId, req.user.id, start_date, end_date, totalPrice]
      );

      if (isConn) await runner.commit();

      res.status(201).json({
        message: 'Reservation confirmed successfully.',
        reservation: {
          id: result.insertId,
          vehicle_id: vehicleId,
          vehicle_name: vehicle.name,
          customer_id: req.user.id,
          start_date,
          end_date,
          days,
          daily_rate: String(dailyRate.toFixed(2)),
          total_price: totalPrice,
          status: 'confirmed',
        },
      });
    } catch (err) {
      if (isConn && runner) {
        try {
          await runner.rollback();
        } catch {}
      }
      next(err);
    } finally {
      if (isConn && runner) {
        runner.release();
      }
    }
  });

  router.get('/my', requireAuth, async (req, res, next) => {
    try {
      const [rows] = await pool.query(
        `SELECT r.id, r.vehicle_id, r.customer_id, r.start_date, r.end_date, r.status, r.total_price, r.created_at,
                v.name as vehicle_name, v.type as vehicle_type, v.location as vehicle_location,
                v.daily_rate, v.image_url
         FROM reservations r
         JOIN vehicles v ON r.vehicle_id = v.id
         WHERE r.customer_id = ?
         ORDER BY r.start_date DESC, r.id DESC`,
        [req.user.id]
      );
      res.json({ reservations: rows.map(formatReservation) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', requireAuth, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid reservation ID.' });
      }

      const [rows] = await pool.query(
        `SELECT r.id, r.vehicle_id, r.customer_id, r.start_date, r.end_date, r.status, r.total_price, r.created_at,
                v.name as vehicle_name, v.type as vehicle_type, v.location as vehicle_location,
                v.daily_rate, v.image_url
         FROM reservations r
         JOIN vehicles v ON r.vehicle_id = v.id
         WHERE r.id = ?`,
        [id]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Reservation not found.' });
      }

      const reservation = formatReservation(rows[0]);

      if (req.user.role !== 'admin' && reservation.customer_id !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to view this reservation.' });
      }

      res.json({ reservation });
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id/cancel', requireAuth, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid reservation ID.' });
      }

      const [rows] = await pool.query('SELECT id, customer_id, status FROM reservations WHERE id = ?', [id]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Reservation not found.' });
      }

      const reservation = rows[0];

      if (req.user.role !== 'admin' && reservation.customer_id !== req.user.id) {
        return res.status(403).json({ message: 'You do not have permission to cancel this reservation.' });
      }

      if (reservation.status === 'cancelled') {
        return res.status(400).json({ message: 'Reservation is already cancelled.' });
      }

      await pool.execute("UPDATE reservations SET status = 'cancelled' WHERE id = ?", [id]);

      res.json({
        message: 'Reservation cancelled successfully.',
        reservation: { id, status: 'cancelled' },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { reservationRoutes, parseDate, formatReservation };
