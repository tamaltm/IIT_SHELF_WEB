"use client"

import { useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import "./Register.css"
import { authApi } from "../api/auth"

function Register() {
  const navigate = useNavigate()
  const submittingRef = useRef(false)
  const lastSubmitTime = useRef(0)
  
  // Step 1: Email verification
  const [step, setStep] = useState(1) // 1 = email verification (OTP sent)
  const [emailInput, setEmailInput] = useState("")
  const [verifiedUserInfo, setVerifiedUserInfo] = useState(null)
  
  // Step 2: Registration form
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    contact: "",
    roll: "",
    session: "",
    designation: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  })
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleEmailVerification = async (e) => {
    e.preventDefault()
    
    if (!emailInput.trim()) {
      setErrors({ email: "Email is required" })
      return
    }
    
    if (!/\S+@\S+\.\S+/.test(emailInput)) {
      setErrors({ email: "Email is invalid" })
      return
    }
    
    setIsLoading(true)
    setErrors({})

    try {
      const res = await authApi.sendRegisterOtp(emailInput.trim())
      if (res.success) {
        // Pre-reg info is included; move user to OTP verification next
        setVerifiedUserInfo(res)
        setFormData({
          ...formData,
          email: res.email,
          fullName: res.user_info?.full_name || "",
          contact: res.user_info?.contact || "",
          roll: res.user_info?.roll || "",
          session: res.user_info?.session || "",
          designation: res.user_info?.designation || "",
        })

        // Navigate directly to OTP verification page
        navigate("/verify-otp", {
          state: { email: res.email },
          replace: true,
        })
      } else {
        setErrors({ email: res.message || 'Unable to send verification code' })
      }
    } catch (error) {
      console.error('Email verification error:', error)
      setErrors({ email: error?.message || 'Network error. Please make sure the backend server is running.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.password) {
      newErrors.password = "Password is required"
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters"
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one capital letter"
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one digit"
    } else if (!/[!@#$%^&*(),.?\":{}|<>]/.test(formData.password)) {
      newErrors.password = "Password must contain at least one symbol (!@#$%^&*...)"
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions"
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Multiple layers of duplicate prevention
    const now = Date.now()
    if (submittingRef.current || isSubmitting || (now - lastSubmitTime.current) < 5000) {
      console.log('Duplicate submission blocked! Last submit was', (now - lastSubmitTime.current), 'ms ago');
      return;
    }
    
    const newErrors = validateForm()

    if (Object.keys(newErrors).length === 0) {
      submittingRef.current = true
      lastSubmitTime.current = now
      setIsLoading(true)
      setIsSubmitting(true)
      setErrors({})
      
      console.log('=== SUBMITTING REGISTRATION ===')
      
      try {
        const registrationData = {
          username: formData.fullName.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: verifiedUserInfo.role,
          full_name: formData.fullName.trim(),
          contact: formData.contact.trim(),
        }
        
        // Add role-specific fields
        if (verifiedUserInfo.role === 'Student') {
          registrationData.roll = formData.roll
          registrationData.session = formData.session
        } else if (verifiedUserInfo.role === 'Teacher') {
          registrationData.designation = formData.designation
        }
        
        const response = await fetch('/api/auth/register.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(registrationData),
        })

        const data = await response.json()
        console.log('Registration response:', data)

        if (data.success) {
          // Show OTP in console for testing (remove in production)
          if (data.debug_otp) {
            console.log('DEBUG OTP:', data.debug_otp)
          }
          
          // Redirect immediately to OTP verification
          navigate("/verify-otp", { 
            state: { 
              email: data.user.email,
              role: data.user.role,
              message: 'OTP sent to your email'
            },
            replace: true
          })
        } else {
          setErrors({ general: data.message || 'Registration failed. Please try again.' })
        }
      } catch (error) {
        console.error('Registration error:', error)
        setErrors({ general: 'Network error. Please make sure the backend server is running.' })
      } finally {
        setIsLoading(false)
        setIsSubmitting(false)
        // Don't reset submittingRef immediately - keep it true for 5 seconds
        setTimeout(() => {
          submittingRef.current = false
        }, 5000)
      }
    } else {
      setErrors(newErrors)
    }
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <Link to="/" className="register-logo">
            <h1>IITShelf</h1>
          </Link>
          <h2>{step === 1 ? "Verify Your Email" : "Create Your Account"}</h2>
          {step === 2 && verifiedUserInfo && (
            <div style={{ 
              padding: '10px', 
              marginTop: '10px',
              backgroundColor: '#e8f5e9', 
              color: '#2e7d32', 
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              ✓ Verified as <strong>{verifiedUserInfo.role}</strong>
            </div>
          )}
        </div>

        {errors.general && (
          <div className="alert alert-danger" style={{ 
            padding: '12px', 
            marginBottom: '20px', 
            backgroundColor: '#f8d7da', 
            color: '#721c24', 
            borderRadius: '4px',
            border: '1px solid #f5c6cb'
          }}>
            {errors.general}
          </div>
        )}

        {/* STEP 1: Email Verification */}
        {step === 1 && (
          <form onSubmit={handleEmailVerification} className="register-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter your institutional email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value)
                  setErrors({})
                }}
              />
              {errors.email && <div className="form-error">{errors.email}</div>}
              <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                Only pre-registered emails are authorized to register
              </small>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>
        )}

        {/* After OTP is sent, user will be redirected to OTP Verification */}

        <div className="register-footer">
          <p>
            Already have an account?{" "}
            <Link to="/login" className="login-link">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
