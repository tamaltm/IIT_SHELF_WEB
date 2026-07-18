"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import "./DirectorDashboard.css"

function DirectorDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    activeLoans: 0,
    overdueBooks: 0,
    pendingRequests: 0,
    totalFines: 0,
    totalBorrowed: 0,
    borrowLimit: 5
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDirectorData()
    fetchUserBorrowedBooks()
  }, [user])

  const fetchDirectorData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/librarian/dashboard_stats.php')
      const data = await response.json()
      
      if (data.success) {
        setStats(prev => ({
          ...prev,
          totalBooks: data.stats.totalBooks || 0,
          totalCopies: data.stats.totalCopies || 0,
          activeLoans: data.stats.issuedBooks || 0,
          overdueBooks: data.stats.overdueBooks || 0,
          pendingRequests: data.stats.pendingRequests || 0,
          totalFines: data.stats.finesToday || 0
        }))
      }
    } catch (error) {
      console.error('Error fetching director data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchUserBorrowedBooks = async () => {
    if (user?.email) {
      try {
        const response = await fetch(`/api/auth/get_student_dashboard.php?email=${encodeURIComponent(user.email)}`)
        const data = await response.json()
        
        if (data.success) {
          setStats(prev => ({
            ...prev,
            totalBorrowed: data.stats.totalBorrowed || 0
          }))
        }
      } catch (error) {
        console.error('Error fetching borrowed books:', error)
      }
    }
  }

  return (
    <div className="director-dashboard-page">
      <Header user={user} onLogout={onLogout} />

      <div className="director-container">
        {/* Welcome Header */}
        <div className="welcome-header">
          <div>
            <h1 className="welcome-title">Executive Dashboard</h1>
            <p className="welcome-subtitle">Overview of library operations and your activity</p>
          </div>
          <div className="welcome-stats">
            <div className="header-stat">
              <span className="header-stat-value">{loading ? '...' : stats.totalBorrowed}/{stats.borrowLimit}</span>
              <span className="header-stat-label">My Books</span>
            </div>
            <div className="header-stat">
              <span className="header-stat-value">{loading ? '...' : stats.activeLoans}</span>
              <span className="header-stat-label">Active Loans</span>
            </div>
          </div>
        </div>

        {/* System Overview Stats */}
        <h2 className="section-title">System Overview</h2>
        <div className="stats-grid">
          <div className="stat-card" data-variant="blue">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <div className="stat-label">Total Books</div>
              <div className="stat-value">{loading ? '...' : stats.totalBooks}</div>
            </div>
          </div>

          <div className="stat-card" data-variant="green">
            <div className="stat-icon">📖</div>
            <div className="stat-content">
              <div className="stat-label">Active Loans</div>
              <div className="stat-value">{loading ? '...' : stats.activeLoans}</div>
            </div>
          </div>

          <div className="stat-card" data-variant="amber">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <div className="stat-label">Overdue Books</div>
              <div className="stat-value">{loading ? '...' : stats.overdueBooks}</div>
            </div>
          </div>

          <div className="stat-card" data-variant="rose">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-label">Pending Requests</div>
              <div className="stat-value">{loading ? '...' : stats.pendingRequests}</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions-section">
          <h2 className="section-title">Quick Actions</h2>
          <div className="quick-actions-grid">
            <button className="action-btn" onClick={() => navigate("/director/reports")}>
              <span className="action-icon">📊</span>
              <span className="action-label">Generate Reports</span>
            </button>
            <button className="action-btn" onClick={() => navigate("/director/history")}>
              <span className="action-icon">📜</span>
              <span className="action-label">View History</span>
            </button>
            <button className="action-btn" onClick={() => navigate("/search")}>
              <span className="action-icon">🔍</span>
              <span className="action-label">Search Books</span>
            </button>
            <button className="action-btn" onClick={() => navigate("/my-books")}>
              <span className="action-icon">📚</span>
              <span className="action-label">My Books</span>
            </button>
          </div>
        </div>
      </div>

      <BottomNav userRole="director" />
    </div>
  )
}

export default DirectorDashboard
