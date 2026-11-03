
const API_URL = import.meta.env.VITE_API_URL;

const sendRequest = async (endpoint, userData) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(userData)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Request failed');
  }

  return result;
};

// Register new user
export const registerUser = async (userData) => {
  return sendRequest('/register', userData);
};

// Login existing user
export const loginUser = async (userData) => {
  return sendRequest('/login', userData);
};
