import { useState } from 'react'
import { Link } from 'react-router-dom'
const currency = new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0, maximumFractionDigits: 2 })
export default function VehicleCard({ vehicle }) {
  const [failedImage, setFailedImage] = useState(false)
  const image = typeof vehicle.image_url === 'string' && /^(https?:\/\/|\/(?!\/))/.test(vehicle.image_url) ? vehicle.image_url : null
  return <article className="vehicle-card"><div className="vehicle-image">{image && !failedImage ? <img src={image} alt={vehicle.name || vehicle.model} loading="lazy" onError={() => setFailedImage(true)} /> : <span>Vehicle image unavailable</span>}</div><div className="vehicle-card-body"><span className="vehicle-type">{vehicle.type}</span><h3>{vehicle.name || vehicle.model}</h3><p>{vehicle.location}</p><div className="vehicle-card-bottom"><p><strong>{currency.format(Number(vehicle.daily_rate))}</strong><small> / day</small></p><Link to={`/vehicles/${encodeURIComponent(vehicle.id)}`} aria-label={`View details for ${vehicle.name || vehicle.model}`}>View Details ↗</Link></div></div></article>
}
