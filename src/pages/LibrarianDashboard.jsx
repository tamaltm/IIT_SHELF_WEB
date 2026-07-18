"use client"
import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import "./LibrarianDashboard.css"

function LibrarianDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalCopies: 0,
    availableCopies: 0,
    issuedBooks: 0,
    overdueBooks: 0,
    pendingRequests: 0,
    finesToday: 0,
    borrowGrowth: 0
  })
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/auth/get_notifications.php?email=${encodeURIComponent(user.email)}&limit=5`)
      const data = await response.json()
      
      if (data.success) {
        // Show only unread notifications, limit to 5
        const unread = (data.notifications || []).filter(n => !n.is_read).slice(0, 5)
        setNotifications(unread)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Librarian stats endpoint
      const response = await fetch('/api/librarian/dashboard_stats.php')
      const data = await response.json()
      
      if (data.success) {
        const s = data.stats || {}
        setStats({
          // Map backend snake_case to frontend camelCase; default to 0 if absent
          totalBooks: s.total_books ?? 0,
          totalCopies: s.total_copies ?? 0,
          availableCopies: s.available_copies ?? 0,
          issuedBooks: s.issued_books ?? 0,
          overdueBooks: s.overdue_books ?? 0,
          pendingRequests: s.pending_requests ?? 0,
          finesToday: s.fines_collected_today ?? 0,
          borrowGrowth: s.borrow_growth ?? 0
        })
      } else {
        console.error('Failed to fetch dashboard data:', data.message)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigateToRequests = () => {
    navigate("/librarian/requests")
  }

  return (
    <div className="librarian-dashboard-page">
      <Header user={user} onLogout={onLogout} />

      <div className="librarian-container">
        {/* Welcome Header */}
        <div className="welcome-header">
          <div>
            <h1 className="welcome-title">Welcome, {user?.name || 'Librarian'}!</h1>
            <p className="welcome-subtitle">Manage library operations and assist patrons</p>
          </div>
          <div className="welcome-stats">
            <div className="header-stat">
              <span className="header-stat-value">{loading ? '...' : stats.pendingRequests}</span>
              <span className="header-stat-label">Pending Requests</span>
            </div>
            <div className="header-stat">
              <span className="header-stat-value">{loading ? '...' : stats.overdueBooks}</span>
              <span className="header-stat-label">Overdue Books</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card" data-variant="blue">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <div className="stat-label">Total Books</div>
              <div className="stat-value">{loading ? '...' : stats.totalBooks}</div>
              <div className="stat-sublabel">{loading ? '' : `${stats.totalCopies} copies total`}</div>
            </div>
          </div>

          <div className="stat-card" data-variant="amber">
            <div className="stat-icon">📖</div>
            <div className="stat-content">
              <div className="stat-label">Issued Books</div>
              <div className="stat-value">{loading ? '...' : stats.issuedBooks}</div>
              <div className="stat-change positive">
                {loading ? '' : stats.borrowGrowth >= 0 
                  ? `↑ ${stats.borrowGrowth}% since last month` 
                  : `↓ ${Math.abs(stats.borrowGrowth)}% since last month`}
              </div>
            </div>
          </div>

          <div className="stat-card" data-variant="green">
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

          <div className="stat-card" data-variant="blue">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-label">Fines Collected Today</div>
              <div className="stat-value">{loading ? '...' : `৳${stats.finesToday}`}</div>
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="section">
          <h2>Pending Tasks</h2>
          <div className="pending-tasks-grid">
            <div 
              className="task-card" 
              data-variant="returns" 
              onClick={() => navigate("/librarian/borrowed-books")}
              style={{ cursor: 'pointer' }}
            >
              <div className="task-count badge">{loading ? '...' : stats.issuedBooks}</div>
              <div className="task-label">Process Returns</div>
            </div>
            <div 
              className="task-card" 
              data-variant="requests" 
              onClick={handleNavigateToRequests}
              style={{ cursor: 'pointer' }}
            >
              <div className="task-count badge">{loading ? '...' : stats.pendingRequests}</div>
              <div className="task-label">Borrow Requests</div>
            </div>
            <div 
              className="task-card" 
              data-variant="payments" 
              onClick={() => navigate("/librarian/borrowed-books")}
              style={{ cursor: 'pointer' }}
            >
              <div className="task-count badge">{loading ? '...' : stats.overdueBooks}</div>
              <div className="task-label">Overdue Books</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="section">
          <h2>Quick Actions</h2>
          <div className="quick-actions-grid">
            <button className="action-card" data-variant="inventory" onClick={() => navigate("/librarian/inventory")}>
              <div className="action-icon">📦</div>
              <div className="action-label">Manage Inventory</div>
            </button>
            <button className="action-card" data-variant="search" onClick={() => navigate("/search")}>
              <div className="action-icon">🔍</div>
              <div className="action-label">Search Books</div>
            </button>
            <button className="action-card" data-variant="history" onClick={() => navigate("/librarian/history")}>
              <div className="action-icon">📜</div>
              <div className="action-label">History</div>
            </button>
            <button className="action-card" data-variant="reports" onClick={() => navigate("/librarian/reports")}>
              <div className="action-icon">📊</div>
              <div className="action-label">Generate Report</div>
            </button>
          </div>
        </div>

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <div className="section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2>Recent Notifications</h2>
              <button 
                className="view-all-btn"
                onClick={() => navigate("/notifications")}
              >
                View All →
              </button>
            </div>
            <div className="notifications-list">
              {notifications.map((notification) => (
                <div 
                  key={notification.notification_id} 
                  className={`notification-item ${notification.type.toLowerCase()}`}
                  onClick={() => navigate("/notifications")}
                >
                  <div className="notification-icon">
                    {notification.type === 'PaymentReceived' ? '💰' : 
                     notification.type === 'BookReturned' ? '📥' :
                     notification.type === 'NewRequest' ? '📬' : '🔔'}
                  </div>
                  <div className="notification-content">
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">
                      {new Date(notification.sent_at).toLocaleString()}
                    </div>
                  </div>
                  {!notification.is_read && <div className="unread-badge"></div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav userRole="librarian" />
    </div>
  )
}

export default LibrarianDashboard
