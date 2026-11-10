// Generates Compose-only credentials, never copies host MySQL credentials.
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const envPath = path.join(__dirname, '../.env');
const random = () => randomBytes(32).toString('hex');
try {
  fs.writeFileSync(envPath, [
    '# Local Docker Compose settings. Do not commit this file.',
    'DB_NAME=vehicle_rental', 'DB_USER=vehicle_app', `DB_PASSWORD=${random()}`,
    `MYSQL_ROOT_PASSWORD=${random()}`, `JWT_SECRET=${random()}`, 'JWT_EXPIRES_IN=1h',
    'FRONTEND_PORT=8080', 'FRONTEND_URL=http://localhost:8080',
    'DB_PUBLISHED_PORT=3307', 'NODE_ENV=development', '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  console.log('Created ignored root .env with random Docker credentials.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('Root .env already exists; preserved unchanged.');
  else throw error;
}
