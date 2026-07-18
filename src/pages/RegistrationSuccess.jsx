import { Link } from "react-router-dom"
import "./RegistrationSuccess.css"

function RegistrationSuccess() {
  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-icon">✓</div>
        <h1>Registration Complete!</h1>
        <p>Your account has been successfully created.</p>
        <p>Please check your email for verification.</p>

        <Link to="/login" className="btn btn-primary btn-lg">
          Go to Login
        </Link>
      </div>
    </div>
  )
}

export default RegistrationSuccess
