import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { getVehicleById, getVehicles } from '../service/vehicleService'
import { createReservation, getMyReservations, cancelReservation } from '../service/reservationService'

const currency = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export default function Bookings({ user }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const vehicleIdParam = searchParams.get('vehicleId')

  const [vehicleState, setVehicleState] = useState({
    loading: true,
    vehicle: null,
    list: [],
    error: '',
  })

  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)

  const [submitting, setSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState(null)

  const [bookingsState, setBookingsState] = useState({
    loading: true,
    list: [],
  })
  const [cancellingId, setCancellingId] = useState(null)

  // Load selected vehicle or vehicles list
  useEffect(() => {
    let active = true

    if (vehicleIdParam) {
      getVehicleById(vehicleIdParam)
        .then(data => {
          if (active) setVehicleState({ loading: false, vehicle: data, list: [], error: '' })
        })
        .catch(err => {
          if (active) setVehicleState({ loading: false, vehicle: null, list: [], error: err.message || 'Vehicle not found.' })
        })
    } else {
      getVehicles()
        .then(data => {
          if (active) {
            setVehicleState({
              loading: false,
              vehicle: data.length > 0 ? data[0] : null,
              list: data,
              error: '',
            })
          }
        })
        .catch(err => {
          if (active) setVehicleState({ loading: false, vehicle: null, list: [], error: err.message || 'Unable to load fleet.' })
        })
    }

    return () => {
      active = false
    }
  }, [vehicleIdParam])

  // Load customer's reservations
  useEffect(() => {
    let active = true
    getMyReservations()
      .then(data => {
        if (active) setBookingsState({ loading: false, list: data })
      })
      .catch(() => {
        if (active) setBookingsState({ loading: false, list: [] })
      })

    return () => {
      active = false
    }
  }, [])

  const selectedVehicle = vehicleState.vehicle
  const vehiclesList = vehicleState.list

  // Calculate duration and price
  const startMs = new Date(startDate).getTime()
  const endMs = new Date(endDate).getTime()
  const isValidRange = !isNaN(startMs) && !isNaN(endMs) && endMs >= startMs
  const days = isValidRange ? Math.max(1, Math.round((endMs - startMs) / 86400000) + 1) : 0
  const dailyRate = selectedVehicle ? Number(selectedVehicle.daily_rate) : 0
  const estimatedTotal = dailyRate * days

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedVehicle) return
    if (!isValidRange) {
      setBookingError('Rental end date must be on or after start date.')
      return
    }

    setSubmitting(true)
    setBookingError('')
    setBookingSuccess(null)

    try {
      const result = await createReservation({
        vehicle_id: selectedVehicle.id,
        start_date: startDate,
        end_date: endDate,
      })
      setBookingSuccess(result.reservation || result)
      const updated = await getMyReservations()
      setBookingsState({ loading: false, list: updated })
    } catch (err) {
      setBookingError(err.message || 'Could not complete reservation.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(reservationId) {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return
    setCancellingId(reservationId)
    try {
      await cancelReservation(reservationId)
      const updated = await getMyReservations()
      setBookingsState({ loading: false, list: updated })
    } catch (err) {
      alert(err.message || 'Failed to cancel reservation.')
    } finally {
      setCancellingId(null)
    }
  }

  function handleVehicleSelect(e) {
    const id = e.target.value
    const found = vehiclesList.find(v => String(v.id) === String(id))
    if (found) {
      setVehicleState(prev => ({ ...prev, vehicle: found }))
      setSearchParams({ vehicleId: found.id })
    }
  }

  return (
    <main id="main-content" className="booking-page home-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RESERVATION DESK</span>
          <h1>My Bookings</h1>
        </div>
        <Link to="/vehicles" className="text-link">
          Browse fleet <span aria-hidden="true">↗</span>
        </Link>
      </div>

      {user && user.role !== 'customer' && (
        <div className="notice warning" role="note">
          You are signed in as an <strong>{user.role}</strong>. Only customer accounts can create rental bookings.
        </div>
      )}

      <div className="booking-layout">
        {/* Reservation Form Card */}
        <section className="booking-card" aria-labelledby="form-heading">
          <h2 id="form-heading">Create a Reservation</h2>

          {vehicleState.loading && (
            <div className="inventory-state" role="status">
              <p>Loading vehicle details…</p>
            </div>
          )}

          {vehicleState.error && (
            <div className="notice error" role="alert">
              <p>{vehicleState.error}</p>
              <Link to="/vehicles" className="text-link">Choose another vehicle</Link>
            </div>
          )}

          {bookingSuccess && (
            <div className="booking-success-box" role="status">
              <div className="success-icon">✓</div>
              <h3>Reservation Confirmed!</h3>
              <p>
                Reference <strong>#{bookingSuccess.id}</strong> has been confirmed for{' '}
                <strong>{bookingSuccess.vehicle_name || selectedVehicle?.name}</strong>.
              </p>
              <div className="success-meta">
                <span>Dates: {bookingSuccess.start_date} to {bookingSuccess.end_date}</span>
                <span>Total: {currency.format(Number(bookingSuccess.total_price))}</span>
              </div>
              <div className="success-actions">
                <Link to="/dashboard" className="home-button">
                  View in Dashboard <span aria-hidden="true">↗</span>
                </Link>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setBookingSuccess(null)}
                >
                  Book another vehicle
                </button>
              </div>
            </div>
          )}

          {!bookingSuccess && !vehicleState.loading && selectedVehicle && (
            <form onSubmit={handleSubmit} className="reservation-form">
              {vehiclesList.length > 1 && !vehicleIdParam && (
                <div className="form-group">
                  <label htmlFor="vehicle-select">SELECT VEHICLE</label>
                  <select
                    id="vehicle-select"
                    value={selectedVehicle.id}
                    onChange={handleVehicleSelect}
                  >
                    {vehiclesList.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.name || v.model} — {currency.format(Number(v.daily_rate))}/day ({v.location})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selected Vehicle Summary Banner */}
              <div className="selected-vehicle-banner">
                <div className="selected-vehicle-info">
                  <span className="vehicle-type-tag">{selectedVehicle.type}</span>
                  <h3>{selectedVehicle.name || selectedVehicle.model}</h3>
                  <p className="banner-location">📍 {selectedVehicle.location}</p>
                </div>
                <div className="selected-vehicle-rate">
                  <span className="rate-caption">Daily Rate</span>
                  <strong>{currency.format(dailyRate)}</strong>
                  <small> / day</small>
                </div>
              </div>

              {/* Date Selection */}
              <div className="date-inputs-grid">
                <div className="form-group">
                  <label htmlFor="rental-start-date">RENTAL START DATE</label>
                  <input
                    id="rental-start-date"
                    type="date"
                    required
                    min={today}
                    value={startDate}
                    onChange={e => {
                      setStartDate(e.target.value)
                      if (e.target.value > endDate) setEndDate(e.target.value)
                    }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rental-end-date">RENTAL END DATE</label>
                  <input
                    id="rental-end-date"
                    type="date"
                    required
                    min={startDate || today}
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Price Calculation Summary */}
              <div className="price-calculation-card">
                <div className="calc-row">
                  <span>Daily Rate:</span>
                  <span>{currency.format(dailyRate)}</span>
                </div>
                <div className="calc-row">
                  <span>Rental Duration:</span>
                  <span>{days} day{days === 1 ? '' : 's'}</span>
                </div>
                <div className="calc-divider" />
                <div className="calc-row total-row">
                  <span>Calculated Total Price:</span>
                  <strong>{currency.format(estimatedTotal)}</strong>
                </div>
              </div>

              {bookingError && (
                <div className="notice error" role="alert">
                  {bookingError}
                </div>
              )}

              <button
                type="submit"
                className="home-button confirm-btn"
                disabled={submitting || (user && user.role !== 'customer')}
              >
                {submitting ? 'Confirming Reservation…' : 'Confirm Reservation'}
                <span aria-hidden="true">↗</span>
              </button>
            </form>
          )}
        </section>

        {/* Existing Reservations History Card */}
        <section className="booking-history-card" aria-labelledby="history-heading">
          <h2 id="history-heading">My Reservations</h2>

          {bookingsState.loading && (
            <div className="inventory-state" role="status">
              <p>Loading your reservations…</p>
            </div>
          )}

          {!bookingsState.loading && bookingsState.list.length === 0 && (
            <div className="inventory-state">
              <p>You have no active or previous reservations.</p>
              <p className="subtext">Select a vehicle and dates above to create your first booking.</p>
            </div>
          )}

          {!bookingsState.loading && bookingsState.list.length > 0 && (
            <div className="reservations-list">
              {bookingsState.list.map(res => (
                <article key={res.id} className="reservation-item">
                  <div className="res-header">
                    <h4>{res.vehicle_name || `Vehicle #${res.vehicle_id}`}</h4>
                    <span className={`status-pill ${res.status === 'confirmed' ? 'available' : 'unavailable'}`}>
                      {res.status}
                    </span>
                  </div>
                  <div className="res-details">
                    <p>
                      <strong>Dates:</strong> {res.start_date} to {res.end_date}
                    </p>
                    <p>
                      <strong>Total:</strong> {currency.format(Number(res.total_price))}
                    </p>
                    {res.vehicle_location && (
                      <p>
                        <strong>Location:</strong> {res.vehicle_location}
                      </p>
                    )}
                  </div>
                  {res.status === 'confirmed' && (
                    <div className="res-actions">
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => handleCancel(res.id)}
                        disabled={cancellingId === res.id}
                      >
                        {cancellingId === res.id ? 'Cancelling…' : 'Cancel Reservation'}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
