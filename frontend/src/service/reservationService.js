import { apiBaseUrl, request } from './authService'

export async function createReservation({ vehicle_id, start_date, end_date }) {
  const result = await request('/reservations', { vehicle_id, start_date, end_date }, apiBaseUrl, { method: 'POST' })
  return result
}

export async function getMyReservations() {
  const result = await request('/reservations/my', undefined, apiBaseUrl)
  return Array.isArray(result?.reservations) ? result.reservations : []
}

export async function getReservationById(id) {
  const result = await request(`/reservations/${encodeURIComponent(id)}`, undefined, apiBaseUrl)
  return result?.reservation || result
}

export async function cancelReservation(id) {
  const result = await request(`/reservations/${encodeURIComponent(id)}/cancel`, {}, apiBaseUrl, { method: 'PATCH' })
  return result
}
