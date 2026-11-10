import { describe, beforeEach, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from '../src/pages/Dashboard'
import { request } from '../src/service/authService'
import { getMyReservations, cancelReservation } from '../src/service/reservationService'

vi.mock('../src/service/authService', () => ({
  request: vi.fn(),
  apiBaseUrl: '/api',
}))

vi.mock('../src/service/reservationService', () => ({
  getMyReservations: vi.fn(),
  cancelReservation: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  window.confirm = vi.fn(() => true)
  request.mockResolvedValue({ message: 'Welcome to your dashboard.' })
})

const customerUser = {
  id: 1,
  name: 'Sam Customer',
  email: 'sam@example.com',
  role: 'customer',
}

const future = new Date()
future.setDate(future.getDate() + 5)
const futureDate = future.toISOString().slice(0, 10)

const past = new Date()
past.setDate(past.getDate() - 10)
const pastDate = past.toISOString().slice(0, 10)

const mockReservations = [
  {
    id: 101,
    vehicle_id: 1,
    vehicle_name: 'Toyota Corolla Altis',
    vehicle_location: 'Colombo',
    start_date: futureDate,
    end_date: futureDate,
    status: 'confirmed',
    total_price: '14500.00',
  },
  {
    id: 102,
    vehicle_id: 2,
    vehicle_name: 'Honda Civic RS',
    vehicle_location: 'Kandy',
    start_date: pastDate,
    end_date: pastDate,
    status: 'completed',
    total_price: '18000.00',
  },
]

describe('Customer Dashboard', () => {
  it('renders personalized welcome, user info, and activity stats', async () => {
    getMyReservations.mockResolvedValue(mockReservations)

    render(
      <MemoryRouter>
        <Dashboard user={customerUser} onLogout={vi.fn()} busy={false} onSessionInvalid={vi.fn()} />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Customer dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Hello, Sam Customer.')).toBeInTheDocument()
    expect(screen.getByText('sam@example.com')).toBeInTheDocument()

    // Activity stats
    expect(screen.getByText('Total Bookings')).toBeInTheDocument()
    expect(screen.getByText('Upcoming Trips')).toBeInTheDocument()
  })

  it('separates upcoming and past reservations and allows cancellation', async () => {
    getMyReservations.mockResolvedValue(mockReservations)
    cancelReservation.mockResolvedValue({ message: 'Cancelled.' })

    render(
      <MemoryRouter>
        <Dashboard user={customerUser} onLogout={vi.fn()} busy={false} onSessionInvalid={vi.fn()} />
      </MemoryRouter>
    )

    // Upcoming reservation
    expect(await screen.findByText('Toyota Corolla Altis')).toBeInTheDocument()
    expect(screen.getByText('Ref #101')).toBeInTheDocument()

    // Past reservation
    expect(screen.getByText('Honda Civic RS')).toBeInTheDocument()
    expect(screen.getByText('Ref #102')).toBeInTheDocument()

    // Cancel action
    const cancelBtn = screen.getByRole('button', { name: 'Cancel Reservation' })
    await userEvent.click(cancelBtn)
    expect(cancelReservation).toHaveBeenCalledWith(101)
  })

  it('displays empty state when user has no reservations', async () => {
    getMyReservations.mockResolvedValue([])

    render(
      <MemoryRouter>
        <Dashboard user={customerUser} onLogout={vi.fn()} busy={false} onSessionInvalid={vi.fn()} />
      </MemoryRouter>
    )

    expect(await screen.findByText('No upcoming reservations found.')).toBeInTheDocument()
    expect(screen.getByText('No previous or cancelled rentals on record.')).toBeInTheDocument()
  })

  it('renders owner and admin dashboard without crashing', async () => {
    const ownerUser = { id: 2, name: 'Alice Owner', email: 'owner@example.com', role: 'owner' }
    request.mockResolvedValue({ message: 'Welcome to your owner dashboard.' })

    render(
      <MemoryRouter>
        <Dashboard user={ownerUser} onLogout={vi.fn()} busy={false} onSessionInvalid={vi.fn()} />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Vehicle owner dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Hello, Alice Owner.')).toBeInTheDocument()
    expect(getMyReservations).not.toHaveBeenCalled()
  })
})
