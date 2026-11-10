const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { getConfig } = require('../src/config/env');

const config = getConfig({
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  FRONTEND_URL: 'http://localhost:5173',
  JWT_EXPIRES_IN: '1h',
});

function mockReservationPool() {
  const users = [
    { id: 1, name: 'Customer One', email: 'cust1@example.com', role: 'customer', created_at: new Date() },
    { id: 2, name: 'Customer Two', email: 'cust2@example.com', role: 'customer', created_at: new Date() },
  ];

  const vehicles = [
    {
      id: 1,
      name: 'Toyota Corolla Altis',
      type: 'car',
      location: 'Colombo',
      daily_rate: 10000.00,
      image_url: 'https://example.com/corolla.jpg',
      available: 1,
      created_at: new Date(),
    },
  ];

  const reservations = [];

  return {
    users,
    vehicles,
    reservations,
    async query(sql, params = []) {
      if (sql.includes('FROM users WHERE id = ?')) {
        const user = users.find(u => u.id === Number(params[0]));
        return [user ? [user] : []];
      }

      if (sql.includes('FROM vehicles WHERE id = ?')) {
        const v = vehicles.find(item => item.id === Number(params[0]));
        return [v ? [v] : []];
      }

      if (sql.includes("SELECT id FROM reservations WHERE vehicle_id = ? AND status = 'confirmed'")) {
        const vehicleId = Number(params[0]);
        const endDate = params[1];
        const startDate = params[2];
        const conflicts = reservations.filter(
          r =>
            r.vehicle_id === vehicleId &&
            r.status === 'confirmed' &&
            r.start_date <= endDate &&
            r.end_date >= startDate
        );
        return [conflicts];
      }

      if (sql.includes('WHERE r.customer_id = ?')) {
        const custId = Number(params[0]);
        const list = reservations
          .filter(r => r.customer_id === custId)
          .map(r => ({
            ...r,
            vehicle_name: vehicles[0].name,
            vehicle_type: vehicles[0].type,
            vehicle_location: vehicles[0].location,
            daily_rate: vehicles[0].daily_rate,
            image_url: vehicles[0].image_url,
          }));
        return [list];
      }

      if (sql.includes('WHERE r.id = ?')) {
        const resId = Number(params[0]);
        const r = reservations.find(item => item.id === resId);
        if (!r) return [[]];
        return [
          [
            {
              ...r,
              vehicle_name: vehicles[0].name,
              vehicle_type: vehicles[0].type,
              vehicle_location: vehicles[0].location,
              daily_rate: vehicles[0].daily_rate,
              image_url: vehicles[0].image_url,
            },
          ],
        ];
      }

      if (sql.includes('SELECT id, customer_id, status FROM reservations WHERE id = ?')) {
        const resId = Number(params[0]);
        const r = reservations.find(item => item.id === resId);
        return [r ? [{ id: r.id, customer_id: r.customer_id, status: r.status }] : []];
      }

      return [[]];
    },

    async execute(sql, params = []) {
      if (sql.includes('FROM users WHERE id = ?')) {
        const user = users.find(u => u.id === Number(params[0]));
        return [user ? [user] : []];
      }

      if (sql.includes('INSERT INTO reservations')) {
        const newReservation = {
          id: reservations.length + 1,
          vehicle_id: Number(params[0]),
          customer_id: Number(params[1]),
          start_date: params[2],
          end_date: params[3],
          status: 'confirmed',
          total_price: params[4],
          created_at: new Date(),
        };
        reservations.push(newReservation);
        return [{ insertId: newReservation.id }];
      }

      if (sql.includes("UPDATE reservations SET status = 'cancelled'")) {
        const resId = Number(params[0]);
        const r = reservations.find(item => item.id === resId);
        if (r) r.status = 'cancelled';
        return [{ affectedRows: 1 }];
      }

      return [[]];
    },
  };
}

describe('Reservation system API contract', () => {
  let server;
  let base;
  let pool;
  let cookieUser1;
  let cookieUser2;

  before(async () => {
    pool = mockReservationPool();
    server = createApp(pool, config).listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    base = `http://127.0.0.1:${server.address().port}/api/reservations`;

    const token1 = jwt.sign({ role: 'customer' }, config.secret, {
      algorithm: 'HS256',
      subject: '1',
      expiresIn: '1h',
      issuer: 'vehicle-rental',
      audience: 'vehicle-rental-web',
    });
    cookieUser1 = `session=${token1}`;

    const token2 = jwt.sign({ role: 'customer' }, config.secret, {
      algorithm: 'HS256',
      subject: '2',
      expiresIn: '1h',
      issuer: 'vehicle-rental',
      audience: 'vehicle-rental-web',
    });
    cookieUser2 = `session=${token2}`;
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
  });

  async function api(path, method = 'GET', data = undefined, session = undefined) {
    return fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'VehicleRental',
        Origin: config.origin,
        ...(session ? { Cookie: session } : {}),
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
    });
  }

  // Generate dynamic future dates
  const future = new Date();
  future.setUTCDate(future.getUTCDate() + 10);
  const futureStart = future.toISOString().slice(0, 10);

  const futureEndObj = new Date(future);
  futureEndObj.setUTCDate(futureEndObj.getUTCDate() + 2);
  const futureEnd = futureEndObj.toISOString().slice(0, 10); // 3 days total

  it('rejects unauthenticated booking requests with 401', async () => {
    const res = await api('/', 'POST', { vehicle_id: 1, start_date: futureStart, end_date: futureEnd });
    assert.equal(res.status, 401);
  });

  it('creates reservation and computes total price on backend from database daily rate', async () => {
    const res = await api(
      '/',
      'POST',
      { vehicle_id: 1, start_date: futureStart, end_date: futureEnd, client_price: '1.00' },
      cookieUser1
    );
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.reservation);
    assert.equal(data.reservation.customer_id, 1);
    assert.equal(data.reservation.days, 3);
    assert.equal(data.reservation.total_price, '30000.00'); // 10000 * 3 days
    assert.equal(data.reservation.status, 'confirmed');
  });

  it('rejects past dates with 400', async () => {
    const res = await api(
      '/',
      'POST',
      { vehicle_id: 1, start_date: '2020-01-01', end_date: '2020-01-05' },
      cookieUser1
    );
    assert.equal(res.status, 400);
  });

  it('rejects end date before start date with 400', async () => {
    const res = await api(
      '/',
      'POST',
      { vehicle_id: 1, start_date: futureEnd, end_date: futureStart },
      cookieUser1
    );
    assert.equal(res.status, 400);
  });

  it('rejects overlapping active reservation for the same vehicle with 409', async () => {
    const res = await api(
      '/',
      'POST',
      { vehicle_id: 1, start_date: futureStart, end_date: futureEnd },
      cookieUser2
    );
    assert.equal(res.status, 409);
    const data = await res.json();
    assert.match(data.message, /already reserved/i);
  });

  it('allows booking on non-overlapping dates for the same vehicle', async () => {
    const nextStartObj = new Date(futureEndObj);
    nextStartObj.setUTCDate(nextStartObj.getUTCDate() + 5);
    const nextStart = nextStartObj.toISOString().slice(0, 10);

    const nextEndObj = new Date(nextStartObj);
    nextEndObj.setUTCDate(nextEndObj.getUTCDate() + 1);
    const nextEnd = nextEndObj.toISOString().slice(0, 10);

    const res = await api(
      '/',
      'POST',
      { vehicle_id: 1, start_date: nextStart, end_date: nextEnd },
      cookieUser2
    );
    assert.equal(res.status, 201);
  });

  it('GET /api/reservations/my returns only reservations of the current authenticated user', async () => {
    const res = await api('/my', 'GET', undefined, cookieUser1);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.reservations));
    assert.equal(data.reservations.length, 1);
    assert.equal(data.reservations[0].customer_id, 1);
    assert.equal(data.reservations[0].vehicle_name, 'Toyota Corolla Altis');
  });

  it('GET /api/reservations/:id allows owner to access reservation', async () => {
    const res = await api('/1', 'GET', undefined, cookieUser1);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.reservation.id, 1);
    assert.equal(data.reservation.customer_id, 1);
  });

  it('GET /api/reservations/:id denies another customer from viewing it with 403', async () => {
    const res = await api('/1', 'GET', undefined, cookieUser2);
    assert.equal(res.status, 403);
  });

  it('PATCH /api/reservations/:id/cancel denies another customer from cancelling it with 403', async () => {
    const res = await api('/1/cancel', 'PATCH', {}, cookieUser2);
    assert.equal(res.status, 403);
  });

  it('PATCH /api/reservations/:id/cancel allows owner to cancel reservation', async () => {
    const res = await api('/1/cancel', 'PATCH', {}, cookieUser1);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.reservation.status, 'cancelled');
  });

  it('PATCH /api/reservations/:id/cancel returns 400 if already cancelled', async () => {
    const res = await api('/1/cancel', 'PATCH', {}, cookieUser1);
    assert.equal(res.status, 400);
  });
});
