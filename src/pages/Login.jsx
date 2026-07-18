"use client"

import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import "./Login.css"
import { authApi } from "../api/auth"

function Login({ onLogin }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  
  useEffect(() => {
    // Check if redirected from registration with success message
    if (location.state?.message) {
      setSuccessMessage(location.state.message)
      if (location.state?.email) {
        setFormData(prev => ({ ...prev, email: location.state.email }))
      }
      // Clear the location state
      window.history.replaceState({}, document.title)
    }
  }, [location])
  

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Basic validation
    if (!formData.email || !formData.password) {
      setError("Please enter both email and password")
      setIsLoading(false)
      return
    }

    try {
      const email = formData.email.trim()
      const loginRes = await authApi.login(email, formData.password)

      if (!loginRes.success) {
        setError(loginRes.message || 'Login failed. Please check your credentials.')
        setIsLoading(false)
        return
      }

      // Optionally store token for future use
      if (loginRes.token) {
        try { sessionStorage.setItem('iitshelf_token', loginRes.token) } catch {}
      }

      // Fetch user profile details after login
      let userData = { email }
      try {
        const profileRes = await authApi.getProfile(email)
        if (profileRes.success && profileRes.user) {
          userData = profileRes.user
        }
      } catch (_) {}

      const role = (loginRes.role || userData.role || 'student').toLowerCase()
      onLogin(userData, role)

      if (role === 'librarian') {
        navigate('/librarian/dashboard')
      } else if (role === 'director') {
        navigate('/director/dashboard')
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error?.message || 'Network error. Please make sure the backend server is running.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <Link to="/" className="login-logo">
            <h1>IITShelf</h1>
          </Link>
          <h2>Welcome Back</h2>
          <p>Sign in to continue to IITShelf.</p>
        </div>

        {successMessage && (
          <div className="alert alert-success" style={{ 
            padding: '12px', 
            marginBottom: '20px', 
            backgroundColor: '#d4edda', 
            color: '#155724', 
            borderRadius: '4px',
            border: '1px solid #c3e6cb'
          }}>
            {successMessage}
          </div>
        )}

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Email or User ID</label>
            <input
              type="text"
              name="email"
              className="form-input"
              placeholder="Enter your email or user ID"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
            />
          </div>

          {/* Login is email-only. Role is inferred from email mapping. */}

          <div className="login-options">
            <div className="form-checkbox">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="rememberMe">Remember me</label>
            </div>
            <Link to="/forgot-password" className="forgot-link">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>
            Don't have an account?{" "}
            <Link to="/register" className="register-link">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
