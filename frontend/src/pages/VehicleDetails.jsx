import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getVehicleById } from '../service/vehicleService'

const currency = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

export default function VehicleDetails() {
  const { id } = useParams()
  const [state, setState] = useState({ status: 'loading', vehicle: null, error: '' })
  const [failedImage, setFailedImage] = useState(false)

  useEffect(() => {
    let active = true

    getVehicleById(id)
      .then(data => {
        if (active) setState({ status: 'ready', vehicle: data, error: '' })
      })
      .catch(err => {
        if (active) setState({ status: 'error', vehicle: null, error: err.message || 'Unable to load vehicle details.' })
      })

    return () => {
      active = false
    }
  }, [id])

  if (state.status === 'loading') {
    return (
      <main id="main-content" className="home-section vehicle-details-page">
        <div className="inventory-state" role="status">
          <h3>Loading vehicle details…</h3>
          <p>Please wait while we retrieve information for this vehicle.</p>
        </div>
      </main>
    )
  }

  if (state.status === 'error' || !state.vehicle) {
    return (
      <main id="main-content" className="home-section vehicle-details-page">
        <div className="inventory-state" role="alert">
          <span className="eyebrow">VEHICLE CATALOG</span>
          <h2>Vehicle Not Found</h2>
          <p>{state.error || 'The requested vehicle could not be located in our inventory.'}</p>
          <Link className="home-button" to="/vehicles">
            Back to Catalog <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </main>
    )
  }

  const { vehicle } = state
  const image =
    typeof vehicle.image_url === 'string' && /^(https?:\/\/|\/(?!\/))/.test(vehicle.image_url)
      ? vehicle.image_url
      : null

  return (
    <main id="main-content" className="home-section vehicle-details-page">
      <nav className="details-breadcrumb" aria-label="Breadcrumb">
        <Link to="/vehicles" className="text-link">
          ← Back to Catalog
        </Link>
      </nav>

      <div className="vehicle-details-layout">
        <div className="details-media">
          <div className="details-image-frame">
            {image && !failedImage ? (
              <img
                src={image}
                alt={vehicle.name || vehicle.model}
                onError={() => setFailedImage(true)}
              />
            ) : (
              <div className="details-image-fallback">
                <span>Vehicle image unavailable</span>
              </div>
            )}
          </div>
        </div>

        <div className="details-summary">
          <div className="details-header">
            <span className="vehicle-type-tag">{vehicle.type}</span>
            <h1>{vehicle.name || vehicle.model}</h1>
            <p className="details-location">
              <span aria-hidden="true">📍</span> {vehicle.location}
            </p>
          </div>

          <div className="details-price-card">
            <span className="price-label">Rental Rate</span>
            <p className="price-amount">
              <strong>{currency.format(Number(vehicle.daily_rate))}</strong>
              <small> / day</small>
            </p>
            <span className={`status-pill ${vehicle.available ? 'available' : 'unavailable'}`}>
              {vehicle.available ? 'Available for Booking' : 'Currently Reserved'}
            </span>
          </div>

          <div className="specs-grid">
            <div className="spec-card">
              <span className="spec-label">Capacity</span>
              <span className="spec-value">{vehicle.capacity || 4} Seats</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Transmission</span>
              <span className="spec-value">{vehicle.transmission || 'Automatic'}</span>
            </div>
            <div className="spec-card">
              <span className="spec-label">Fuel Type</span>
              <span className="spec-value">{vehicle.fuel_type || 'Petrol'}</span>
            </div>
          </div>

          {vehicle.description && (
            <div className="details-description">
              <h3>About this vehicle</h3>
              <p>{vehicle.description}</p>
            </div>
          )}

          <div className="details-actions">
            <Link
              to={`/bookings?vehicleId=${encodeURIComponent(vehicle.id)}`}
              className="home-button reserve-btn"
            >
              Reserve This Vehicle <span aria-hidden="true">↗</span>
            </Link>
            <Link to="/vehicles" className="secondary-button">
              Browse More
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
