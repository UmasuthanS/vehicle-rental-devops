const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createApp } = require('../src/app');
const { getConfig } = require('../src/config/env');

const config = getConfig({
  JWT_SECRET: crypto.randomBytes(48).toString('hex'),
  FRONTEND_URL: 'http://localhost:5173',
  JWT_EXPIRES_IN: '1h',
});

const sampleVehicles = [
  { id: 1, name: 'Toyota Corolla Altis', type: 'car', location: 'Colombo', daily_rate: 14500.00, image_url: 'https://example.com/corolla.jpg', description: 'Reliable sedan', capacity: 5, fuel_type: 'Petrol', transmission: 'Automatic', available: 1, created_at: new Date() },
  { id: 2, name: 'Honda Civic RS', type: 'car', location: 'Kandy', daily_rate: 18000.00, image_url: 'https://example.com/civic.jpg', description: 'Sporty sedan', capacity: 5, fuel_type: 'Petrol', transmission: 'Automatic', available: 1, created_at: new Date() },
  { id: 3, name: 'Toyota HiAce', type: 'van', location: 'Galle', daily_rate: 28500.00, image_url: 'https://example.com/hiace.jpg', description: 'Spacious passenger van', capacity: 10, fuel_type: 'Diesel', transmission: 'Manual', available: 1, created_at: new Date() },
  { id: 4, name: 'Yamaha FZ-S', type: 'motorcycle', location: 'Matara', daily_rate: 6500.00, image_url: 'https://example.com/fzs.jpg', description: 'Agile 150cc bike', capacity: 2, fuel_type: 'Petrol', transmission: 'Manual', available: 1, created_at: new Date() },
];

function mockVehiclePool() {
  return {
    async query(sql, params = []) {
      let filtered = [...sampleVehicles];
      let paramIdx = 0;

      if (sql.includes('type = ?')) {
        const type = params[paramIdx++];
        filtered = filtered.filter(v => v.type === type);
      }
      if (sql.includes('(name LIKE ?')) {
        const term = params[paramIdx].replace(/%/g, '').toLowerCase();
        paramIdx += 3; // name, location, description
        filtered = filtered.filter(v =>
          v.name.toLowerCase().includes(term) ||
          v.location.toLowerCase().includes(term) ||
          v.description.toLowerCase().includes(term)
        );
      }
      if (sql.includes('daily_rate >= ?')) {
        const min = params[paramIdx++];
        filtered = filtered.filter(v => v.daily_rate >= min);
      }
      if (sql.includes('daily_rate <= ?')) {
        const max = params[paramIdx++];
        filtered = filtered.filter(v => v.daily_rate <= max);
      }
      if (sql.includes('available = ?')) {
        const avail = params[paramIdx++];
        filtered = filtered.filter(v => v.available === avail);
      }

      return [filtered];
    },
    async execute(sql, params = []) {
      if (sql.includes('WHERE id = ?')) {
        const id = Number(params[0]);
        const found = sampleVehicles.filter(v => v.id === id);
        return [found];
      }
      return [[]];
    },
  };
}

describe('Vehicle catalog API contract', () => {
  let server;
  let base;

  before(async () => {
    const pool = mockVehiclePool();
    server = createApp(pool, config).listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    base = `http://127.0.0.1:${server.address().port}/api/vehicles`;
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
  });

  it('returns all vehicles in catalog with required fields', async () => {
    const res = await fetch(base);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.vehicles));
    assert.equal(data.vehicles.length, 4);
    const first = data.vehicles[0];
    assert.equal(typeof first.id, 'number');
    assert.equal(typeof first.name, 'string');
    assert.equal(typeof first.type, 'string');
    assert.equal(typeof first.daily_rate, 'string');
    assert.equal(typeof first.available, 'boolean');
  });

  it('filters vehicles by valid category type', async () => {
    const res = await fetch(`${base}?type=car`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.vehicles.length, 2);
    assert.ok(data.vehicles.every(v => v.type === 'car'));
  });

  it('rejects invalid vehicle category type with 400', async () => {
    const res = await fetch(`${base}?type=airplane`);
    assert.equal(res.status, 400);
  });

  it('searches vehicles by keyword query', async () => {
    const res = await fetch(`${base}?q=Civic`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.vehicles.length, 1);
    assert.equal(data.vehicles[0].name, 'Honda Civic RS');
  });

  it('filters vehicles by price range', async () => {
    const res = await fetch(`${base}?minPrice=15000&maxPrice=20000`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.vehicles.length, 1);
    assert.equal(data.vehicles[0].name, 'Honda Civic RS');
  });

  it('rejects non-numeric price filters with 400', async () => {
    const res = await fetch(`${base}?minPrice=invalid`);
    assert.equal(res.status, 400);
  });

  it('fetches single vehicle details by valid id', async () => {
    const res = await fetch(`${base}/1`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.vehicle);
    assert.equal(data.vehicle.id, 1);
    assert.equal(data.vehicle.name, 'Toyota Corolla Altis');
    assert.equal(typeof data.vehicle.daily_rate, 'string');
  });

  it('returns 404 for nonexistent vehicle id', async () => {
    const res = await fetch(`${base}/999`);
    assert.equal(res.status, 404);
  });

  it('returns 400 for invalid non-integer vehicle id', async () => {
    const res = await fetch(`${base}/abc`);
    assert.equal(res.status, 400);
  });
});
