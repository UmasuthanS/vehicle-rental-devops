import { useState } from 'react'

const Login = () => {
  const [isLoginMode, setIsLoginMode] = useState(true)

  return (
    <div>
      {/* Header title */}
      <div>
        <h2> 
            {isLoginMode ? 'Login' : 'Sign Up'}
        </h2>
        <div>
            <buttun onclick={() => setIsLoginMode(true)}> Login </buttun>
            <buttun onclick={() => setIsLoginMode(false)}>Sign Up</buttun>
        </div>
        <div>

        </div>

      </div>
    </div>
  )
}

export default Login

