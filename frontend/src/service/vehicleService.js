import { apiBaseUrl, request } from './authService'

function validateVehicle(vehicle) {
  return (
    vehicle &&
    Number.isInteger(Number(vehicle.id)) &&
    Number(vehicle.id) >= 1 &&
    typeof (vehicle.name || vehicle.model) === 'string' &&
    typeof vehicle.type === 'string' &&
    typeof vehicle.location === 'string' &&
    /^[0-9]+(\.[0-9]+)?$/.test(String(vehicle.daily_rate)) &&
    Number.isFinite(Number(vehicle.daily_rate))
  )
}

export async function getFeaturedVehicles() {
  const result = await request('/vehicles', undefined, apiBaseUrl)
  const vehicles = Array.isArray(result) ? result : result?.vehicles
  if (!Array.isArray(vehicles) || vehicles.some(v => !validateVehicle(v))) {
    throw new Error('Vehicle inventory returned an unexpected response. Please try again later.')
  }
  return vehicles.slice(0, 3)
}

export async function getVehicles(filters = {}) {
  const params = new URLSearchParams()
  if (filters.type) params.set('type', filters.type)
  if (filters.q && typeof filters.q === 'string' && filters.q.trim()) params.set('q', filters.q.trim())
  if (filters.minPrice !== undefined && filters.minPrice !== '') params.set('minPrice', filters.minPrice)
  if (filters.maxPrice !== undefined && filters.maxPrice !== '') params.set('maxPrice', filters.maxPrice)
  if (filters.available !== undefined && filters.available !== '') params.set('available', filters.available)

  const query = params.toString() ? `?${params.toString()}` : ''
  const result = await request(`/vehicles${query}`, undefined, apiBaseUrl)
  const vehicles = Array.isArray(result) ? result : result?.vehicles
  if (!Array.isArray(vehicles) || vehicles.some(v => !validateVehicle(v))) {
    throw new Error('Vehicle inventory returned an unexpected response. Please try again later.')
  }
  return vehicles
}

export async function getVehicleById(id) {
  const numericId = Number(id)
  if (!Number.isInteger(numericId) || numericId < 1) {
    throw new Error('Invalid vehicle ID.')
  }
  const result = await request(`/vehicles/${numericId}`, undefined, apiBaseUrl)
  const vehicle = result?.vehicle || result
  if (!validateVehicle(vehicle)) {
    throw new Error('Vehicle details returned an unexpected response.')
  }
  return vehicle
}
