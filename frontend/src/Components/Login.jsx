import { useState } from 'react'
import { registerUser, loginUser } from '../service/authService'

export default function Login({ onLogin, initialMode = 'login', onModeChange, successMessage = '', initialEmail = '' }) {
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login')
  const [values, setValues] = useState({ name: '', email: initialEmail, password: '', confirmPassword: '' })
  const [visible, setVisible] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(successMessage)
  const [loading, setLoading] = useState(false)
  const update = event => setValues({ ...values, [event.target.name]: event.target.value })

  async function handleSubmit(event) {
    event.preventDefault()
    setError(''); setSuccess('')
    if (!values.email.trim() || !values.password || (!isLoginMode && (!values.name.trim() || !values.confirmPassword))) {
      setError('Please fill in all fields.'); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      setError('Please enter a valid email address.'); return
    }
    if (!isLoginMode) {
      if (values.name.trim().length > 100) { setError('Full name must be 100 characters or fewer.'); return }
      if (values.password.length < 8 || !/[a-zA-Z]/.test(values.password) || !/[0-9]/.test(values.password) || new TextEncoder().encode(values.password).length > 72) {
        setError('Use at least 8 characters, including a letter and a number (maximum 72 UTF-8 bytes).'); return
      }
      if (values.password !== values.confirmPassword) { setError('Passwords do not match.'); return }
    }
    setLoading(true)
    try {
      const data = { name: values.name.trim(), email: values.email.trim(), password: values.password }
      if (isLoginMode) {
        const { user } = await loginUser(data)
        onLogin(user)
      } else {
        await registerUser(data)
        if (onModeChange) {
          onModeChange('login', { registeredEmail: values.email.trim() })
          return
        }
        setIsLoginMode(true)
        setVisible(false)
        setValues({ ...values, password: '', confirmPassword: '' })
        setSuccess('Account created. Sign in to get started.')
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return <main id="main-content" className="auth-layout">
    <section className="brand-panel" aria-label="Vehicle Rental">
      <span className="eyebrow">YOUR NEXT CHAPTER, ON THE ROAD</span>
      <h1>Every journey<br />starts here<span>.</span></h1>
      <p>A little freedom. A new destination.<br />Your journey begins with Vehicle Rental.</p>
      <div className="journey-note"><span className="road-line" /> Built for the way you move</div>
    </section>
    <section className="form-panel" aria-labelledby="form-title">
      <div className="form-heading"><span className="eyebrow">VEHICLE RENTAL · MEMBER ACCESS</span>
        <h2 id="form-title">{isLoginMode ? 'Welcome back.' : 'Start your journey.'}</h2>
        <p>{isLoginMode ? 'Sign in to your account and pick up where you left off.' : 'Create your customer account in a few simple steps.'}</p>
      </div>
      <form onSubmit={handleSubmit} noValidate aria-busy={loading}>
        <fieldset disabled={loading}>
          {!isLoginMode && <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" maxLength={100} value={values.name} onChange={update} required placeholder="Your full name" /></div>}
          <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" autoComplete="email" maxLength={254} value={values.email} onChange={update} required placeholder="you@example.com" /></div>
          <div className="field"><label htmlFor="password">Password</label><div className="password-field"><input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={isLoginMode ? 'current-password' : 'new-password'} value={values.password} onChange={update} required aria-describedby={!isLoginMode ? 'password-help' : undefined} placeholder={isLoginMode ? 'Enter your password' : 'Create a strong password'} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>{visible ? 'Hide' : 'Show'}</button></div>
            {!isLoginMode && <small id="password-help">8+ characters with a letter and a number. Maximum 72 UTF-8 bytes.</small>}</div>
          {!isLoginMode && <div className="field"><label htmlFor="confirmPassword">Confirm password</label><input id="confirmPassword" name="confirmPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" value={values.confirmPassword} onChange={update} required placeholder="Repeat your password" /></div>}
          {error && <p className="notice error" role="alert">{error}</p>}
          {success && <p className="notice success" role="status">{success}</p>}
          <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Please wait…' : isLoginMode ? 'Sign in' : 'Create account'}<span aria-hidden="true">↗</span></button>
          <p className="switch-mode">{isLoginMode ? 'New to Vehicle Rental?' : 'Already have an account?'} <button type="button" onClick={() => { if (onModeChange) { onModeChange(isLoginMode ? 'register' : 'login'); return } setIsLoginMode(!isLoginMode); setValues({ ...values, password: '', confirmPassword: '' }); setError(''); setSuccess(''); setVisible(false) }}>{isLoginMode ? 'Create an account' : 'Sign in'}</button></p>
        </fieldset>
      </form>
      <p className="form-footer">Your next destination is closer than you think.</p>
    </section>
  </main>
}
