import { beforeEach, it, expect, vi } from 'vitest'
import {
  createReservation,
  getMyReservations,
  getReservationById,
  cancelReservation,
} from '../src/service/reservationService'
import { request } from '../src/service/authService'

vi.mock('../src/service/authService', () => ({
  apiBaseUrl: '/api',
  request: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

it('createReservation calls POST /reservations with vehicle and dates', async () => {
  request.mockResolvedValue({
    message: 'Reservation confirmed successfully.',
    reservation: { id: 1, vehicle_id: 2, total_price: '36000.00' },
  })

  const res = await createReservation({
    vehicle_id: 2,
    start_date: '2026-11-20',
    end_date: '2026-11-21',
  })

  expect(res.reservation.id).toBe(1)
  expect(request).toHaveBeenCalledWith(
    '/reservations',
    { vehicle_id: 2, start_date: '2026-11-20', end_date: '2026-11-21' },
    '/api',
    { method: 'POST' }
  )
})

it('getMyReservations requests /reservations/my and returns array', async () => {
  request.mockResolvedValue({
    reservations: [{ id: 1, vehicle_name: 'Toyota Corolla Altis', total_price: '14500.00' }],
  })

  const list = await getMyReservations()
  expect(list).toHaveLength(1)
  expect(list[0].vehicle_name).toBe('Toyota Corolla Altis')
  expect(request).toHaveBeenCalledWith('/reservations/my', undefined, '/api')
})

it('getReservationById fetches specific reservation details', async () => {
  request.mockResolvedValue({
    reservation: { id: 5, vehicle_id: 1, status: 'confirmed' },
  })

  const res = await getReservationById(5)
  expect(res.id).toBe(5)
  expect(request).toHaveBeenCalledWith('/reservations/5', undefined, '/api')
})

it('cancelReservation sends PATCH to /reservations/:id/cancel', async () => {
  request.mockResolvedValue({
    message: 'Reservation cancelled successfully.',
    reservation: { id: 5, status: 'cancelled' },
  })

  const res = await cancelReservation(5)
  expect(res.reservation.status).toBe('cancelled')
  expect(request).toHaveBeenCalledWith('/reservations/5/cancel', {}, '/api', { method: 'PATCH' })
})
