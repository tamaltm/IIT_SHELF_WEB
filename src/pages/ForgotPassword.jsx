import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import "./ForgotPassword.css"
import { authApi } from "../api/auth"

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!email) {
      setError("Please enter your email address")
      return
    }

    setIsLoading(true)

    try {
      const data = await authApi.sendResetOtp(email)
      if (data.success) {
        setSuccess(data.message || 'Reset code sent to your email')
        setTimeout(() => {
          navigate("/reset-password", { state: { email } })
        }, 1200)
      } else {
        setError(data.message || "Failed to send reset code")
      }
    } catch (error) {
      setError(error?.message || "Network error. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-header">
          <Link to="/" className="logo">
            <h1>IITShelf</h1>
          </Link>
          <h2>Forgot Password</h2>
          <p>Enter your email address and we'll send you a verification code</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="forgot-password-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-control"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>

        <div className="forgot-password-footer">
          <p>
            Remember your password?{" "}
            <Link to="/login" className="link">
              Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
