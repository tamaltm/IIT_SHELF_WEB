import { useState, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import "./ResetPassword.css"
import { authApi } from "../api/auth"

function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1) // 1 = verify OTP, 2 = set new password
  const [verifiedOtp, setVerifiedOtp] = useState("")

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email)
      // If coming from registration set-password flow, skip to step 2
      if (location.state?.mode === 'set') {
        setStep(2)
      }
    } else {
      navigate("/forgot-password")
    }
  }, [location, navigate])

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      value = value[0]
    }

    if (!/^\d*$/.test(value)) {
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      if (nextInput) nextInput.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      if (prevInput) prevInput.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text").slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i]
    }
    setOtp(newOtp)

    const lastIndex = Math.min(pastedData.length, 5)
    const lastInput = document.getElementById(`otp-${lastIndex}`)
    if (lastInput) lastInput.focus()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (step === 1) {
      // Step 1: Verify OTP
      const otpCode = otp.join("")
      if (otpCode.length !== 6) {
        setError("Please enter the complete 6-digit OTP")
        return
      }

      setIsLoading(true)

      try {
        const data = await authApi.verifyResetOtp(email, otpCode)
        if (data.success) {
          setVerifiedOtp(otpCode)
          setSuccess("OTP verified! Now set your new password.")
          setTimeout(() => {
            setStep(2)
            setSuccess("")
          }, 1200)
        } else {
          setError(data.message || "Invalid or expired OTP")
        }
      } catch (error) {
        console.error("Error:", error)
        setError(error?.message || "Network error. Please try again.")
      } finally {
        setIsLoading(false)
      }
    } else {
      // Step 2: Reset Password
      if (!password || !confirmPassword) {
        setError("Please enter and confirm your new password")
        return
      }

      if (password.length < 6) {
        setError("Password must be at least 6 characters long")
        return
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match")
        return
      }

      setIsLoading(true)

      try {
        let data
        if (location.state?.mode === 'set') {
          // Set password flow after registration (no OTP here)
          data = await authApi.setPassword(email, password)
        } else {
          // Reset password flow (requires OTP)
          data = await authApi.resetPassword(email, verifiedOtp, password)
        }

        if (data.success) {
          setSuccess(data.message || 'Password updated successfully')
          setTimeout(() => {
            navigate("/login", {
              state: {
                message: "Password updated successfully! Please login.",
                email,
              },
            })
          }, 1200)
        } else {
          setError(data.message || "Failed to update password. Please try again.")
        }
      } catch (error) {
        console.error("Error:", error)
        setError(error?.message || "Network error. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-header">
          <Link to="/" className="logo">
            <h1>IITShelf</h1>
          </Link>
          <h2>{step === 1 ? "Verify OTP" : "Set New Password"}</h2>
          <p>
            {step === 1 ? (
              <>
                Enter the 6-digit code sent to
                <br />
                <strong>{email}</strong>
              </>
            ) : (
              "Enter your new password"
            )}
          </p>
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

        <form onSubmit={handleSubmit} className="reset-password-form">
          {step === 1 ? (
            <>
              <div className="otp-inputs">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="otp-input"
                    disabled={isLoading}
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="password">New Password</label>
                <input
                  type="password"
                  id="password"
                  className="form-control"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  className="form-control"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={isLoading}
              >
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </>
          )}
        </form>

        <div className="reset-password-footer">
          <p>
            <Link to="/forgot-password" className="link">
              ← Back to Forgot Password
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
