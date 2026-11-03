import { useEffect, useState } from 'react'
import Login from './Components/Login'
import Navbar from './Components/Navbar'
import { getCurrentUser, logoutUser, request } from './service/authService'

const roles = { customer: 'Customer dashboard', owner: 'Vehicle owner dashboard', admin: 'Administration dashboard' }
export default function App() {
  const [user, setUser] = useState(null)
  const [restoring, setRestoring] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dashboard, setDashboard] = useState('')
  useEffect(() => {
    let active = true
    getCurrentUser().then(result => { if (active) setUser(result.user) }).catch(err => {
      if (active && err.status !== 401) setError(err.message)
    }).finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!user) return
    let active = true
    request(`/dashboard/${user.role}`).then(result => { if (active) setDashboard(result.message) }).catch(err => {
      if (!active) return
      setError(err.message)
      if (err.status === 401 || err.status === 403) setUser(null)
    })
    return () => { active = false }
  }, [user])
  async function logout() {
    setBusy(true); setError('')
    try { await logoutUser(); setUser(null); setDashboard('') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <><Navbar />{error && <div className="global-error notice error" role="alert">{error}<button type="button" onClick={() => window.location.reload()}>Retry</button></div>}
    {restoring ? <main className="session-loading" role="status">Restoring your session…</main> : user && roles[user.role] ?
      <main className="dashboard"><span className="eyebrow">YOUR ACCOUNT</span><h1>{roles[user.role]}</h1><p>{dashboard || 'Loading your dashboard…'}</p><section className="profile-card"><h2>Hello, {user.name}.</h2><dl><dt>Email</dt><dd>{user.email}</dd><dt>Role</dt><dd>{user.role}</dd></dl><button className="primary-button" onClick={logout} disabled={busy}>{busy ? 'Signing out…' : 'Sign out'}<span aria-hidden="true">↗</span></button></section></main> :
      <Login onLogin={profile => { setError(''); setUser(profile) }} />}
  </>
}
