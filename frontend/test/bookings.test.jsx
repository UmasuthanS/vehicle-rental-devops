import { describe, beforeEach, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Bookings from '../src/pages/Bookings'
import { getVehicleById } from '../src/service/vehicleService'
import { createReservation, getMyReservations, cancelReservation } from '../src/service/reservationService'

vi.mock('../src/service/vehicleService', () => ({
  getVehicleById: vi.fn(),
  getVehicles: vi.fn(),
}))

vi.mock('../src/service/reservationService', () => ({
  createReservation: vi.fn(),
  getMyReservations: vi.fn(),
  cancelReservation: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  window.confirm = vi.fn(() => true)
  window.alert = vi.fn()
})

const testVehicle = {
  id: 1,
  name: 'Toyota Corolla Altis',
  type: 'car',
  location: 'Colombo',
  daily_rate: '14500.00',
  available: true,
}

const testUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  role: 'customer',
}

describe('Bookings reservation page', () => {
  it('renders selected vehicle information and calculated total price', async () => {
    getVehicleById.mockResolvedValue(testVehicle)
    getMyReservations.mockResolvedValue([])

    render(
      <MemoryRouter initialEntries={['/bookings?vehicleId=1']}>
        <Bookings user={testUser} />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Toyota Corolla Altis' })).toBeInTheDocument()
    expect(screen.getByText(/Colombo/)).toBeInTheDocument()
    expect(screen.getAllByText(/14,500/).length).toBeGreaterThan(0)

    // Check calculated price
    expect(screen.getByText('Calculated Total Price:')).toBeInTheDocument()
  })

  it('submits booking and displays confirmation feedback with reference ID', async () => {
    getVehicleById.mockResolvedValue(testVehicle)
    getMyReservations.mockResolvedValue([])
    createReservation.mockResolvedValue({
      message: 'Reservation confirmed successfully.',
      reservation: {
        id: 99,
        vehicle_id: 1,
        vehicle_name: 'Toyota Corolla Altis',
        start_date: '2026-11-20',
        end_date: '2026-11-22',
        total_price: '43500.00',
      },
    })

    render(
      <MemoryRouter initialEntries={['/bookings?vehicleId=1']}>
        <Bookings user={testUser} />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Toyota Corolla Altis' })

    const confirmBtn = screen.getByRole('button', { name: /Confirm Reservation/i })
    await userEvent.click(confirmBtn)

    expect(createReservation).toHaveBeenCalled()
    expect(await screen.findByText('Reservation Confirmed!')).toBeInTheDocument()
    expect(screen.getByText(/#99/)).toBeInTheDocument()
  })

  it('displays error feedback when booking is rejected due to conflict or error', async () => {
    getVehicleById.mockResolvedValue(testVehicle)
    getMyReservations.mockResolvedValue([])
    createReservation.mockRejectedValue(new Error('Vehicle is already reserved for the selected dates.'))

    render(
      <MemoryRouter initialEntries={['/bookings?vehicleId=1']}>
        <Bookings user={testUser} />
      </MemoryRouter>
    )

    await screen.findByRole('heading', { name: 'Toyota Corolla Altis' })

    const confirmBtn = screen.getByRole('button', { name: /Confirm Reservation/i })
    await userEvent.click(confirmBtn)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Vehicle is already reserved for the selected dates.'
    )
  })

  it('renders existing reservations and allows cancellation', async () => {
    getVehicleById.mockResolvedValue(testVehicle)
    getMyReservations.mockResolvedValue([
      {
        id: 10,
        vehicle_id: 1,
        vehicle_name: 'Toyota Corolla Altis',
        start_date: '2026-12-01',
        end_date: '2026-12-03',
        status: 'confirmed',
        total_price: '29000.00',
      },
    ])
    cancelReservation.mockResolvedValue({ message: 'Cancelled.' })

    render(
      <MemoryRouter initialEntries={['/bookings?vehicleId=1']}>
        <Bookings user={testUser} />
      </MemoryRouter>
    )

    expect((await screen.findAllByText('Toyota Corolla Altis')).length).toBeGreaterThan(0)
    expect(screen.getByText('confirmed')).toBeInTheDocument()

    const cancelBtn = screen.getByRole('button', { name: 'Cancel Reservation' })
    await userEvent.click(cancelBtn)

    expect(cancelReservation).toHaveBeenCalledWith(10)
  })
})
