"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import { borrowApi } from "../api/borrow"
import { dashboardApi } from "../api/dashboard"
import { authApi } from "../api/auth"
import "./Dashboard.css"

function Dashboard({ user, userRole, onLogout }) {
  const [showFineModal, setShowFineModal] = useState(false)
  const navigate = useNavigate()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [unpaidFineIds, setUnpaidFineIds] = useState([])
  const [requestForm, setRequestForm] = useState({
    requester_identifier: '',
    isbn: '',
    title: '',
    author: '',
    publisher: '',
    publication_year: '',
    edition: '',
    description: '',
    resource_type: 'PDF'
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  
  const [stats, setStats] = useState({
    totalBorrowed: 0,
    borrowLimit: 2,
    outstandingFines: 0,
    overdueCount: 0,
    pendingRequests: 0,
    readyReservations: 0
  })
  const [borrowedBooks, setBorrowedBooks] = useState([])
  const [overdueBooks, setOverdueBooks] = useState([])
  const [readyReservations, setReadyReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState(user?.name || user?.fullName || '')

  useEffect(() => {
    if (user && user.email) {
      fetchDashboardData()
      fetchReservations()
      // Load profile name from backend if not present in user state
      if (!displayName) {
        authApi.getProfile(user.email)
          .then((res) => {
            if (res?.success && res?.user?.name) {
              setDisplayName(res.user.name)
            }
          })
          .catch(() => {})
      }
    }
  }, [user, userRole, displayName])

  const processPayment = async () => {
    if (stats.outstandingFines === 0) {
      alert('No fines to pay');
      return;
    }

    try {
      setProcessingPayment(true);
      
      // First, fetch unpaid fines
      const finesData = await dashboardApi.getUserFines(user.email);
      
      if (!finesData.success) {
        alert('Error fetching fines');
        setProcessingPayment(false);
        return;
      }
      
      const unpaid = finesData.fines.filter(f => f.paid === 0 || f.paid === '0');
      if (unpaid.length === 0) {
        alert('No unpaid fines found');
        setProcessingPayment(false);
        return;
      }
      
      const fineIds = unpaid.map(f => parseInt(f.fine_id));
      
      // Now process payment
      const data = await dashboardApi.processPayment(fineIds, user.email, 'bkash');

      if (data.success) {
        alert(`Payment successful! Transaction ID: ${data.transaction_id}`);
        setShowFineModal(false);
        // Reload dashboard data
        fetchDashboardData();
      } else {
        alert(`Payment failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const fetchUnpaidFines = async () => {
    try {
      const data = await dashboardApi.getUserFines(user.email);
      
      if (data.success) {
        const unpaid = data.fines.filter(f => f.paid === '0');
        const fineIds = unpaid.map(f => parseInt(f.fine_id));
        setUnpaidFineIds(fineIds);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  useEffect(() => {
    if (showFineModal && user?.email) {
      fetchUnpaidFines();
    }
  }, [showFineModal, user?.email]);

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Use the proven borrowApi.getUserTransactions instead of custom dashboard endpoint
      const data = await borrowApi.getUserTransactions(user.email)
      
      console.log('Dashboard API Response:', data)
      
      if (data.success) {
        const transactions = data.transactions || []
        
        // Count borrowed and overdue
        const borrowed = transactions.filter(t => t.status === 'Borrowed' || t.status === 'Overdue')
        const overdue = transactions.filter(t => t.status === 'Overdue')
        
        // Format books for display
        const now = new Date()
        const borrowed_books = borrowed.map(t => {
          const dueDate = t.due_date ? new Date(t.due_date) : null
          const dueInDays = dueDate ? Math.max(0, Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))) : '-'
          return {
            id: t.transaction_id,
            isbn: t.isbn,
            title: t.book_title || t.title || 'Unknown',
            author: t.author || t.book_author || '',
            cover: t.pic_path || t.cover_url || '',
            dueDate: t.due_date,
            dueInDays,
            status: t.status
          }
        })
        
        // Update stats with correct borrow limit based on role
        const borrowLimit = (userRole === 'Teacher' || userRole === 'Director') ? 5 : 2
        setStats({
          totalBorrowed: borrowed.length,
          borrowLimit: borrowLimit,
          outstandingFines: 0, // Will fetch separately from payments API
          overdueCount: overdue.length,
          pendingRequests: 0,
          readyReservations: 0
        })
        
        setBorrowedBooks(borrowed_books)
        setOverdueBooks(overdue.map(t => ({
          id: t.transaction_id,
          isbn: t.isbn,
          title: t.book_title || t.title || 'Unknown',
          dueDate: t.due_date,
          daysOverdue: t.days_overdue || 0,
          fineAmount: parseFloat(t.fine_amount || 0),
          status: 'Overdue'
        })))
        
        console.log('Updated stats:', { totalBorrowed: borrowed.length, borrowLimit })
        console.log('Borrowed books:', borrowed_books)
      } else {
        console.error('Failed to fetch dashboard data:', data.message)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const fetchReservations = async () => {
    try {
      const data = await dashboardApi.getUserReservations(user.email)
      
      if (data.success) {
        const ready = (data.reservations || []).filter(r => r.isReady)
        setReadyReservations(ready)
        setStats(prev => ({ ...prev, readyReservations: ready.length }))
      }
    } catch (error) {
      console.error('Error fetching reservations:', error)
    }
  }

  const handleRequestSubmit = async (e) => {
    e.preventDefault()
    
    if (!requestForm.title || !requestForm.isbn || !selectedFile) {
      alert('Please provide book title, ISBN, and select a PDF file')
      return
    }
    
    setSubmitting(true)
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('requester_identifier', user.email)
      formData.append('isbn', requestForm.isbn)
      formData.append('title', requestForm.title)
      formData.append('author', requestForm.author || '')
      formData.append('publisher', requestForm.publisher || '')
      formData.append('publication_year', requestForm.publication_year || '')
      formData.append('edition', requestForm.edition || '')
      formData.append('description', requestForm.description || '')
      formData.append('resource_type', requestForm.resource_type)
      formData.append('pdf_file', selectedFile)
      
      const data = await dashboardApi.submitResourceRequest(formData)
      
      if (data.success) {
        alert('✓ Digital resource request submitted successfully! Librarian will review it soon.')
        setShowUploadModal(false)
        setRequestForm({
          requester_identifier: '',
          isbn: '',
          title: '',
          author: '',
          publisher: '',
          publication_year: '',
          edition: '',
          description: '',
          resource_type: 'PDF'
        })
        setSelectedFile(null)
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-page">
      <Header user={user} onLogout={onLogout} />

      <div className="dashboard-container">
        {/* Welcome Header */}
        <div className="welcome-header">
          <div>
            <h1 className="welcome-title">Welcome back, {displayName || user?.name || user?.fullName || 'User'}!</h1>
          </div>
          <div className="welcome-role-badge">
            <span className={`role-badge role-${(userRole || 'student').toLowerCase()}`}>
              {userRole || 'Student'}
            </span>
          </div>
        </div>

        {/* Outstanding Fines and Overdue Books Side by Side */}
        <div className="alerts-grid">
          {/* Reserved Books Ready Alert */}
          {stats.readyReservations > 0 && (
            <div className="alert alert-success compact-alert">
              <div className="alert-content-vertical">
                <div>
                  <strong>Reserved Books Ready!</strong>
                  <p className="compact-text">{stats.readyReservations} book{stats.readyReservations > 1 ? 's' : ''} ready to collect</p>
                </div>
                <button className="btn-compact btn-success" onClick={() => navigate("/my-books", { state: { activeTab: 'reserved' } })}>
                  Collect Now
                </button>
              </div>
            </div>
          )}
          
          {/* Outstanding Fines Alert */}
          {stats.outstandingFines > 0 && (
            <div className="alert alert-warning compact-alert">
              <div className="alert-content-vertical">
                <div>
                  <strong>Outstanding Fines</strong>
                  <div className="fine-amount-compact">BDT {loading ? '...' : stats.outstandingFines.toFixed(2)}</div>
                </div>
                <button className="btn-compact btn-primary" onClick={() => setShowFineModal(true)}>
                  Pay Now
                </button>
              </div>
            </div>
          )}

          {/* Overdue Books Alert */}
          {stats.overdueCount > 0 && (
            <div className="alert alert-danger compact-alert">
              <div className="alert-content-vertical">
                <div>
                  <strong>Overdue Books</strong>
                  <p className="compact-text">{loading ? '...' : `${stats.overdueCount} book${stats.overdueCount > 1 ? 's' : ''} overdue. Return ASAP to avoid fines.`}</p>
                </div>
                <button className="btn-compact btn-danger" onClick={() => navigate("/my-books")}>Return</button>
              </div>
            </div>
          )}
        </div>

        {/* Books Borrowed Card */}
        <div className="card compact-card">
          <div className="card-header-compact">
            <h3>Books Borrowed</h3>
            <div className="borrow-stats-compact">
              <span className="borrow-count-compact">
                {loading ? '...' : `${stats.totalBorrowed}/${stats.borrowLimit}`}
              </span>
              <div className="borrow-progress-compact">
                <div className="borrow-progress-bar" style={{ width: `${(stats.totalBorrowed / stats.borrowLimit) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue Books - Due Date Reminders */}
        {!loading && overdueBooks.map((book) => (
          <div key={book.id} className="due-book-card" style={{borderLeft: '4px solid #dc2626'}}>
            <div className="due-book-info">
              <div className="due-date-label" style={{color: '#dc2626'}}>Overdue: {book.dueDate} ({book.daysOverdue} days)</div>
              <div className="due-book-title">{book.title}</div>
              <div style={{fontSize: '0.875rem', color: '#dc2626', marginTop: '4px'}}>Fine: BDT {book.fineAmount.toFixed(2)}</div>
            </div>
            <button className="btn-compact btn-danger" onClick={() => navigate("/my-books")}>Return</button>
          </div>
        ))}

        {/* Currently Borrowed */}
        <div className="card">
          <h3 className="card-header">Currently Borrowed</h3>
          {loading ? (
            <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>Loading...</div>
          ) : borrowedBooks.length === 0 ? (
            <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
              No books currently borrowed
            </div>
          ) : (
            borrowedBooks.map((book) => (
              <div key={book.id} className="borrowed-book-item">
                <img 
                  src={book.cover || "/placeholder.svg"} 
                  alt={book.title} 
                  className="book-cover-small"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/placeholder.svg";
                  }}
                />
                <div className="borrowed-book-details">
                  <h4>{book.title}</h4>
                  <p className="text-secondary">{book.author}</p>
                  <span className="badge badge-primary">Due in {book.dueInDays} days</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <button className="quick-action-btn" onClick={() => navigate("/search") }>
              <span className="quick-action-icon">🔍</span>
              <span>Search Books</span>
            </button>
            <button className="quick-action-btn" onClick={() => navigate("/my-books") }>
              <span className="quick-action-icon">📑</span>
              <span>Reserve Queue</span>
            </button>
            <button className="quick-action-btn" onClick={() => setShowUploadModal(true)}>
              <span className="quick-action-icon">📤</span>
              <span>Request Digital Resource</span>
            </button>
            {userRole === "professor" && (
              <>
                <button className="quick-action-btn" onClick={() => navigate("/dashboard") }>
                  <span className="quick-action-icon">📊</span>
                  <span>Generate Report</span>
                </button>
                <button className="quick-action-btn" onClick={() => navigate("/dashboard") }>
                  <span className="quick-action-icon">📜</span>
                  <span>History</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Fine Payment Modal */}
        {showFineModal && (
          <div className="modal-overlay" onClick={() => !processingPayment && setShowFineModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px'}}>
              <div className="modal-header">
                <h3>Pay Outstanding Fines</h3>
                <button className="modal-close" onClick={() => setShowFineModal(false)} disabled={processingPayment}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div style={{
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{fontSize: '0.9rem', color: '#666', marginBottom: '8px'}}>Total Amount</div>
                  <div style={{fontSize: '2rem', fontWeight: 'bold', color: '#2563eb'}}>
                    {stats.outstandingFines.toFixed(2)} <span style={{fontSize: '1.2rem'}}>BDT</span>
                  </div>
                  <div style={{fontSize: '0.85rem', color: '#666', marginTop: '8px'}}>
                    {unpaidFineIds.length || 1} fine{(unpaidFineIds.length || 1) > 1 ? 's' : ''} to be paid
                  </div>
                </div>

                <div style={{
                  padding: '15px',
                  backgroundColor: '#fff3cd',
                  border: '1px solid #ffc107',
                  borderRadius: '8px',
                  marginBottom: '20px'
                }}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <span style={{fontSize: '1.5rem'}}>📱</span>
                    <div>
                      <div style={{fontWeight: '600', marginBottom: '4px'}}>bKash Payment</div>
                      <div style={{fontSize: '0.85rem', color: '#856404'}}>
                        You will be paying via bKash payment gateway
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{fontSize: '0.85rem', color: '#666', lineHeight: '1.6'}}>
                  <strong>Payment Details:</strong>
                  <ul style={{margin: '8px 0', paddingLeft: '20px'}}>
                    <li>Outstanding fines: {stats.outstandingFines.toFixed(2)} BDT</li>
                  </ul>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowFineModal(false)}
                  disabled={processingPayment}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={processPayment}
                  disabled={processingPayment}
                >
                  {processingPayment ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Request Digital Resource Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Digital Resource</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-info">
                📚 Request a new digital resource for the library. Provide complete information below.
                The librarian will review and approve your request.
              </p>
              <form onSubmit={handleRequestSubmit} className="request-form">
                <div className="form-divider">
                  <h4>Book Information</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Book Title *</label>
                    <input 
                      type="text" 
                      placeholder="Enter book title"
                      value={requestForm.title}
                      onChange={(e) => setRequestForm({...requestForm, title: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Author *</label>
                    <input 
                      type="text" 
                      placeholder="Author name"
                      value={requestForm.author}
                      onChange={(e) => setRequestForm({...requestForm, author: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>ISBN *</label>
                    <input 
                      type="text" 
                      placeholder="978-XXXXXXXXXX"
                      value={requestForm.isbn}
                      onChange={(e) => setRequestForm({...requestForm, isbn: e.target.value})}
                      required
                    />
                    <small className="hint">Required for digital resource</small>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Publisher</label>
                    <input 
                      type="text" 
                      placeholder="Publisher name"
                      value={requestForm.publisher}
                      onChange={(e) => setRequestForm({...requestForm, publisher: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Publication Year</label>
                    <input 
                      type="number" 
                      placeholder="2024"
                      min="1900"
                      max="2100"
                      value={requestForm.publication_year}
                      onChange={(e) => setRequestForm({...requestForm, publication_year: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Edition</label>
                    <input 
                      type="text" 
                      placeholder="e.g., 3rd Edition"
                      value={requestForm.edition}
                      onChange={(e) => setRequestForm({...requestForm, edition: e.target.value})}
                    />
                  </div>
                </div>

                <div className="form-divider">
                  <h4>Digital Resource Details</h4>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>Resource Type *</label>
                    <select 
                      value={requestForm.resource_type}
                      onChange={(e) => setRequestForm({...requestForm, resource_type: e.target.value})}
                      required
                    >
                      <option value="PDF">PDF</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Upload PDF File *</label>
                  <input 
                    type="file" 
                    accept=".pdf,application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    required
                  />
                  {selectedFile && (
                    <small className="hint" style={{color: '#16a34a'}}>
                      ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </small>
                  )}
                  <small className="hint">Maximum file size: 50MB</small>
                </div>
                
                <div className="form-group">
                  <label>Description/Reason</label>
                  <textarea 
                    placeholder="Why is this resource needed? Course requirements, research, etc..."
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({...requestForm, description: e.target.value})}
                    rows="3"
                  />
                </div>
                
                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowUploadModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <BottomNav userRole={userRole} />
    </div>
  )
}

export default Dashboard
