import { test, expect } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
const requireBackend = createRequire(new URL('../../Backend/package.json', import.meta.url))
const mysql = requireBackend('mysql2/promise')
const bcrypt = requireBackend('bcryptjs')
let pool
const email = `browser-${randomUUID()}@example.com`
test.beforeAll(async () => {
  if (!/^test_auth_[a-z0-9_]+$/.test(process.env.TEST_DB_NAME || '')) throw new Error('Isolated test database required')
  pool = mysql.createPool({ host: process.env.TEST_DB_HOST || '127.0.0.1', port: Number(process.env.TEST_DB_PORT || 3306),
    user: process.env.TEST_DB_USER, password: process.env.TEST_DB_PASSWORD, database: process.env.TEST_DB_NAME })
})
test.afterAll(async () => {
  if (pool) { await pool.execute('DELETE FROM users WHERE email = ?', [email]); await pool.end() }
})
test('register, verify MySQL hash, login, restore session, enforce roles, logout', async ({ page, context }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: 'Create an account' }).click()
  await page.getByLabel('Full name').fill('Browser Driver')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill('BrowserPassword123')
  await page.getByLabel('Confirm password').fill('BrowserPassword123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByRole('status')).toContainText('Account created')
  const [[stored]] = await pool.execute('SELECT password_hash, role FROM users WHERE email = ?', [email])
  expect(stored.role).toBe('customer')
  expect(await bcrypt.compare('BrowserPassword123', stored.password_hash)).toBe(true)
  await page.getByLabel('Password', { exact: true }).fill('Incorrect123')
  await page.getByRole('button', { name: 'Sign in', exact: false }).click()
  await expect(page.getByRole('alert')).toContainText('Invalid email or password')
  await page.getByLabel('Password', { exact: true }).fill('BrowserPassword123')
  await page.getByRole('button', { name: 'Sign in', exact: false }).click()
  await expect(page.getByRole('heading', { name: 'Customer dashboard' })).toBeVisible()
  await expect(page.getByText('Hello, Browser Driver.')).toBeVisible()
  const cookie = (await context.cookies()).find(cookie => cookie.name === 'session')
  expect(cookie.httpOnly).toBe(true)
  expect(cookie.sameSite).toBe('Lax')
  expect(await page.evaluate(() => localStorage.length)).toBe(0)
  expect((await page.request.get('http://localhost:5001/api/auth/dashboard/admin')).status()).toBe(403)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Customer dashboard' })).toBeVisible()
  for (const role of ['owner', 'admin']) {
    await pool.execute('UPDATE users SET role = ? WHERE email = ?', [role, email])
    await page.reload()
    await expect(page.getByRole('heading', { name: role === 'owner' ? 'Vehicle owner dashboard' : 'Administration dashboard' })).toBeVisible()
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('main').getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
  expect((await page.request.get('http://localhost:5001/api/auth/me')).status()).toBe(401)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible()
})
