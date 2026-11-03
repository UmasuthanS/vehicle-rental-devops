import { beforeEach, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import FeaturedVehicles from '../src/Components/FeaturedVehicles'
import { getFeaturedVehicles } from '../src/service/vehicleService'
vi.mock('../src/service/vehicleService', () => ({ getFeaturedVehicles: vi.fn() }))
beforeEach(() => vi.resetAllMocks())
const show = () => render(<MemoryRouter><FeaturedVehicles /></MemoryRouter>)
it('shows loading then an empty inventory without manufactured listings', async () => {
  getFeaturedVehicles.mockResolvedValue([])
  show()
  expect(screen.getByRole('status')).toHaveTextContent('Finding your next ride')
  expect(await screen.findByText('No vehicles listed yet.')).toBeInTheDocument()
})
it('renders backend records with LKR rates, type, location and details links', async () => {
  getFeaturedVehicles.mockResolvedValue([{ id: 7, name: 'Test API Car', type: 'car', location: 'Galle', daily_rate: '9500.00', image_url: '' }])
  show()
  expect(await screen.findByRole('heading', { name: 'Test API Car' })).toBeInTheDocument()
  expect(screen.getByText('Galle')).toBeInTheDocument()
  expect(screen.getByText(/9,500/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'View details for Test API Car' })).toHaveAttribute('href', '/vehicles/7')
})
it('explains an unavailable API separately from an empty inventory', async () => {
  getFeaturedVehicles.mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }))
  show()
  expect(await screen.findByText(/being connected in Phase 2/)).toBeInTheDocument()
})
it('shows network errors and retries the real inventory request', async () => {
  getFeaturedVehicles.mockRejectedValueOnce(new Error('Unable to reach the server.')).mockResolvedValueOnce([])
  show()
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach the server')
  await userEvent.click(screen.getByRole('button', { name: 'Check again' }))
  expect(await screen.findByText('No vehicles listed yet.')).toBeInTheDocument()
  expect(getFeaturedVehicles).toHaveBeenCalledTimes(2)
})
