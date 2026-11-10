import { beforeEach, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../src/App'
import { getCurrentUser, loginUser, request } from '../src/service/authService'
import { getFeaturedVehicles, getVehicles, getVehicleById } from '../src/service/vehicleService'
import { getMyReservations } from '../src/service/reservationService'
vi.mock('../src/service/authService', () => ({ getCurrentUser: vi.fn(), logoutUser: vi.fn(), loginUser: vi.fn(), registerUser: vi.fn(), request: vi.fn(), apiBaseUrl: '/api' }))
vi.mock('../src/service/vehicleService', () => ({ getFeaturedVehicles: vi.fn(), getVehicles: vi.fn(), getVehicleById: vi.fn() }))
vi.mock('../src/service/reservationService', () => ({ getMyReservations: vi.fn().mockResolvedValue([]), createReservation: vi.fn(), cancelReservation: vi.fn() }))
beforeEach(() => {
  vi.resetAllMocks()
  getCurrentUser.mockRejectedValue(Object.assign(new Error('Authentication required'), { status: 401 }))
  getFeaturedVehicles.mockRejectedValue(Object.assign(new Error('Endpoint not found'), { status: 404 }))
  getVehicles.mockResolvedValue([])
  getVehicleById.mockResolvedValue({ id: 1, name: 'Sample Vehicle', type: 'car', location: 'Colombo', daily_rate: '10000.00' })
  getMyReservations.mockResolvedValue([])
})
const show = (route = '/') => render(<MemoryRouter initialEntries={[route]}><App /></MemoryRouter>)
it('opens the public homepage without displaying a login form', async () => {
  show()
  expect(screen.getByRole('heading', { name: 'Find Your Perfect Ride.' })).toBeInTheDocument()
  expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  expect(await screen.findByText('Vehicle listings are on their way.')).toBeInTheDocument()
})
it('submits search to the catalog destination with search preserved', async () => {
  show()
  fireEvent.change(screen.getByLabelText('WHERE WILL YOU GO?'), { target: { value: 'Galle' } })
  fireEvent.change(screen.getByLabelText('YOUR KIND OF RIDE'), { target: { value: 'van' } })
  await userEvent.click(screen.getByRole('button', { name: /Find a ride/ }))
  expect(await screen.findByRole('heading', { name: 'Find Your Ideal Vehicle.' })).toBeInTheDocument()
  expect(getVehicles).toHaveBeenCalledWith(expect.objectContaining({ q: 'Galle', type: 'van' }))
})
it('has an accessible mobile menu and closes it after navigation', async () => {
  show()
  const toggle = screen.getByRole('button', { name: 'Open navigation' })
  await userEvent.click(toggle)
  expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveAttribute('aria-expanded', 'true')
  await userEvent.click(screen.getAllByRole('link', { name: 'Vehicles', exact: true })[0])
  expect(screen.getByRole('button', { name: 'Open navigation' })).toHaveAttribute('aria-expanded', 'false')
})
it('guards bookings and returns to the intended destination after login', async () => {
  loginUser.mockResolvedValue({ user: { id: 1, name: 'Driver', role: 'customer' } })
  show('/bookings')
  await screen.findByRole('heading', { name: 'Welcome back.' })
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'driver@example.com' } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } })
  fireEvent.submit(screen.getByRole('button', { name: /Sign in/ }).closest('form'))
  expect(await screen.findByRole('heading', { name: 'My Bookings' })).toBeInTheDocument()
  expect(request).not.toHaveBeenCalled()
})
it('opens registration directly and handles unknown URLs', async () => {
  const view = show('/register')
  expect(await screen.findByRole('heading', { name: 'Start your journey.' })).toBeInTheDocument()
  view.unmount()
  show('/unknown-page')
  expect(screen.getByRole('heading', { name: 'That road ends here.' })).toBeInTheDocument()
})
