import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import VehicleCard from '../Components/VehicleCard'
import { getVehicles } from '../service/vehicleService'

const categories = [
  { id: '', label: 'All Vehicles' },
  { id: 'car', label: 'Cars' },
  { id: 'van', label: 'Vans' },
  { id: 'motorcycle', label: 'Motorcycles' },
]

export default function Vehicles() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setState] = useState({ status: 'loading', vehicles: [], error: '' })
  const [attempt, setAttempt] = useState(0)

  const q = searchParams.get('q') || ''
  const type = searchParams.get('type') || ''
  const minPrice = searchParams.get('minPrice') || ''
  const maxPrice = searchParams.get('maxPrice') || ''

  const [searchField, setSearchField] = useState(q)
  const [minPriceField, setMinPriceField] = useState(minPrice)
  const [maxPriceField, setMaxPriceField] = useState(maxPrice)

  useEffect(() => {
    let active = true
    getVehicles({ type, q, minPrice, maxPrice })
      .then(data => {
        if (active) setState({ status: 'ready', vehicles: data, error: '' })
      })
      .catch(err => {
        if (active) setState({ status: 'error', vehicles: [], error: err.message || 'Failed to load vehicles.' })
      })

    return () => {
      active = false
    }
  }, [type, q, minPrice, maxPrice, attempt])

  function handleFilterSubmit(e) {
    e.preventDefault()
    const next = new URLSearchParams(searchParams)
    if (searchField.trim()) next.set('q', searchField.trim())
    else next.delete('q')

    if (minPriceField.trim()) next.set('minPrice', minPriceField.trim())
    else next.delete('minPrice')

    if (maxPriceField.trim()) next.set('maxPrice', maxPriceField.trim())
    else next.delete('maxPrice')

    setState(prev => ({ ...prev, status: 'loading' }))
    setSearchParams(next)
  }

  function handleCategoryClick(categoryId) {
    const next = new URLSearchParams(searchParams)
    if (categoryId) next.set('type', categoryId)
    else next.delete('type')
    setState(prev => ({ ...prev, status: 'loading' }))
    setSearchParams(next)
  }

  function handleReset() {
    setSearchField('')
    setMinPriceField('')
    setMaxPriceField('')
    setState(prev => ({ ...prev, status: 'loading' }))
    setSearchParams(new URLSearchParams())
  }

  function handleRetry() {
    setState(prev => ({ ...prev, status: 'loading' }))
    setAttempt(a => a + 1)
  }

  return (
    <main id="main-content" className="catalog-page">
      <div className="catalog-hero">
        <div className="home-section">
          <span className="eyebrow">EXPLORE OUR FLEET</span>
          <h1>Find Your Ideal Vehicle<span>.</span></h1>
          <p>Browse through cars, vans, and motorcycles ready for your next trip.</p>
        </div>
      </div>

      <div className="home-section catalog-content">
        <div className="catalog-controls">
          <div className="category-pills" role="tablist" aria-label="Filter by vehicle type">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                className={`pill-btn ${type === cat.id ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <form className="catalog-filter-form" onSubmit={handleFilterSubmit} role="search">
            <div className="filter-input-wrap">
              <label htmlFor="catalog-search">SEARCH</label>
              <input
                id="catalog-search"
                type="search"
                placeholder="Model, brand, location…"
                value={searchField}
                onChange={e => setSearchField(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="filter-price-wrap">
              <div>
                <label htmlFor="catalog-min">MIN PRICE (LKR)</label>
                <input
                  id="catalog-min"
                  type="number"
                  placeholder="Min"
                  value={minPriceField}
                  onChange={e => setMinPriceField(e.target.value)}
                  min={0}
                />
              </div>
              <div>
                <label htmlFor="catalog-max">MAX PRICE (LKR)</label>
                <input
                  id="catalog-max"
                  type="number"
                  placeholder="Max"
                  value={maxPriceField}
                  onChange={e => setMaxPriceField(e.target.value)}
                  min={0}
                />
              </div>
            </div>
            <div className="filter-actions">
              <button type="submit" className="home-button apply-btn">Apply</button>
              {(q || type || minPrice || maxPrice) && (
                <button type="button" className="text-link reset-btn" onClick={handleReset}>
                  Clear all
                </button>
              )}
            </div>
          </form>
        </div>

        {state.status === 'loading' && (
          <div className="inventory-state" role="status">
            <h3>Loading vehicle catalog…</h3>
            <p>Searching for available vehicles matching your criteria.</p>
          </div>
        )}

        {state.status === 'error' && (
          <div className="inventory-state" role="alert">
            <h3>Unable to load vehicles</h3>
            <p>{state.error}</p>
            <button type="button" onClick={handleRetry}>Try Again</button>
          </div>
        )}

        {state.status === 'ready' && state.vehicles.length === 0 && (
          <div className="inventory-state">
            <h3>No vehicles found</h3>
            <p>We couldn't find any vehicles matching your filter criteria.</p>
            <button type="button" onClick={handleReset}>Reset Filters</button>
          </div>
        )}

        {state.status === 'ready' && state.vehicles.length > 0 && (
          <>
            <p className="catalog-count" aria-live="polite">
              Showing {state.vehicles.length} vehicle{state.vehicles.length === 1 ? '' : 's'}
            </p>
            <div className="vehicle-grid">
              {state.vehicles.map(vehicle => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
