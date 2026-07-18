"use client"

import { Link, useNavigate, useLocation } from "react-router-dom"
import { useState, useEffect } from "react"
import { notificationsApi } from "../api/notifications"
import "./Header.css"

function Header({ user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  const handleLogout = () => {
    onLogout()
    navigate("/")
  }

  // Fetch notification count
  const fetchNotificationCount = async () => {
    if (!user?.email) return
    
    try {
      const data = await notificationsApi.getNotifications(user.email)
      if (data.success) {
        const list = data.notifications || []
        const unread = list.filter(n => !n.isRead).length
        setUnreadCount(unread)
      }
    } catch (error) {
      // Silent error handling
    }
  }

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchNotificationCount()
  }, [user?.email])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user?.email) return
    
    const interval = setInterval(() => {
      fetchNotificationCount()
    }, 30000) // 30 seconds
    
    return () => clearInterval(interval)
  }, [user?.email])

  // Refresh when returning to notifications page
  useEffect(() => {
    if (location.pathname === '/notifications') {
      fetchNotificationCount()
    }
  }, [location.pathname])

  const isActive = (path) => location.pathname === path

  const studentNav = [
    { path: "/search", label: "Search Books" },
    { path: "/my-books", label: "My Shelf" },
    { path: "/reserve", label: "Reserve" },
    { path: "/help", label: "Help" },
  ]

  const librarianNav = [
    { path: "/search", label: "Search Books" },
    { path: "/librarian/dashboard", label: "My Shelf" },
    { path: "/librarian/requests", label: "Reserve" },
    { path: "/help", label: "Help" },
  ]

  const directorNav = [
    { path: "/search", label: "Search Books" },
    { path: "/director/dashboard", label: "My Shelf" },
    { path: "/director/reports", label: "Reserve" },
    { path: "/help", label: "Help" },
  ]

  const guestNav = [
    { path: "/search", label: "Search Books" },
  ]

  const userRole = user?.role || user?.userRole || null
  const navItems = userRole === "librarian" ? librarianNav : userRole === "director" ? directorNav : user ? studentNav : guestNav

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <svg className="header-logo-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <h2>IITShelf</h2>
        </Link>

        {/* Top navigation */}
        <nav className="top-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className={`top-nav-item ${isActive(item.path) ? "active" : ""}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <Link to="/notifications" className="header-icon-btn notification-bell-wrapper">
                <svg className="notification-bell-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  {unreadCount > 0 && <circle className="notification-bell-dot" cx="18" cy="6" r="2" fill="#ef4444"/>}
                </svg>
                {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
              </Link>

              <div className="header-user">
                <Link to="/profile" className="header-avatar-link" title="View profile">
                  {user.avatar ? (
                    <img src={user.avatar} alt={`${user.name} avatar`} className="header-avatar-img" />
                  ) : (
                    <div className="header-avatar-fallback">{user.name ? user.name.charAt(0).toUpperCase() : "U"}</div>
                  )}
                </Link>

                <div className="header-user-info">
                  <div className="header-role-badge" data-role={userRole}>
                    {userRole ? userRole.toUpperCase() : 'USER'}
                  </div>
                  <div className="header-user-greeting">
                    Hello, {user.name || 'User'}
                  </div>
                </div>

                <div className="header-user-controls">
                  <button onClick={handleLogout} className="btn btn-sm btn-secondary">
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-sm btn-secondary">
                Register
              </Link>
              <Link to="/login" className="btn btn-sm btn-primary">
                Login
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
