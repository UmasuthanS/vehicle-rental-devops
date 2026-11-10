import { Link } from 'react-router-dom'
export default function Footer() {
  return <footer className="site-footer"><div className="footer-top"><Link className="brand" to="/"><span className="brand-mark" aria-hidden="true">VR</span>Vehicle Rental</Link><p>The freedom to go further.</p><nav aria-label="Footer navigation"><Link to="/">Home</Link><Link to="/vehicles">Vehicles</Link><Link to="/bookings">My Bookings</Link><Link to="/#contact">Contact</Link></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Vehicle Rental</span><span>Group 79 · University of Ruhuna</span></div></footer>
}
