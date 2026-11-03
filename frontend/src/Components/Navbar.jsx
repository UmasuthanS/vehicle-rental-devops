import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
export default function Navbar({ user, restoring, onLogout, busy }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  return <header className="navbar site-navbar"><Link className="brand" to="/" aria-label="Vehicle Rental home" onClick={close}><span className="brand-mark" aria-hidden="true">VR</span>Vehicle Rental</Link>
    <button className="menu-toggle" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Menu'} <span aria-hidden="true">{open ? '×' : '☰'}</span></button>
    <nav id="main-navigation" className={`main-navigation${open ? ' is-open' : ''}`} aria-label="Main navigation">
      <NavLink to="/" end onClick={close}>Home</NavLink><NavLink to="/vehicles" onClick={close}>Vehicles</NavLink><NavLink to="/bookings" onClick={close}>My Bookings</NavLink><Link to="/#contact" onClick={close}>Contact</Link>
      <div className="nav-account">{restoring ? <span className="nav-session" role="status">Checking session…</span> : user ? <><Link to="/dashboard" onClick={close} className="account-link">{user.name}</Link><button type="button" disabled={busy} onClick={async () => { close(); await onLogout() }}>{busy ? 'Signing out…' : 'Sign out'}</button></> : <><Link to="/login" onClick={close}>Sign in</Link><Link className="nav-register" to="/register" onClick={close}>Register <span aria-hidden="true">↗</span></Link></>}</div>
    </nav>
  </header>
}
