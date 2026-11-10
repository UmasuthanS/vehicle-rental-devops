import { Link, useSearchParams } from 'react-router-dom'
export default function Upcoming({ bookings = false, notFound = false }) {
  const [params] = useSearchParams()
  return <main id="main-content" className="dashboard upcoming-page"><span className="eyebrow">{notFound ? 'PAGE NOT FOUND' : 'COMING NEXT'}</span><h1>{notFound ? 'That road ends here.' : bookings ? 'My Bookings' : 'Vehicle catalog'}</h1><p>{notFound ? 'The page you requested does not exist.' : bookings ? 'Your reservation history will be available when the reservation and dashboard phases are complete.' : 'Vehicle browsing, filters, and vehicle details will be available in Phase 2.'}</p>{!bookings && !notFound && (params.get('q') || params.get('type')) && <p>Your search: {[params.get('q'), params.get('type')].filter(Boolean).join(' · ')}</p>}<Link className="home-button" to="/">Back to home <span aria-hidden="true">↗</span></Link></main>
}
