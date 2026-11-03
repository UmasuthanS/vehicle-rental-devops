import { afterEach, describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '../src/Components/Login'
import App from '../src/App'
import * as api from '../src/service/authService'

vi.mock('../src/service/authService', () => ({ registerUser: vi.fn(), loginUser: vi.fn(), getCurrentUser: vi.fn(), logoutUser: vi.fn(), request: vi.fn() }))
afterEach(() => vi.resetAllMocks())
const user = { id: 1, name: 'Test Driver', email: 'driver@example.com', role: 'customer' }
async function fillRegistration(password = 'Password123', confirmation = password) {
  const actor = userEvent.setup()
  await actor.click(screen.getByRole('button', { name: 'Create an account' }))
  await actor.type(screen.getByLabelText('Full name'), 'Test Driver')
  await actor.type(screen.getByLabelText('Email address'), user.email)
  await actor.type(screen.getByLabelText('Password', { exact: true }), password)
  await actor.type(screen.getByLabelText('Confirm password'), confirmation)
  await actor.click(screen.getByRole('button', { name: /Create account/ }))
}
describe('authentication UI', () => {
  it('validates required fields and email before submitting', async () => {
    render(<Login onLogin={vi.fn()} />)
    fireEvent.submit(screen.getByRole('button', { name: /Sign in/ }).closest('form'))
    expect(screen.getByRole('alert')).toHaveTextContent('fill in all fields')
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'bad' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } })
    fireEvent.submit(screen.getByRole('button', { name: /Sign in/ }).closest('form'))
    expect(screen.getByRole('alert')).toHaveTextContent('valid email')
    expect(api.loginUser).not.toHaveBeenCalled()
  })
  it('validates password strength', async () => {
    render(<Login onLogin={vi.fn()} />); await fillRegistration('weak')
    expect(screen.getByRole('alert')).toHaveTextContent('at least 8')
    expect(api.registerUser).not.toHaveBeenCalled()
  })
  it('validates password confirmation', async () => {
    render(<Login onLogin={vi.fn()} />); await fillRegistration('Password123', 'Different123')
    expect(screen.getByRole('alert')).toHaveTextContent('do not match')
  })
  it('registers with real API client contract and returns to sign in', async () => {
    api.registerUser.mockResolvedValue({ message: 'created' })
    render(<Login onLogin={vi.fn()} />); await fillRegistration()
    expect(api.registerUser).toHaveBeenCalledWith({ name: user.name, email: user.email, password: 'Password123' })
    expect(screen.getByRole('status')).toHaveTextContent('Account created')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })
  it('shows duplicate-email errors', async () => {
    api.registerUser.mockRejectedValue(new Error('An account with that email already exists.'))
    render(<Login onLogin={vi.fn()} />); await fillRegistration()
    expect(screen.getByRole('alert')).toHaveTextContent('already exists')
  })
  it('shows failed login errors and disables submission while loading', async () => {
    let reject
    api.loginUser.mockImplementation(() => new Promise((_, fail) => { reject = fail }))
    render(<Login onLogin={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Wrong123' } })
    fireEvent.submit(screen.getByRole('button', { name: /Sign in/ }).closest('form'))
    expect(screen.getByRole('button', { name: /Please wait/ })).toBeDisabled()
    reject(new Error('Invalid email or password.'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
  })
  it('shows and hides passwords', async () => {
    render(<Login onLogin={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
  })
  it.each(['customer', 'owner', 'admin'])('restores the %s profile and logs out', async role => {
    api.getCurrentUser.mockResolvedValue({ user: { ...user, role } })
    api.request.mockResolvedValue({ message: 'Welcome to your dashboard.' })
    api.logoutUser.mockResolvedValue({})
    render(<App />)
    expect(await screen.findByText(`Hello, ${user.name}.`)).toBeInTheDocument()
    await waitFor(() => expect(api.request).toHaveBeenCalledWith(`/dashboard/${role}`))
    await userEvent.click(screen.getByRole('button', { name: /Sign out/ }))
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument()
  })
  it('shows sign in when session restoration returns 401', async () => {
    api.getCurrentUser.mockRejectedValue(Object.assign(new Error('Authentication required'), { status: 401 }))
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument()
  })
  it('navigates from login to the database-backed dashboard', async () => {
    api.getCurrentUser.mockRejectedValue(Object.assign(new Error(), { status: 401 }))
    api.loginUser.mockResolvedValue({ user }); api.request.mockResolvedValue({ message: 'Welcome.' })
    render(<App />)
    await screen.findByRole('heading', { name: 'Welcome back.' })
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: user.email } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password123' } })
    fireEvent.submit(screen.getByRole('button', { name: /Sign in/ }).closest('form'))
    expect(await screen.findByRole('heading', { name: 'Customer dashboard' })).toBeInTheDocument()
  })
})
