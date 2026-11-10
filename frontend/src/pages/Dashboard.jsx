import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../service/authService'
const roles = { customer: 'Customer dashboard', owner: 'Vehicle owner dashboard', admin: 'Administration dashboard' }
export default function Dashboard({ user, onLogout, busy, onSessionInvalid }) {
  const [message, setMessage] = useState('Loading your dashboard…')
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    request(`/dashboard/${user.role}`).then(result => { if (active) setMessage(result.message) }).catch(err => {
      if (!active) return
      setError(err.message)
      if (err.status === 401 || err.status === 403) onSessionInvalid()
    })
    return () => { active = false }
  }, [user.role, onSessionInvalid])
  return <main id="main-content" className="dashboard"><span className="eyebrow">YOUR ACCOUNT</span><h1>{roles[user.role] || 'Account dashboard'}</h1>{error ? <p role="alert">{error}</p> : <p>{message}</p>}<section className="profile-card"><h2>Hello, {user.name}.</h2><dl><dt>Email</dt><dd>{user.email}</dd><dt>Role</dt><dd>{user.role}</dd></dl><button className="primary-button" onClick={onLogout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}<span aria-hidden="true">↗</span></button><Link className="dashboard-browse" to="/vehicles">Explore vehicles →</Link></section></main>
}
