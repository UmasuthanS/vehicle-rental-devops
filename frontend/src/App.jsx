import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Login from './Components/Login'
import Navbar from './Components/Navbar'
import Footer from './Components/Footer'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Upcoming from './pages/Upcoming'
import Vehicles from './pages/Vehicles'
import VehicleDetails from './pages/VehicleDetails'
import FeaturedVehicles from './Components/FeaturedVehicles'
import { getCurrentUser, logoutUser } from './service/authService'
import './home.css'

export default function App() {
  const [user, setUser] = useState(null)
  const [restoring, setRestoring] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const clearSession = useCallback(() => setUser(null), [])
  useEffect(() => {
    let active = true
    getCurrentUser().then(result => { if (active) setUser(result.user) }).catch(err => {
      if (active && err.status !== 401) setError(err.message)
    }).finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (location.hash === '#contact') document.getElementById('contact')?.scrollIntoView?.({ behavior: 'smooth' })
    else document.documentElement.scrollTop = 0
  }, [location.pathname, location.hash])
  async function logout() {
    setBusy(true); setError('')
    try { await logoutUser(); setUser(null); navigate('/login') }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  function protect(content) {
    if (restoring) return <main id="main-content" className="session-loading" role="status">Restoring your session…</main>
    return user ? content : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }
  const destination = location.state?.from
  const postLoginPath = typeof destination === 'string' && /^\/(dashboard|bookings)(\?|$)/.test(destination) ? destination : '/dashboard'
  function authPage(mode) {
    if (restoring) return <main id="main-content" className="session-loading" role="status">Restoring your session…</main>
    if (user) return <Navigate to={postLoginPath} replace />
    return <Login key={mode} initialMode={mode} initialEmail={location.state?.registeredEmail || ''}
      successMessage={location.state?.registeredEmail ? 'Account created. Sign in to get started.' : ''}
      onModeChange={(next, state) => navigate(`/${next}`, { state: { ...location.state, ...state } })}
      onLogin={profile => {
        setError(''); setUser(profile)
      }} />
  }
  return <><a className="skip-link" href="#main-content">Skip to content</a><Navbar user={user} restoring={restoring} onLogout={logout} busy={busy} />
    {error && <div className="global-error notice error" role="alert">{error}<button type="button" onClick={() => window.location.reload()}>Retry</button></div>}
    <Routes><Route path="/" element={<Home featured={<FeaturedVehicles />} />} /><Route path="/login" element={authPage('login')} /><Route path="/register" element={authPage('register')} />
      <Route path="/dashboard" element={protect(user && <Dashboard user={user} onLogout={logout} busy={busy} onSessionInvalid={clearSession} />)} />
      <Route path="/bookings" element={protect(<Upcoming bookings />)} />
      <Route path="/vehicles" element={<Vehicles />} />
      <Route path="/vehicles/:id" element={<VehicleDetails />} />
      <Route path="*" element={<Upcoming notFound />} /></Routes><Footer />
  </>
}
