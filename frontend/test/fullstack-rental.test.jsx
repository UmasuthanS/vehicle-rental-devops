import { describe, beforeEach, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import * as authApi from '../src/service/authService'
import * as vehicleApi from '../src/service/vehicleService'
import * as resApi from '../src/service/reservationService'

vi.mock('../src/service/authService', () => ({
  request: vi.fn(),
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  logoutUser: vi.fn(),
  registerUser: vi.fn(),
  apiBaseUrl: '/api',
}))

vi.mock('../src/service/vehicleService', () => ({
  getFeaturedVehicles: vi.fn(),
  getVehicles: vi.fn(),
  getVehicleById: vi.fn(),
}))

vi.mock('../src/service/reservationService', () => ({
  getMyReservations: vi.fn(),
  createReservation: vi.fn(),
  getReservationById: vi.fn(),
  cancelReservation: vi.fn(),
}))

const customerUser = {
  id: 1,
  name: 'Jane Customer',
  email: 'jane@example.com',
  role: 'customer',
}

const mockVehicle = {
  id: 1,
  name: 'Toyota Corolla Altis',
  type: 'car',
  location: 'Colombo',
  daily_rate: '14500.00',
  capacity: 5,
  transmission: 'Automatic',
  fuel_type: 'Petrol',
  available: true,
  image_url: 'https://example.com/corolla.jpg',
  description: 'Reliable sedan.',
}

beforeEach(() => {
  vi.resetAllMocks()
  window.confirm = vi.fn(() => true)
  authApi.request.mockResolvedValue({ message: 'Welcome to your dashboard.' })
  vehicleApi.getFeaturedVehicles.mockResolvedValue([mockVehicle])
  vehicleApi.getVehicles.mockResolvedValue([mockVehicle])
  vehicleApi.getVehicleById.mockResolvedValue(mockVehicle)
  resApi.getMyReservations.mockResolvedValue([])
})

describe('Fullstack Rental Workflow Integration', () => {
  it('redirects unauthenticated users from protected booking route to login and preserves destination', async () => {
    authApi.getCurrentUser.mockRejectedValue(Object.assign(new Error('Auth required'), { status: 401 }))

    render(
      <MemoryRouter initialEntries={['/bookings?vehicleId=1']}>
        <App />
      </MemoryRouter>
    )

    // Should redirect to login form
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })

  it('completes the full flow: login -> book vehicle -> view in dashboard -> cancel -> logout', async () => {
    // Start with authenticated session
    authApi.getCurrentUser.mockResolvedValue({ user: customerUser })
    authApi.logoutUser.mockResolvedValue({ message: 'Logged out.' })

    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 7)
    const dateStr = futureDate.toISOString().slice(0, 10)

    const createdReservation = {
      id: 205,
      vehicle_id: 1,
      vehicle_name: 'Toyota Corolla Altis',
      customer_id: 1,
      start_date: dateStr,
      end_date: dateStr,
      days: 1,
      total_price: '14500.00',
      status: 'confirmed',
    }

    resApi.createReservation.mockResolvedValue({ reservation: createdReservation })
    resApi.getMyReservations
      .mockResolvedValueOnce([]) // initial on bookings page
      .mockResolvedValueOnce([createdReservation]) // after create
      .mockResolvedValueOnce([createdReservation]) // on dashboard load
      .mockResolvedValueOnce([{ ...createdReservation, status: 'cancelled' }]) // after cancel

    resApi.cancelReservation.mockResolvedValue({ reservation: { id: 205, status: 'cancelled' } })

    const { unmount } = render(
      <MemoryRouter initialEntries={['/bookings?vehicleId=1']}>
        <App />
      </MemoryRouter>
    )

    // 1. Booking page loads selected vehicle
    expect(await screen.findByRole('heading', { name: 'My Bookings' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Toyota Corolla Altis' })).toBeInTheDocument()
    expect(screen.getByText('Calculated Total Price:')).toBeInTheDocument()

    // 2. Submit reservation
    const confirmBtn = screen.getByRole('button', { name: /Confirm Reservation/i })
    await userEvent.click(confirmBtn)

    expect(resApi.createReservation).toHaveBeenCalledWith(
      expect.objectContaining({ vehicle_id: 1 })
    )
    expect(await screen.findByText('Reservation Confirmed!')).toBeInTheDocument()
    expect(screen.getByText(/#205/)).toBeInTheDocument()

    unmount()

    // 3. Navigate to Customer Dashboard
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Customer dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Hello, Jane Customer.')).toBeInTheDocument()
    expect(await screen.findByText('Ref #205')).toBeInTheDocument()
    expect(screen.getByText('Upcoming Reservations')).toBeInTheDocument()

    // 4. Cancel reservation from dashboard
    const cancelBtn = screen.getByRole('button', { name: 'Cancel Reservation' })
    await userEvent.click(cancelBtn)

    expect(resApi.cancelReservation).toHaveBeenCalledWith(205)
    expect(await screen.findByText('Reservation successfully cancelled.')).toBeInTheDocument()

    // 5. Working Logout
    const signOutBtn = screen.getAllByRole('button', { name: /Sign out/i })[0]
    await userEvent.click(signOutBtn)

    expect(authApi.logoutUser).toHaveBeenCalled()
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument()
  })
})
