import { afterEach, it, expect, vi } from 'vitest'
import { request } from '../src/service/authService'
afterEach(() => vi.unstubAllGlobals())
it('sends credentials and CSRF headers without storing tokens', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: { role: 'customer' } }) })
  vi.stubGlobal('fetch', fetcher)
  await request('/login', { email: 'driver@example.com', password: 'Password123' })
  expect(fetcher).toHaveBeenCalledWith(expect.stringContaining('/login'), expect.objectContaining({
    credentials: 'include', method: 'POST', headers: expect.objectContaining({ 'X-Requested-With': 'VehicleRental' }),
  }))
})
it('explains network failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
  await expect(request('/me')).rejects.toThrow('Unable to reach the server')
})
it('preserves API error status for session restoration', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Authentication required.' }) }))
  await expect(request('/me')).rejects.toMatchObject({ status: 401, message: 'Authentication required.' })
})
