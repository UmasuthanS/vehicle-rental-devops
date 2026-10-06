import { useState } from 'react'


const Login = () => {
  const [isLoginMode, setIsLoginMode] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
  e.preventDefault()

  if (!email || !password) {
  alert('Please fill in all fields')
  return
}
  console.log('Login submitted')
}
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Header title */}
      <div className="w-full max-w-md bg-black p-6 shadow-lg shadow-green-500/50">

        <div className="flex justify-center items-center border-b-2 border-green-500">

          <h2 className="text-2xl font-mono font-bold text-white " text-center >
            Welcome Back!
          </h2>


        </div>


        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mt-2 mb-2 text-sm  font-mono font-medium text-white">
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
            <label className="block mt-2 mb-2 text-sm  font-mono font-medium  text-white">
              Password
            </label>

            <input
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter your password"
              className="w-full px-4 py-2 border font-mono  focus:border-green-500 focus:outline-none text-gray-300 hover:scale-101 transition-transform duration-200 "

            />
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

        </form>



      </div>
    </div>
  )
}

export default Login

