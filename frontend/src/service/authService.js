const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/auth').replace(/\/$/, '')

export const apiBaseUrl = API_URL.replace(/\/auth$/, '')

export async function request(endpoint, data, baseUrl = API_URL) {
  let response
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      method: data === undefined ? 'GET' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'VehicleRental' },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    })
  } catch {
    throw new Error('Unable to reach the server. Check your connection and try again.')
  }
  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(result.message || 'The request failed. Please try again.')
    error.status = response.status
    throw error
  }
  return result
}
export const registerUser = data => request('/register', data)
export const loginUser = data => request('/login', data)
export const getCurrentUser = () => request('/me')
export const logoutUser = () => request('/logout', {})
