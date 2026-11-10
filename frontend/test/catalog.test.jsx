import { describe, beforeEach, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Vehicles from '../src/pages/Vehicles'
import VehicleDetails from '../src/pages/VehicleDetails'
import { getVehicles, getVehicleById } from '../src/service/vehicleService'

vi.mock('../src/service/vehicleService', () => ({
  getVehicles: vi.fn(),
  getVehicleById: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

const mockVehicles = [
  {
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
    description: 'Reliable sedan for travel.',
  },
  {
    id: 2,
    name: 'Toyota HiAce Super GL',
    type: 'van',
    location: 'Galle',
    daily_rate: '28500.00',
    capacity: 10,
    transmission: 'Manual',
    fuel_type: 'Diesel',
    available: true,
    image_url: 'https://example.com/hiace.jpg',
    description: 'Spacious passenger van.',
  },
]

describe('Vehicles catalog page', () => {
  it('renders loading status then displays vehicle catalog cards', async () => {
    getVehicles.mockResolvedValue(mockVehicles)

    render(
      <MemoryRouter initialEntries={['/vehicles']}>
        <Vehicles />
      </MemoryRouter>
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading vehicle catalog…')
    expect(await screen.findByRole('heading', { name: 'Toyota Corolla Altis' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Toyota HiAce Super GL' })).toBeInTheDocument()
    expect(screen.getByText('Showing 2 vehicles')).toBeInTheDocument()
  })

  it('renders empty state message when no vehicles match criteria', async () => {
    getVehicles.mockResolvedValue([])

    render(
      <MemoryRouter initialEntries={['/vehicles?q=nonexistent']}>
        <Vehicles />
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'No vehicles found' })).toBeInTheDocument()
  })

  it('handles load error and allows retry', async () => {
    getVehicles
      .mockRejectedValueOnce(new Error('Network connection failed'))
      .mockResolvedValueOnce(mockVehicles)

    render(
      <MemoryRouter initialEntries={['/vehicles']}>
        <Vehicles />
      </MemoryRouter>
    )

    expect(await screen.findByRole('alert')).toHaveTextContent('Network connection failed')
    const retryBtn = screen.getByRole('button', { name: 'Try Again' })
    await userEvent.click(retryBtn)
    expect(await screen.findByRole('heading', { name: 'Toyota Corolla Altis' })).toBeInTheDocument()
    expect(getVehicles).toHaveBeenCalledTimes(2)
  })

  it('clicking a category pill changes the active filter', async () => {
    getVehicles.mockResolvedValue(mockVehicles)

    render(
      <MemoryRouter initialEntries={['/vehicles']}>
        <Vehicles />
      </MemoryRouter>
    )

    const vansBtn = screen.getByRole('button', { name: 'Vans' })
    await userEvent.click(vansBtn)
    expect(getVehicles).toHaveBeenCalledWith(expect.objectContaining({ type: 'van' }))
  })
})

describe('VehicleDetails page', () => {
  it('renders full vehicle specs, pricing, and reservation link', async () => {
    getVehicleById.mockResolvedValue(mockVehicles[0])

    render(
      <MemoryRouter initialEntries={['/vehicles/1']}>
        <Routes>
          <Route path="/vehicles/:id" element={<VehicleDetails />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Toyota Corolla Altis' })).toBeInTheDocument()
    expect(screen.getByText('Colombo')).toBeInTheDocument()
    expect(screen.getByText(/14,500/)).toBeInTheDocument()
    expect(screen.getByText('5 Seats')).toBeInTheDocument()
    expect(screen.getByText('Automatic')).toBeInTheDocument()
    expect(screen.getByText('Petrol')).toBeInTheDocument()
    expect(screen.getByText('Reliable sedan for travel.')).toBeInTheDocument()

    const reserveBtn = screen.getByRole('link', { name: /Reserve This Vehicle/i })
    expect(reserveBtn).toHaveAttribute('href', '/bookings?vehicleId=1')
  })

  it('renders not found state when vehicle does not exist', async () => {
    getVehicleById.mockRejectedValue(new Error('Vehicle not found.'))

    render(
      <MemoryRouter initialEntries={['/vehicles/999']}>
        <Routes>
          <Route path="/vehicles/:id" element={<VehicleDetails />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Vehicle Not Found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Back to Catalog/i })).toHaveAttribute('href', '/vehicles')
  })
})
