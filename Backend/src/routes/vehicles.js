const { Router } = require('express');

function vehicleRoutes(pool) {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const { type, q, minPrice, maxPrice, available, limit, offset } = req.query;
      const conditions = [];
      const params = [];

      if (type) {
        if (!['car', 'van', 'motorcycle'].includes(type)) {
          return res.status(400).json({ message: 'Invalid vehicle type.' });
        }
        conditions.push('type = ?');
        params.push(type);
      }

      if (q && typeof q === 'string') {
        const trimmed = q.trim().slice(0, 100);
        if (trimmed) {
          conditions.push('(name LIKE ? OR location LIKE ? OR description LIKE ?)');
          const pattern = `%${trimmed}%`;
          params.push(pattern, pattern, pattern);
        }
      }

      if (minPrice !== undefined && minPrice !== '') {
        const min = Number(minPrice);
        if (!Number.isFinite(min) || min < 0) {
          return res.status(400).json({ message: 'Invalid minimum price.' });
        }
        conditions.push('daily_rate >= ?');
        params.push(min);
      }

      if (maxPrice !== undefined && maxPrice !== '') {
        const max = Number(maxPrice);
        if (!Number.isFinite(max) || max < 0) {
          return res.status(400).json({ message: 'Invalid maximum price.' });
        }
        conditions.push('daily_rate <= ?');
        params.push(max);
      }

      if (available !== undefined && available !== '') {
        const isAvailable = available === 'true' || available === '1';
        conditions.push('available = ?');
        params.push(isAvailable ? 1 : 0);
      }

      let sql = 'SELECT id, name, type, location, daily_rate, image_url, description, capacity, fuel_type, transmission, available, created_at FROM vehicles';
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY id ASC';

      const maxLimit = 100;
      const take = Math.min(Math.max(1, Number(limit) || 50), maxLimit);
      const skip = Math.max(0, Number(offset) || 0);

      sql += ` LIMIT ${take} OFFSET ${skip}`;

      const [rows] = await pool.query(sql, params);
      const vehicles = rows.map(row => ({
        ...row,
        daily_rate: String(row.daily_rate),
        available: Boolean(row.available),
      }));

      res.json({ vehicles });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: 'Invalid vehicle ID.' });
      }

      const [rows] = await pool.execute(
        'SELECT id, name, type, location, daily_rate, image_url, description, capacity, fuel_type, transmission, available, created_at FROM vehicles WHERE id = ?',
        [id]
      );

      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Vehicle not found.' });
      }

      const vehicle = {
        ...rows[0],
        daily_rate: String(rows[0].daily_rate),
        available: Boolean(rows[0].available),
      };

      res.json({ vehicle });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { vehicleRoutes };
