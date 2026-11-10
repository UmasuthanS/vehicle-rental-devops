import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { request } from '../service/authService'
import { getMyReservations, cancelReservation } from '../service/reservationService'

const roles = {
  customer: 'Customer dashboard',
  owner: 'Vehicle owner dashboard',
  admin: 'Administration dashboard',
}

const currency = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export default function Dashboard({ user, onLogout, busy, onSessionInvalid }) {
  const [message, setMessage] = useState('Loading your dashboard…')
  const [error, setError] = useState('')
  const [reservationsState, setReservationsState] = useState({
    loading: user.role === 'customer',
    list: [],
    error: '',
  })
  const [cancellingId, setCancellingId] = useState(null)
  const [actionNotice, setActionNotice] = useState('')

  useEffect(() => {
    let active = true
    request(`/dashboard/${user.role}`)
      .then(result => {
        if (active) setMessage(result.message)
      })
      .catch(err => {
        if (!active) return
        setError(err.message)
        if (err.status === 401 || err.status === 403) onSessionInvalid()
      })
    return () => {
      active = false
    }
  }, [user.role, onSessionInvalid])

  useEffect(() => {
    let active = true
    if (user.role === 'customer') {
      getMyReservations()
        .then(data => {
          if (active) setReservationsState({ loading: false, list: data, error: '' })
        })
        .catch(err => {
          if (active)
            setReservationsState({
              loading: false,
              list: [],
              error: err.message || 'Unable to load reservations.',
            })
        })
    }
    return () => {
      active = false
    }
  }, [user.role])

  const today = new Date().toISOString().slice(0, 10)
  const reservations = reservationsState.list

  const upcomingReservations = reservations.filter(
    r => r.status === 'confirmed' && r.end_date >= today
  )

  const pastReservations = reservations.filter(
    r => r.status === 'cancelled' || r.status === 'completed' || r.end_date < today
  )

  const totalSpent = reservations
    .filter(r => r.status === 'confirmed' || r.status === 'completed')
    .reduce((sum, r) => sum + Number(r.total_price || 0), 0)

  async function handleCancel(id) {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return
    setCancellingId(id)
    setActionNotice('')
    try {
      await cancelReservation(id)
      const updated = await getMyReservations()
      setReservationsState(prev => ({ ...prev, list: updated }))
      setActionNotice('Reservation successfully cancelled.')
    } catch (err) {
      alert(err.message || 'Failed to cancel reservation.')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <main id="main-content" className="dashboard customer-dashboard">
      <span className="eyebrow">YOUR ACCOUNT</span>
      <h1>{roles[user.role] || 'Account dashboard'}</h1>
      {error ? <p role="alert">{error}</p> : <p className="dashboard-msg">{message}</p>}

      {actionNotice && (
        <div className="notice success" role="status">
          {actionNotice}
        </div>
      )}

      <div className="dashboard-grid">
        {/* Profile Card */}
        <section className="profile-card" aria-labelledby="profile-heading">
          <h2 id="profile-heading">Hello, {user.name}.</h2>
          <p className="profile-subtitle">Personal account information and session control.</p>
          <dl>
            <dt>Email</dt>
            <dd>{user.email}</dd>
            <dt>Role</dt>
            <dd className="role-badge">{user.role}</dd>
            <dt>Status</dt>
            <dd>Active Account</dd>
          </dl>
          <div className="profile-actions">
            <button className="primary-button" onClick={onLogout} disabled={busy}>
              {busy ? 'Signing out…' : 'Sign out'}
              <span aria-hidden="true">↗</span>
            </button>
            <Link className="dashboard-browse" to="/vehicles">
              Explore vehicles →
            </Link>
          </div>
        </section>

        {/* Customer Metrics */}
        {user.role === 'customer' && (
          <section className="metrics-card" aria-label="Account Summary">
            <h3>Rental Activity</h3>
            <div className="stats-row">
              <div className="stat-box">
                <span className="stat-num">{reservations.length}</span>
                <span className="stat-label">Total Bookings</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">{upcomingReservations.length}</span>
                <span className="stat-label">Upcoming Trips</span>
              </div>
              <div className="stat-box">
                <span className="stat-num">{currency.format(totalSpent)}</span>
                <span className="stat-label">Total Spent</span>
              </div>
            </div>
            <div className="stats-cta">
              <Link to="/vehicles" className="home-button quick-book-btn">
                Book a Ride <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* Customer Reservations Sections */}
      {user.role === 'customer' && (
        <div className="dashboard-reservations-wrapper">
          {/* Upcoming Reservations */}
          <section className="dashboard-section" aria-labelledby="upcoming-heading">
            <div className="section-title-wrap">
              <h2 id="upcoming-heading">Upcoming Reservations</h2>
              <span className="count-tag">{upcomingReservations.length} active</span>
            </div>

            {reservationsState.loading && (
              <div className="dashboard-loading" role="status">
                <p>Loading your upcoming reservations…</p>
              </div>
            )}

            {!reservationsState.loading && upcomingReservations.length === 0 && (
              <div className="dashboard-empty-card">
                <p>No upcoming reservations found.</p>
                <p className="empty-subtext">Ready for your next adventure? Browse our fleet and reserve your ride.</p>
                <Link to="/vehicles" className="text-link">
                  Browse available vehicles →
                </Link>
              </div>
            )}

            {!reservationsState.loading && upcomingReservations.length > 0 && (
              <div className="reservation-cards-grid">
                {upcomingReservations.map(res => (
                  <article key={res.id} className="dash-res-card">
                    <div className="dash-res-header">
                      <div>
                        <span className="dash-res-id">Ref #{res.id}</span>
                        <h3>{res.vehicle_name || `Vehicle #${res.vehicle_id}`}</h3>
                      </div>
                      <span className="status-pill available">{res.status}</span>
                    </div>

                    <div className="dash-res-body">
                      <div className="dash-res-row">
                        <span className="dash-label">Dates:</span>
                        <span>{res.start_date} to {res.end_date}</span>
                      </div>
                      <div className="dash-res-row">
                        <span className="dash-label">Location:</span>
                        <span>{res.vehicle_location || 'Colombo'}</span>
                      </div>
                      <div className="dash-res-row">
                        <span className="dash-label">Total:</span>
                        <strong className="dash-price">{currency.format(Number(res.total_price))}</strong>
                      </div>
                    </div>

                    <div className="dash-res-footer">
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => handleCancel(res.id)}
                        disabled={cancellingId === res.id}
                      >
                        {cancellingId === res.id ? 'Cancelling…' : 'Cancel Reservation'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Past & Cancelled Reservations */}
          <section className="dashboard-section" aria-labelledby="past-heading">
            <div className="section-title-wrap">
              <h2 id="past-heading">Past & Cancelled Reservations</h2>
              <span className="count-tag">{pastReservations.length} records</span>
            </div>

            {!reservationsState.loading && pastReservations.length === 0 && (
              <div className="dashboard-empty-card">
                <p>No previous or cancelled rentals on record.</p>
              </div>
            )}

            {!reservationsState.loading && pastReservations.length > 0 && (
              <div className="reservation-cards-grid">
                {pastReservations.map(res => (
                  <article key={res.id} className="dash-res-card past-card">
                    <div className="dash-res-header">
                      <div>
                        <span className="dash-res-id">Ref #{res.id}</span>
                        <h3>{res.vehicle_name || `Vehicle #${res.vehicle_id}`}</h3>
                      </div>
                      <span className={`status-pill ${res.status === 'confirmed' ? 'available' : 'unavailable'}`}>
                        {res.status === 'confirmed' ? 'Completed' : res.status}
                      </span>
                    </div>

                    <div className="dash-res-body">
                      <div className="dash-res-row">
                        <span className="dash-label">Dates:</span>
                        <span>{res.start_date} to {res.end_date}</span>
                      </div>
                      <div className="dash-res-row">
                        <span className="dash-label">Total:</span>
                        <strong>{currency.format(Number(res.total_price))}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
