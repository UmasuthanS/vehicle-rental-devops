import { defineConfig, devices } from '@playwright/test'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

if (!/^test_auth_[a-z0-9_]+$/.test(process.env.TEST_DB_NAME || '')) {
  throw new Error('Set TEST_DB_NAME to an isolated database named test_auth_*.')
}
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: { baseURL: 'http://localhost:5174', channel: process.env.PLAYWRIGHT_CHANNEL || 'chromium' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    {
      command: 'node Server.js', cwd: fileURLToPath(new URL('../Backend', import.meta.url)),
      url: 'http://localhost:5001/api/auth/me',
      env: { PORT: '5001', FRONTEND_URL: 'http://localhost:5174', JWT_SECRET: randomBytes(48).toString('hex'),
        NODE_ENV: 'test', DB_HOST: process.env.TEST_DB_HOST || '127.0.0.1', DB_PORT: process.env.TEST_DB_PORT || '3306',
        DB_USER: process.env.TEST_DB_USER || '', DB_PASSWORD: process.env.TEST_DB_PASSWORD || '', DB_NAME: process.env.TEST_DB_NAME },
    },
    {
      command: 'npm run dev -- --host localhost --port 5174 --strictPort', url: 'http://localhost:5174',
      env: { VITE_API_URL: 'http://localhost:5001/api/auth' },
    },
  ],
})
