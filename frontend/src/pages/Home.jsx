import { Link, createSearchParams, useNavigate } from 'react-router-dom'
import hero from '../assets/home-hero.jpg'

const categories = [
  { type: 'car', title: 'Cars', detail: 'City streets to coastal escapes.', mark: '01' },
  { type: 'van', title: 'Vans', detail: 'More room for your next adventure.', mark: '02' },
  { type: 'motorcycle', title: 'Motorcycles', detail: 'Take the scenic route.', mark: '03' },
]
export default function Home({ featured }) {
  const navigate = useNavigate()
  function search(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const params = createSearchParams()
    if (form.get('q').trim()) params.set('q', form.get('q').trim())
    if (form.get('type')) params.set('type', form.get('type'))
    navigate(`/vehicles${params.size ? `?${params}` : ''}`)
  }
  return <main id="main-content" className="home-page">
    <section className="home-hero" aria-labelledby="hero-title">
      <img className="hero-photo" src={hero} alt="Black sports sedan travelling along a highway" fetchPriority="high" />
      <div className="hero-shade" />
      <div className="hero-copy">
        <p className="eyebrow">A NEW DESTINATION. YOUR OWN PACE.</p>
        <h1 id="hero-title">Find Your <br />Perfect Ride<span>.</span></h1>
        <p>From everyday journeys to long-awaited escapes.<br className="desktop-break" /> Find a vehicle that fits the road ahead.</p>
        <Link className="home-button" to="/vehicles">Explore Vehicles <span aria-hidden="true">↗</span></Link>
      </div>
      <span className="hero-caption">THE ROAD IS YOURS TO EXPLORE</span>
    </section>
    <div className="search-wrap">
      <form className="ride-search" onSubmit={search} role="search" aria-label="Find a vehicle">
        <div><label htmlFor="ride-query">WHERE WILL YOU GO?</label><input id="ride-query" name="q" placeholder="Vehicle name or location" maxLength={100} /></div>
        <div><label htmlFor="ride-type">YOUR KIND OF RIDE</label><select id="ride-type" name="type"><option value="">All vehicle types</option>{categories.map(item => <option key={item.type} value={item.type}>{item.title}</option>)}</select></div>
        <button type="submit" className="home-button">Find a ride <span aria-hidden="true">↗</span></button>
      </form>
    </div>
    <section className="home-section" aria-labelledby="category-title">
      <div className="section-heading"><div><p className="eyebrow">MADE FOR YOUR JOURNEY</p><h2 id="category-title">A ride for every road.</h2></div><p>Different plans. The same freedom to go.</p></div>
      <div className="category-grid">{categories.map(item => <Link key={item.type} className="category-card" to={`/vehicles?type=${item.type}`}><span className="category-number">{item.mark}</span><h3>{item.title}</h3><p>{item.detail}</p><span className="category-link">Explore {item.title.toLowerCase()} <span aria-hidden="true">↗</span></span></Link>)}</div>
    </section>
    <section className="home-section featured-section" aria-labelledby="featured-title">
      <div className="section-heading"><div><p className="eyebrow">EXPLORE THE POSSIBILITIES</p><h2 id="featured-title">Your next ride awaits.</h2></div><Link className="text-link" to="/vehicles">View all vehicles <span aria-hidden="true">↗</span></Link></div>
      {featured || <div className="inventory-state"><h3>Vehicle listings are on their way.</h3><p>Available vehicles will appear here when inventory is connected.</p></div>}
    </section>
    <section className="how-section" aria-labelledby="how-title"><div className="home-section"><p className="eyebrow">LESS PLANNING. MORE EXPLORING.</p><h2 id="how-title">From here to wherever.</h2><div className="steps-grid">{[
      ['01', 'Find your fit', 'Browse vehicles by type, location, and your plans.'],
      ['02', 'Choose your dates', 'Select the start and end dates for your journey.'],
      ['03', 'Make it yours', 'Reserve your vehicle and view the booking in your account.'],
    ].map(([number, title, description]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div><p className="phase-note">Vehicle browsing and reservations are being introduced in the next project phases.</p></div></section>
    <section className="home-section contact-section" id="contact" aria-labelledby="contact-title"><div><p className="eyebrow">STAY CONNECTED</p><h2 id="contact-title">Every journey starts <br />with a little curiosity.</h2></div><div><p>Create your account today and be ready for the road ahead.</p><Link className="home-button" to="/register">Create an account <span aria-hidden="true">↗</span></Link></div></section>
  </main>
}
