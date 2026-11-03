import { apiBaseUrl, request } from './authService'
export async function getFeaturedVehicles() {
  const result = await request('/vehicles', undefined, apiBaseUrl)
  const vehicles = Array.isArray(result) ? result : result?.vehicles
  if (!Array.isArray(vehicles) || vehicles.some(vehicle => !vehicle || !Number.isInteger(Number(vehicle.id)) || Number(vehicle.id) < 1 || typeof (vehicle.name || vehicle.model) !== 'string' || typeof vehicle.type !== 'string' || typeof vehicle.location !== 'string' || !/^[0-9]+(\.[0-9]+)?$/.test(String(vehicle.daily_rate)) || !Number.isFinite(Number(vehicle.daily_rate)))) {
    throw new Error('Vehicle inventory returned an unexpected response. Please try again later.')
  }
  return vehicles.slice(0, 3)
}
