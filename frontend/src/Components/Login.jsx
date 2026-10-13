import { useState } from 'react'


const Login = () => {
  const [isLoginMode, setIsLoginMode] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!email.trim() ||
      !password ||
      !isLoginMode && (!name.trim() || !confirmPassword)
    ) {
      setError('Please fill in all fields')
      return
    }

    if (!isLoginMode && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!isLoginMode && password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setError('')

    console.log('Login submitted')
  }
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Header title */}
      <div className="w-full max-w-md bg-black p-6 shadow-lg shadow-green-500/50">

        <div className="flex justify-center items-center border-b-2 border-green-500">

          <h2 className="text-2xl font-mono font-bold text-white text-center ">
            {isLoginMode ? "Welcome Back!" : "Welcome!"}
          </h2>


        </div>


        <form onSubmit={handleSubmit}>
          {!isLoginMode && (
            <div className="mb-4">

              <label htmlFor="name" className="block mt-2 mb-2 text-sm  font-mono font-medium text-white">
                Full Name
              </label>

              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="Enter your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border font-mono  focus:border-green-500 focus:outline-none text-gray-300 hover:scale-101 transition-transform duration-200"
              />
            </div>
          )}


          <div className="mb-4">
            <label htmlFor="email" className="block mt-2 mb-2 text-sm  font-mono font-medium text-white">
              Email
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border font-mono  focus:border-green-500 focus:outline-none text-gray-300 hover:scale-101 transition-transform duration-200"
            />
          </div>

          <div className="mb-4">

            <label htmlFor="password" className="block mt-2 mb-2 text-sm  font-mono font-medium  text-white">
              Password
            </label>

            <div className="border border-gray-300  focus-within:border-green-500 focus-within:ring focus-within:ring-green-500 focus-within:ring-opacity-50">
              <div className="flex flex-row ">
                <input
                  id="password"
                  value={password}
                  onChange={(e) =>{ 
                    setPassword(e.target.value)
                    setError('')
                  }}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2  font-mono  focus:outline-none text-gray-300 hover:scale-101 transition-transform duration-200  "
                />
                <div className="flex items-center ml-2 mr-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-sm text-green-600 hover:underline"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {!isLoginMode && (
            <div className="mb-4">

              <label htmlFor="confirmPassword" className="block mt-2 mb-2 text-sm  font-mono font-medium  text-white">
                Confirm Password
              </label>

              <div className="border border-gray-300  focus-within:border-green-500 focus-within:ring focus-within:ring-green-500 focus-within:ring-opacity-50">
                <div className="flex flex-row ">
                  <input
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError('')
                    }}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-Enter your password"
                    className="w-full px-4 py-2  font-mono  focus:outline-none text-gray-300 hover:scale-101 transition-transform duration-200  "
                  />
                  <div className="flex items-center ml-2 mr-2">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-sm text-green-600 hover:underline"
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}



          <div>
            {error && (
              <p className="mb-4 text-sm text-red-500 font-mono">
                {error}
              </p>
            )}
          </div>

          <div>

            <button type="submit" className="w-full bg-green-500 hover:bg-green-600 hover:scale-101 text-white font-mono font-bold py-2 px-4 rounded transition-transform duration-200">
              {isLoginMode ? 'Login' : 'Sign Up'}
            </button>

          </div>
          <div className="text-right mt-4 ">
            <a
              href="#"
              className="text-sm text-green-600 hover:underline"
            >
              Forgot password?
            </a>
          </div>
          <p className="text-center text-gray-400 mt-4">
            {isLoginMode ? "Don't have an account?" : "Already have an account?"}

            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode)
                setError('')
              }}
              className="text-green-600 ml-2 hover:underline"
            >
              {isLoginMode ? 'Sign Up' : 'Login'}
            </button>
          </p>

        </form>



      </div>
    </div>
  )
}

export default Login

