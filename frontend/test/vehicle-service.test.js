import { beforeEach, it, expect, vi } from 'vitest'
import { getFeaturedVehicles, getVehicles, getVehicleById } from '../src/service/vehicleService'
import { request } from '../src/service/authService'

vi.mock('../src/service/authService', () => ({ apiBaseUrl: '/api', request: vi.fn() }))

beforeEach(() => vi.resetAllMocks())

it('uses the shared API client and limits displayed backend inventory to three', async () => {
  request.mockResolvedValue({
    vehicles: Array.from({ length: 4 }, (_, i) => ({
      id: i + 1,
      name: `API fixture ${i}`,
      type: 'car',
      location: 'Galle',
      daily_rate: '5000.00',
    })),
  })
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

it('getVehicles constructs filtered query strings properly', async () => {
  request.mockResolvedValue({
    vehicles: [
      { id: 1, name: 'Toyota Corolla', type: 'car', location: 'Colombo', daily_rate: '14500.00' },
    ],
  })
  const results = await getVehicles({ type: 'car', q: 'Colombo', minPrice: '10000', maxPrice: '20000' })
  expect(results).toHaveLength(1)
  expect(request).toHaveBeenCalledWith('/vehicles?type=car&q=Colombo&minPrice=10000&maxPrice=20000', undefined, '/api')
})

it('getVehicleById fetches and validates single vehicle details', async () => {
  request.mockResolvedValue({
    vehicle: { id: 2, name: 'Honda Civic', type: 'car', location: 'Kandy', daily_rate: '18000.00' },
  })
  const vehicle = await getVehicleById(2)
  expect(vehicle.id).toBe(2)
  expect(vehicle.name).toBe('Honda Civic')
  expect(request).toHaveBeenCalledWith('/vehicles/2', undefined, '/api')
})

it('getVehicleById rejects non-numeric or non-positive IDs before making requests', async () => {
  await expect(getVehicleById('bad')).rejects.toThrow('Invalid vehicle ID')
  await expect(getVehicleById(-1)).rejects.toThrow('Invalid vehicle ID')
  expect(request).not.toHaveBeenCalled()
})
