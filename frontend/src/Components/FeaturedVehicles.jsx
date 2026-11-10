import { useEffect, useState } from 'react'
import { getFeaturedVehicles } from '../service/vehicleService'
import VehicleCard from './VehicleCard'
export default function FeaturedVehicles() {
  const [state, setState] = useState({ status: 'loading', vehicles: [] })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    getFeaturedVehicles().then(vehicles => { if (active) setState({ status: 'ready', vehicles }) }).catch(error => {
      if (active) setState({ status: error.status === 404 ? 'unavailable' : 'error', message: error.message, vehicles: [] })
    })
    return () => { active = false }
  }, [attempt])
  if (state.status === 'ready' && state.vehicles.length) return <div className="vehicle-grid">{state.vehicles.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div>
  return <div className="inventory-state" role={state.status === 'error' ? 'alert' : 'status'}>
    <h3>{state.status === 'loading' ? 'Finding your next ride…' : state.status === 'unavailable' ? 'Vehicle listings are on their way.' : state.status === 'error' ? 'We couldn’t load the vehicles.' : 'No vehicles listed yet.'}</h3>
    <p>{state.status === 'unavailable' ? 'The vehicle catalog is being connected in Phase 2. Check back for available rides.' : state.status === 'error' ? state.message : state.status === 'ready' ? 'Available vehicles will appear here when owners add them to the catalog.' : 'Checking the latest inventory.'}</p>
    {['error', 'unavailable'].includes(state.status) && <button type="button" onClick={() => { setState({ status: 'loading', vehicles: [] }); setAttempt(attempt + 1) }}>Check again</button>}
  </div>
}
