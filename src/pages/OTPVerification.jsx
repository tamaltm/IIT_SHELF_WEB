"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import "./OTPVerification.css"
import { authApi } from "../api/auth"

function OTPVerification() {
  const navigate = useNavigate()
  const location = useLocation()
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    // Get email from navigation state
    if (location.state?.email) {
      setEmail(location.state.email)
    } else {
      // If no email in state, redirect to register
      navigate("/register")
    }
  }, [location, navigate])

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  const handleChange = (index, value) => {
    if (value.length > 1) {
      value = value[0]
    }

    if (!/^\d*$/.test(value)) {
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto-focus next input
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

    const otpCode = otp.join("")
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP")
      return
    }

    setIsVerifying(true)

    try {
      const data = await authApi.verifyEmail(email, otpCode)
      if (data.success) {
        setSuccess("OTP verified! Please set your password.")
        setTimeout(() => {
          navigate("/reset-password", {
            state: { email, mode: 'set' },
            replace: true,
          })
        }, 1500)
      } else {
        setError(data.message || "Invalid OTP. Please try again.")
      }
    } catch (error) {
      console.error("OTP verification error:", error)
      setError(error?.message || "Network error. Please try again.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async (emailToUse = null, silent = false) => {
    const targetEmail = emailToUse || email
    if (!silent && resendCooldown > 0) return

    if (!silent) {
      setError("")
      setSuccess("")
    }

    try {
      const data = await authApi.sendRegisterOtp(targetEmail)
      if (data.success) {
        if (!silent) {
          setSuccess("OTP has been resent to your email!")
          setResendCooldown(60)
        }
        setOtp(["", "", "", "", "", ""])
        if (data.otp) {
          console.log('DEBUG OTP:', data.otp)
        }
      } else {
        if (!silent) {
          setError(data.message || "Failed to resend OTP")
        }
      }
    } catch (error) {
      console.error("Resend OTP error:", error)
      if (!silent) {
        setError(error?.message || "Network error. Please try again.")
      }
    }
  }

  const handleResendOTP = () => handleResend(null, false)

  return (
    <div className="otp-page">
      <div className="otp-container">
        <div className="otp-header">
          <Link to="/" className="otp-logo">
            <h1>IITShelf</h1>
          </Link>
          <h2>Verify Your Email</h2>
          <p>
            We've sent a 6-digit verification code to
            <br />
            <strong>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#d4edda',
            color: '#155724',
            borderRadius: '4px',
            border: '1px solid #c3e6cb'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="otp-form">
          <div className="otp-inputs">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="otp-input"
                autoComplete="off"
              />
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: "100%" }}
            disabled={isVerifying}
          >
            {isVerifying ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <div className="otp-footer">
          <p>Didn't receive the code?</p>
          <button
            onClick={handleResendOTP}
            className="resend-btn"
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend OTP"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OTPVerification
