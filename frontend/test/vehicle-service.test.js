import { beforeEach, it, expect, vi } from 'vitest'
import { getFeaturedVehicles } from '../src/service/vehicleService'
import { request } from '../src/service/authService'
vi.mock('../src/service/authService', () => ({ apiBaseUrl: '/api', request: vi.fn() }))
beforeEach(() => vi.resetAllMocks())
it('uses the shared API client and limits displayed backend inventory to three', async () => {
  request.mockResolvedValue({ vehicles: Array.from({ length: 4 }, (_, i) => ({ id: i + 1, name: `API fixture ${i}`, type: 'car', location: 'Galle', daily_rate: '5000.00' })) })
  expect(await getFeaturedVehicles()).toHaveLength(3)
  expect(request).toHaveBeenCalledWith('/vehicles', undefined, '/api')
})
it('rejects malformed records rather than displaying invented prices', async () => {
  request.mockResolvedValue({ vehicles: [{ id: 1, name: 'Incomplete fixture', type: 'car', location: 'Galle' }] })
  await expect(getFeaturedVehicles()).rejects.toThrow('unexpected response')
})
it('propagates actual missing-API responses', async () => {
  request.mockRejectedValue(Object.assign(new Error('Endpoint not found'), { status: 404 }))
  await expect(getFeaturedVehicles()).rejects.toMatchObject({ status: 404 })
})
