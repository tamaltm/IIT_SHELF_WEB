import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import PageTransition from "../components/PageTransition"
import { useState, useRef, useEffect } from "react"
import "./Profile.css"
import { authApi } from "../api/auth"

function Profile({ user, userRole, onLogout, onUpdateUser }) {
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)
  const [isUploading, setIsUploading] = useState(false)
  const [profileData, setProfileData] = useState({
    studentRoll: null,
    designation: null,
    username: user?.name || "User",
    email: user?.email || "",
    contact: "",
    borrowedBooks: 0,
    borrowLimit: 0,
    overdueFines: 0.0,
    clearedThisMonth: 0.0,
  })
  const [loading, setLoading] = useState(true)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [borrowedCount, setBorrowedCount] = useState(0)
  const [returnedCount, setReturnedCount] = useState(0)
  const [reservedCount, setReservedCount] = useState(0)
  // Safe initial for avatar text
  const displayInitial = (
    (user && user.name) ? user.name : (profileData?.username || profileData?.email || 'U')
  ).toString().charAt(0).toUpperCase()

  // Fetch profile data from backend
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.email) return
      
      try {
        const data = await authApi.getProfile(user.email)
        if (data.success && data.user) {
          setProfileData({
            studentRoll: data.user.roll || null,
            designation: data.user.designation || null,
            username: data.user.name || user?.name || "User",
            email: data.user.email || user.email,
            contact: data.user.contact || data.user.phone || "",
            borrowedBooks: data.user.borrowed_count || 0,
            borrowLimit: data.user.borrow_limit || 0,
            overdueFines: data.user.overdue_fines || 0.0,
            clearedThisMonth: data.user.cleared_this_month || 0.0,
          })
          // Update avatar if present
          if (data.user.profile_image && onUpdateUser) {
            onUpdateUser({ avatar: data.user.profile_image })
          }
        }
      } catch (error) {
        console.error('Error fetching profile data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfileData()
  }, [user])

  // Fetch stats: borrowed, returned, reserved
  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.email) return
      setStatsLoading(true)
      try {
        const data = await Promise.all([
          // getUserTransactions returns all; filter on client
          import("../api/borrow").then(m => m.borrowApi.getUserTransactions(user.email)),
        ])
        const res = data[0]
        if (res.success) {
          const tx = res.transactions || []
          setBorrowedCount(tx.filter(t => t.status === 'Borrowed' || t.status === 'Overdue').length)
          setReturnedCount(tx.filter(t => t.status === 'Returned').length)
          setReservedCount(tx.filter(t => t.status === 'Reserved').length)
        }
      } catch (e) {
        console.error('Error fetching stats:', e)
      } finally {
        setStatsLoading(false)
      }
    }
    fetchStats()
  }, [user])

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordErrors({})
    
    // Validation
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      setPasswordErrors({ general: 'All fields are required' })
      return
    }
    
    if (passwordData.new_password.length < 6) {
      setPasswordErrors({ new_password: 'Password must be at least 6 characters' })
      return
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordErrors({ confirm_password: 'Passwords do not match' })
      return
    }
    
    setIsChangingPassword(true)
    
    try {
      const data = await authApi.changePassword(
        user.email,
        passwordData.current_password,
        passwordData.new_password,
      )
      
      if (data.success) {
        alert('✓ Password changed successfully!')
        setShowPasswordModal(false)
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        })
      } else {
        setPasswordErrors({ general: data.message })
      }
    } catch (error) {
      console.error('Error changing password:', error)
      setPasswordErrors({ general: 'Network error. Please try again.' })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false)
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    })
    setPasswordErrors({})
  }

  return (
    <PageTransition className="profile-page">
      <Header user={user} onLogout={onLogout} />

      <div className="profile-container">
        {/* Avatar circle with upload button */}
        <div className="profile-avatar-stack">
          <div className="avatar-circle">
            {preview ? (
              <img src={preview} alt="avatar preview" className="profile-avatar-img" />
            ) : user?.avatar ? (
              <img src={user.avatar} alt="avatar" className="profile-avatar-img" />
            ) : (
              <span className="profile-avatar-text">{displayInitial}</span>
            )}
          </div>
          <label className="avatar-edit-btn" htmlFor="avatarInput" title="Upload photo" onClick={() => fileRef.current?.click()}>
            {isUploading ? (<span className="spinner" />) : (<>📷</>)}
          </label>
          <input
            id="avatarInput"
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files && e.target.files[0]
              if (!file) return
              setIsUploading(true)
              // Show local preview
              const reader = new FileReader()
              reader.onload = (ev) => setPreview(ev.target.result)
              reader.readAsDataURL(file)
              try {
                const data = await authApi.uploadProfileImage(user.email, file)
                if (data.success && data.image_url) {
                  setPreview(null)
                  onUpdateUser && onUpdateUser({ avatar: data.image_url })
                } else {
                  alert(data.message || 'Failed to upload image')
                }
              } catch (err) {
                console.error('Upload error:', err)
                alert('Image upload failed. Please try again.')
              } finally {
                setIsUploading(false)
              }
            }}
          />
        </div>

        {/* Name, role, email, phone */}
        <h2 className="profile-name">{profileData.username}</h2>
        <div className="profile-role">{(userRole || 'student').toUpperCase()}</div>
        <div className="profile-email">{profileData.email}</div>
        <div className="profile-phone">{profileData.contact || 'Not provided'}</div>

        {/* Stats card */}
        <div className="stats-card">
          <div className="stat-col">
            <div className="stat-value">{borrowedCount}</div>
            <div className="stat-label">Borrowed</div>
          </div>
          <div className="stat-col">
            <div className="stat-value">{returnedCount}</div>
            <div className="stat-label">Returned</div>
          </div>
          <div className="stat-col">
            <div className="stat-value">{reservedCount}</div>
            <div className="stat-label">Reserved</div>
          </div>
        </div>

        {/* Menu items */}
        <div className="menu-card">
          <div className="menu-item" onClick={() => setShowPasswordModal(true)}>
            <span className="menu-icon">🔒</span>
            <span className="menu-title">Reset Password</span>
            <span className="menu-arrow">›</span>
          </div>
        </div>

        {userRole === "librarian" && (
          <div className="librarian-stats">
            <h2>Library Statistics</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-number">1,200</div>
                <div className="stat-description">Total Books</div>
                <div className="stat-change positive">↑ 2.5% since last month</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">785</div>
                <div className="stat-description">Issued Books</div>
                <div className="stat-change positive">↑ 1.2% since last month</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={handlePasswordModalClose}>
          <div className="modal-content password-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button className="modal-close" onClick={handlePasswordModalClose}>
                ×
              </button>
            </div>
            
            <form onSubmit={handlePasswordChange} className="password-form">
              <div className="form-group">
                <label htmlFor="current_password">Current Password</label>
                <input
                  type="password"
                  id="current_password"
                  className="form-input"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                  placeholder="Enter current password"
                  disabled={isChangingPassword}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="new_password">New Password</label>
                <input
                  type="password"
                  id="new_password"
                  className="form-input"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                  placeholder="Enter new password (min 6 characters)"
                  disabled={isChangingPassword}
                />
                {passwordErrors.new_password && (
                  <span className="error-text">{passwordErrors.new_password}</span>
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="confirm_password">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm_password"
                  className="form-input"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  placeholder="Re-enter new password"
                  disabled={isChangingPassword}
                />
                {passwordErrors.confirm_password && (
                  <span className="error-text">{passwordErrors.confirm_password}</span>
                )}
              </div>
              
              {passwordErrors.general && (
                <div className="error-message">{passwordErrors.general}</div>
              )}
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handlePasswordModalClose}
                  disabled={isChangingPassword}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav userRole={userRole} />
    </PageTransition>
  )
}

export default Profile
