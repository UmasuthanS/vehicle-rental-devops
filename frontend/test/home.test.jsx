import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from '../src/pages/Home'
it('shows the homepage sections and real category destinations without fake listings', () => {
  render(<MemoryRouter><Home /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'Find Your Perfect Ride.' })).toBeInTheDocument()
  expect(screen.getByRole('search', { name: 'Find a vehicle' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Explore vans/ })).toHaveAttribute('href', '/vehicles?type=van')
  expect(screen.getByRole('heading', { name: 'From here to wherever.' })).toBeInTheDocument()
  expect(screen.getByText('Available vehicles will appear here when inventory is connected.')).toBeInTheDocument()
})
