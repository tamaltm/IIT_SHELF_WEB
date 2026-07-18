"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import { notificationsApi } from "../api/notifications"
import "./Notifications.css"

function Notifications({ user, userRole, onLogout }) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.email) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      if (!user?.email) return

      const data = await notificationsApi.getNotifications(user.email)
      if (data.success) {
        const mapped = (data.notifications || []).map((n) => ({
          id: n.notification_id || n.id,
          type: n.type || 'System',
          message: n.message || '',
          sentAt: n.sent_at || n.sentAt,
          isRead: Boolean(n.is_read),
        }))
        setNotifications(mapped)
      } else {
        console.error('Failed to fetch notifications:', data.message)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (id) => {
    try {
      const data = await notificationsApi.markAsRead(id, user.email)
      
      if (data.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === id ? { ...notif, isRead: true } : notif
          )
        )
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const data = await notificationsApi.markAllAsRead(user.email)
      
      if (data.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, isRead: true }))
        )
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const handleDelete = async (id) => {
    try {
      const data = await notificationsApi.deleteNotification(id, user.email)
      
      if (data.success) {
        // Remove from local state
        setNotifications(prev => prev.filter(notif => notif.id !== id))
      } else {
        console.error('Failed to delete notification:', data.message)
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) {
      return
    }

    try {
      // Delete all notifications one by one
      const deletePromises = notifications.map(notif => 
        notificationsApi.deleteNotification(notif.id, user.email)
      )
      
      await Promise.all(deletePromises)
      
      // Clear local state
      setNotifications([])
    } catch (error) {
      console.error('Error deleting all notifications:', error)
      // Refetch to ensure consistency
      fetchNotifications()
    }
  }

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    if (!notification.isRead) {
      handleMarkAsRead(notification.id)
    }

    // Redirect based on notification type
    switch (notification.type) {
      case 'DueDateToday':
      case 'DueDateClose':
      case 'Overdue':
        // Redirect to My Books page where user can see borrowed books
        navigate('/my-books')
        break
      case 'PaymentConfirmation':
      case 'FineNotification':
        // Redirect to payments/fines page
        navigate('/payments')
        break
      case 'PasswordChanged':
        // Redirect to profile page
        navigate('/profile')
        break
      case 'ReservedBookAvailable':
        // Redirect to reservations or search page
        navigate('/search')
        break
      case 'BookRequestApproved':
      case 'BookRequestRejected':
        // Redirect to search or dashboard
        navigate('/home')
        break
      case 'ReturnApproved':
      case 'ReturnRejected':
        // Redirect to My Books - returned tab
        navigate('/my-books')
        break
      default:
        // For other notifications, stay on notifications page
        break
    }
  }

  const getNotificationType = (type) => {
    switch (type) {
      case 'ReservedBookAvailable':
        return 'success'
      case 'DueDateReminder':
      case 'DueDateToday':
      case 'DueDateClose':
        return 'warning'
      case 'Overdue':
      case 'ReturnRejected':
        return 'danger'
      case 'PaymentConfirmation':
      case 'ReturnApproved':
      case 'BookRequestApproved':
        return 'success'
      default:
        return 'info'
    }
  }

  const formatTime = (value) => {
    if (!value) return ''
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return value

    const diffMs = Date.now() - dt.getTime()
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return dt.toLocaleDateString()
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case "success":
        return (
          <svg className="notif-icon success-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" className="icon-bg" />
            <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-mark" />
          </svg>
        )
      case "warning":
        return (
          <svg className="notif-icon warning-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 20h20L12 2z" className="icon-bg" />
            <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="icon-mark" />
          </svg>
        )
      case "danger":
        return (
          <svg className="notif-icon danger-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" className="icon-bg" />
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="icon-mark" />
          </svg>
        )
      default:
        return (
          <svg className="notif-icon info-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" className="icon-bg" />
            <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="icon-mark" />
          </svg>
        )
    }
  }

  return (
    <div className="notifications-page">
      <Header user={user} onLogout={onLogout} />

      <div className="notifications-container">
        <div className="notifications-header">
          <h1>Notifications</h1>
          <div className="header-actions">
            {notifications.some(n => !n.isRead) && (
              <button className="btn btn-sm btn-secondary" onClick={handleMarkAllAsRead}>
                Mark All as Read
              </button>
            )}
            {notifications.length > 0 && (
              <button className="btn btn-sm btn-danger" onClick={handleDeleteAll}>
                Delete All
              </button>
            )}
          </div>
        </div>

        <div className="notifications-list">
          {loading ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#666'}}>
              <p>No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const notifType = getNotificationType(notification.type)
              const timeAgo = formatTime(notification.sentAt)
              
              return (
                <div 
                  key={notification.id} 
                  className={`notification-card ${notification.isRead ? "read" : "unread"}`}
                  onClick={() => handleNotificationClick(notification)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="notification-icon">{getNotificationIcon(notifType)}</div>
                  <div className="notification-content">
                    <h3>{notification.type === 'ReservedBookAvailable' ? '📚 Reserved Book Available' : 
                         notification.type === 'DueDateReminder' ? '⏰ Due Date Reminder' :
                         notification.type === 'DueDateToday' ? '⏰ Due Today' :
                         notification.type === 'DueDateClose' ? '⏰ Due Soon' : 
                         notification.type === 'Overdue' ? '⚠️ Overdue' :
                         notification.type === 'PaymentConfirmation' ? '✓ Payment Confirmed' :
                         notification.type === 'PasswordChanged' ? '🔒 Password Changed' :
                         notification.type === 'ReturnApproved' ? '✅ Return Approved' :
                         notification.type === 'ReturnRejected' ? '❌ Return Rejected' : 
                         '📢 System Notification'}</h3>
                    <p>{notification.message}</p>
                    <span className="notification-time">{timeAgo}</span>
                  </div>
                  <div className="notification-actions">
                    {!notification.isRead && (
                      <button 
                        className="btn btn-sm btn-secondary" 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(notification.id)
                        }}
                      >
                        Mark Read
                      </button>
                    )}
                    <button 
                      className="btn btn-sm btn-danger" 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(notification.id)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <BottomNav userRole={userRole} />
    </div>
  )
}

export default Notifications
