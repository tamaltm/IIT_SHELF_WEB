"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import { api } from "../api/client"
import "./LibrarianRequests.css"

function LibrarianRequests({ user, onLogout }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("borrow")
  const [searchStudentId, setSearchStudentId] = useState("")
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [borrowRequests, setBorrowRequests] = useState([])
  const [returnRequests, setReturnRequests] = useState([])
  const [reserveRequests, setReserveRequests] = useState([])
  const [additionRequests, setAdditionRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [damageNotes, setDamageNotes] = useState({})
  const [damageEditorFor, setDamageEditorFor] = useState(null)
  const [editorText, setEditorText] = useState("")
  const [showCopySelectionModal, setShowCopySelectionModal] = useState(false)
  const [availableCopies, setAvailableCopies] = useState([])
  const [selectedRequestForCopy, setSelectedRequestForCopy] = useState(null)
  const [selectedCopyId, setSelectedCopyId] = useState(null)
  const [showReturnApprovalModal, setShowReturnApprovalModal] = useState(false)
  const [selectedReturnRequest, setSelectedReturnRequest] = useState(null)
  const [returnBookCondition, setReturnBookCondition] = useState('good')
  const [returnCompensationAmount, setReturnCompensationAmount] = useState('')
  const [returnCompensationNote, setReturnCompensationNote] = useState('')
  const [showAdditionDetailsModal, setShowAdditionDetailsModal] = useState(false)
  const [selectedAdditionRequest, setSelectedAdditionRequest] = useState(null)
  const [additionRequestDetails, setAdditionRequestDetails] = useState(null)
  const [loadingAdditionDetails, setLoadingAdditionDetails] = useState(false)

  // Fetch pending borrow requests
  useEffect(() => {
    fetchBorrowRequests()
    fetchReturnRequests()
    fetchReserveRequests()
    fetchAdditionRequests()
  }, [])

  const openDamageEditor = (requestId) => {
    setDamageEditorFor(requestId)
    setEditorText(damageNotes[requestId] || "")
  }

  const closeDamageEditor = () => {
    setDamageEditorFor(null)
    setEditorText("")
  }

  const saveDamageNotes = () => {
    if (damageEditorFor !== null && editorText.trim()) {
      setDamageNotes(prev => ({ ...prev, [damageEditorFor]: editorText.trim() }))
      closeDamageEditor()
    }
  }

  const fetchBorrowRequests = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/librarian/get_requests.php', {
        params: { type: 'borrow', search: searchStudentId }
      })
      if (data.success) {
        // Backend returns items with fields: request_id, isbn, request_date, name, email, title,
        // expires_in_hours, expires_in_minutes, is_expired
        setBorrowRequests(data.items || [])
      }
    } catch (error) {
      console.error('Error fetching borrow requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReturnRequests = async () => {
    try {
      const data = await api.get('/api/librarian/get_requests.php', {
        params: { type: 'return', search: searchStudentId }
      })
      if (data.success) {
        // Map to fields used in UI
        const mapped = (data.items || []).map((r) => ({
          returnRequestId: r.transaction_id,
          transactionId: r.transaction_id,
          requesterName: r.name,
          requestedBy: r.email,
          requestedAt: r.requested_at,
          title: r.title,
          author: '',
          copyId: r.copy_id || undefined,
          isbn: r.isbn,
          issueDate: r.issue_date,
          dueDate: r.due_date,
        }))
        setReturnRequests(mapped)
      }
    } catch (error) {
      console.error('Error fetching return requests:', error)
    }
  }

  const fetchReserveRequests = async () => {
    try {
      const data = await api.get('/api/librarian/get_requests.php', {
        params: { type: 'reserve', search: searchStudentId }
      })
      if (data.success) {
        const mapped = (data.items || []).map((r) => ({
          id: r.reservation_id,
          studentId: r.email,
          queuePosition: r.queue_position,
          bookName: r.title,
          isbn: r.isbn,
          time: r.created_at,
        }))
        setReserveRequests(mapped)
      }
    } catch (error) {
      console.error('Error fetching reserve requests:', error)
    }
  }

  const fetchAdditionRequests = async () => {
    try {
      const data = await api.get('/api/librarian/get_requests.php', {
        params: { type: 'addition', search: searchStudentId }
      })
      if (data.success) {
        const mapped = (data.items || []).map((r) => ({
          id: r.request_id,
          studentId: r.email,
          bookName: r.requested_title,
          time: r.approved_at || r.created_at,
        }))
        setAdditionRequests(mapped)
      }
    } catch (error) {
      console.error('Error fetching addition requests:', error)
    }
  }

  const handleApprove = async (request) => {
    // If multiple copies available, show copy selection modal
    if (request.isbn) {
      try {
        const data = await api.get('/api/librarian/get_available_copies.php', {
          params: { isbn: request.isbn }
        })
        if (data.success && (data.copies?.length || 0) > 1) {
          setAvailableCopies(data.copies)
          setSelectedRequestForCopy(request)
          setSelectedCopyId(null)
          setShowCopySelectionModal(true)
          return
        } else if (data.success && (data.copies?.length || 0) === 1) {
          // Auto-select single copy
          await approveWithCopy(request, data.copies[0].copy_id)
          return
        }
      } catch (error) {
        // Error handled silently
      }
    }
    
    // Default approval without specific copy
    await approveWithCopy(request, null)
  }

  const approveWithCopy = async (request, copyId) => {
    // Determine loan period based on role
    const isTeacher = (request.requester_role === 'Teacher' || request.requester_role === 'Director')
    const loanDays = isTeacher ? 15 : 7
    const roleDisplay = isTeacher ? 'Teacher/Director' : 'Student'
    
    const confirmMessage = copyId 
      ? `Approve borrow request?\n\n${roleDisplay}: ${request.requester_name} (${request.student_roll})\nBook: ${request.title}\nCopy: ${copyId}\n\nThis will issue the book for ${loanDays} days.`
      : `Approve borrow request?\n\n${roleDisplay}: ${request.requester_name} (${request.student_roll})\nBook: ${request.title}\n\nThis will issue the book for ${loanDays} days.`
    
    const confirmApprove = window.confirm(confirmMessage)
    
    if (!confirmApprove) return

    try {
      const requestBody = {
        request_id: request.request_id,
        copy_id: copyId
      }
      const data = await api.post('/api/librarian/approve_borrow_request.php', requestBody)
      
      if (data.success) {
        alert(`✓ Request approved!\n\nBook issued to ${request.requester_name}\nCopy ID: ${data.copy_id}\nDue date: ${loanDays} days from today`)
        setShowCopySelectionModal(false)
        setSelectedRequestForCopy(null)
        setSelectedCopyId(null)
        fetchBorrowRequests() // Refresh list
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      alert('Network error. Please try again.')
    }
  }

  const handleReject = async (request) => {
    const confirmReject = window.confirm(
      `Reject borrow request?\n\nStudent: ${request.requester_name}\nBook: ${request.title}\n\nThis action cannot be undone.`
    )
    
    if (!confirmReject) return

    try {
      const response = await fetch('/api/librarian/reject_borrow_request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: request.request_id
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert('✓ Request rejected')
        fetchBorrowRequests() // Refresh list
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      alert('Network error. Please try again.')
    }
  }

  const handleReturnApprove = (request) => {
    setSelectedReturnRequest(request)
    setReturnBookCondition('good')
    setReturnCompensationAmount('')
    setReturnCompensationNote('')
    setShowReturnApprovalModal(true)
  }

  const confirmReturnApproval = async () => {
    if (!selectedReturnRequest) return

    // Validate compensation amount if condition is not good
    if (returnBookCondition !== 'good' && (!returnCompensationAmount || parseFloat(returnCompensationAmount) <= 0)) {
      alert('Please enter a valid compensation amount for damaged/lost books')
      return
    }

    try {
      const data = await api.post('/api/borrow/return_book.php', {
        transaction_id: selectedReturnRequest.transactionId,
        book_condition: returnBookCondition,
        ...(parseFloat(returnCompensationAmount) > 0 ? { damage_fine: parseFloat(returnCompensationAmount) } : {}),
      })
      
      if (data.success) {
        alert('✓ Return approved successfully')
        setShowReturnApprovalModal(false)
        setSelectedReturnRequest(null)
        fetchReturnRequests()
      } else {
        alert('Error: ' + (data.message || 'Failed to approve return'))
      }
    } catch (error) {
      alert('Error approving return')
    }
  }

  const handleReturnReject = async (request) => {
    const confirmReject = window.confirm(
      `Reject return request?\n\nStudent: ${request.requesterName}\nBook: ${request.title}`
    )
    
    if (!confirmReject) return
    
    // Reject flow not supported by backend endpoint; inform user
    alert('Rejecting return requests is not supported yet.')
  }

  const handleViewAdditionRequest = async (requestId) => {
    setLoadingAdditionDetails(true)
    setShowAdditionDetailsModal(true)
    
    try {
      const data = await api.get('/api/books/get_request_details.php', {
        params: { request_id: requestId }
      })
      
      if (data.success && data.item) {
        setAdditionRequestDetails(data.item)
      } else {
        alert('Failed to load request details')
        setShowAdditionDetailsModal(false)
      }
    } catch (error) {
      console.error('Error loading addition request:', error)
      alert('Error loading request details')
      setShowAdditionDetailsModal(false)
    } finally {
      setLoadingAdditionDetails(false)
    }
  }

  const handleApproveAdditionRequest = async () => {
    if (!additionRequestDetails) return
    
    const confirmApprove = window.confirm(
      `Approve addition request?\n\nBook: ${additionRequestDetails.title}\nRequested by: ${additionRequestDetails.email}\n\nThis will add the book to the library.`
    )
    
    if (!confirmApprove) return
    
    try {
      const data = await api.post('/api/books/approve_request.php', {
        request_id: additionRequestDetails.request_id,
        approved_by: user.email
      })
      
      if (data.success) {
        alert('✓ Addition request approved successfully')
        setShowAdditionDetailsModal(false)
        setAdditionRequestDetails(null)
        fetchAdditionRequests()
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error approving addition request:', error)
      alert('Error approving request')
    }
  }

  const handleDeclineAdditionRequest = async () => {
    if (!additionRequestDetails) return
    
    const reason = window.prompt('Enter reason for declining (optional):', '')
    if (reason === null) return // User cancelled
    
    try {
      const data = await api.post('/api/books/decline_request.php', {
        request_id: additionRequestDetails.request_id,
        declined_by: user.email,
        reason: reason.trim()
      })
      
      if (data.success) {
        alert('✓ Addition request declined')
        setShowAdditionDetailsModal(false)
        setAdditionRequestDetails(null)
        fetchAdditionRequests()
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error declining addition request:', error)
      alert('Error declining request')
    }
  }

  return (
    <div className="librarian-requests-page">
      <Header user={user} onLogout={onLogout} />

      <div className="requests-container">
        <h1 className="requests-title">Requests</h1>

        {/* Tabs */}
        <div className="requests-tabs">
          <button
            className={`tab-btn ${activeTab === "borrow" ? "active" : ""}`}
            onClick={() => setActiveTab("borrow")}
          >
            Borrow
          </button>
          <button
            className={`tab-btn ${activeTab === "return" ? "active" : ""}`}
            onClick={() => setActiveTab("return")}
          >
            Return
          </button>
          <button
            className={`tab-btn ${activeTab === "reserve" ? "active" : ""}`}
            onClick={() => setActiveTab("reserve")}
          >
            Reserve
          </button>
          <button
            className={`tab-btn ${activeTab === "addition" ? "active" : ""}`}
            onClick={() => setActiveTab("addition")}
          >
            Addition
          </button>
        </div>

        {/* Search */}
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search by Student ID"
            value={searchStudentId}
            onChange={(e) => setSearchStudentId(e.target.value)}
          />
        </div>

        {/* Borrow Requests */}
        {activeTab === "borrow" && (
          <div className="requests-list">
            {loading ? (
              <div className="empty-state">Loading requests...</div>
            ) : borrowRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No Pending Requests</h3>
                <p>All borrow requests have been processed</p>
              </div>
            ) : (
              borrowRequests.map((request) => (
                <div key={request.request_id} className="request-card">
                  {/* User Info Header */}
                  <div className="request-header">
                    <div className="user-avatar">
                      {(request.name || request.requester_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="user-info">
                      <div className="user-name">{request.name || request.requester_name}</div>
                      <div className="user-meta">
                        <span className="user-id">{request.email}</span>
                        <span className="meta-divider">•</span>
                        <span className="request-date">
                          {new Date(request.request_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="request-badge">Pending</div>
                  </div>

                  {/* Book Info Section */}
                  <div className="request-body">
                    <div className="book-info-section">
                      <div className="section-header">
                        <span className="section-icon">📚</span>
                        <h3 className="section-title">Book Details</h3>
                      </div>
                      <div className="book-details-grid">
                        <div className="detail-item">
                          <div className="detail-label">Title</div>
                          <div className="detail-value book-title">{request.title}</div>
                        </div>
                        <div className="detail-item">
                          <div className="detail-label">ISBN</div>
                          <div className="detail-value isbn-code">{request.isbn}</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="action-buttons">
                      <button 
                        className="btn-approve" 
                        onClick={() => handleApprove(request)}
                        disabled={false}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Approve
                      </button>
                      <button 
                        className="btn-reject" 
                        onClick={() => handleReject(request)}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Return Requests */}
        {activeTab === "return" && (
          <div className="requests-list">
            {loading ? (
              <div className="empty-state">Loading return requests...</div>
            ) : returnRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📦</div>
                <h3>No Pending Return Requests</h3>
                <p>All return requests have been processed</p>
              </div>
            ) : (
              returnRequests.map((request) => {
                // Calculate if overdue
                const dueDate = new Date(request.dueDate)
                const today = new Date()
                const isOverdue = today > dueDate
                const daysOverdue = isOverdue ? Math.floor((today - dueDate) / (1000 * 60 * 60 * 24)) : 0
                
                return (
                  <div key={request.returnRequestId} className="request-card">
                    {/* User Info Header */}
                    <div className="request-header">
                      <div className="user-avatar">
                        {request.requesterName.charAt(0).toUpperCase()}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{request.requesterName}</div>
                        <div className="user-meta">
                          <span className="user-id">{request.requestedBy}</span>
                          <span className="meta-divider">•</span>
                          <span className="request-date">
                            Requested: {new Date(request.requestedAt).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className={`request-badge ${isOverdue ? 'overdue' : ''}`}>
                        {isOverdue ? `Overdue ${daysOverdue}d` : 'On Time'}
                      </div>
                    </div>

                    {/* Book Info Section */}
                    <div className="request-body">
                      <div className="book-info-section">
                        <div className="section-header">
                          <span className="section-icon">📚</span>
                          <h3 className="section-title">Return Request</h3>
                        </div>
                        <div className="book-details-grid">
                          <div className="detail-item">
                            <div className="detail-label">Book Title</div>
                            <div className="detail-value book-title">{request.title}</div>
                          </div>
                          <div className="detail-item">
                            <div className="detail-label">Author</div>
                            <div className="detail-value">{request.author}</div>
                          </div>
                          <div className="detail-item">
                            <div className="detail-label">Copy ID</div>
                            <div className="detail-value isbn-code">{request.copyId}</div>
                          </div>
                          <div className="detail-item">
                            <div className="detail-label">ISBN</div>
                            <div className="detail-value isbn-code">{request.isbn}</div>
                          </div>
                          <div className="detail-item">
                            <div className="detail-label">Issue Date</div>
                            <div className="detail-value">
                              {new Date(request.issueDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                          </div>
                          <div className="detail-item">
                            <div className="detail-label">Due Date</div>
                            <div className="detail-value" style={{color: isOverdue ? '#ef4444' : 'inherit', fontWeight: isOverdue ? '600' : '500'}}>
                              {new Date(request.dueDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="action-buttons">
                        <button 
                          className="btn-approve" 
                          onClick={() => handleReturnApprove(request)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Approve Return
                        </button>
                        <button 
                          className="btn-reject" 
                          onClick={() => handleReturnReject(request)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Reserve Requests */}
        {activeTab === "reserve" && (
          <div className="requests-list">
            {reserveRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🕒</div>
                <h3>No Active Reservations</h3>
                <p>Queue updates will appear here</p>
              </div>
            ) : reserveRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <div className="request-info-icon">📚</div>
                  <div style={{flex: 1}}>
                    <div className="request-user">User: {request.studentId}</div>
                    <div className="request-time">{request.time}</div>
                  </div>
                  <div className="queue-badge" style={{margin: 0}}>
                    Queue Position: {request.queuePosition}
                  </div>
                </div>
                <div className="request-body">
                  <h3 style={{marginBottom: '16px', fontSize: '1.1rem', color: '#333'}}>
                    {request.bookName}
                  </h3>
                  <div className="request-details">
                    <div className="detail-row">
                      <span className="detail-label">ISBN:</span>
                      <span className="detail-value">{request.isbn}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Reserved:</span>
                      <span className="detail-value">{new Date(request.time).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#0369a1'
                  }}>
                    ℹ️ <strong>Note:</strong> This user is waiting for an available copy. The book will be automatically assigned when returned.
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Addition Requests */}
        {activeTab === "addition" && (
          <div className="requests-list">
            {additionRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">➕</div>
                <h3>No Addition Requests</h3>
                <p>New book requests will appear here</p>
              </div>
            ) : additionRequests.map((request) => (
              <div key={request.id} className="request-card">
                <div className="request-header">
                  <div className="request-info-icon">📖</div>
                  <div style={{flex: 1}}>
                    <div className="request-user">Requested by: {request.studentId}</div>
                    <div className="request-time">{new Date(request.time).toLocaleString()}</div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    backgroundColor: '#f0fdf4',
                    color: '#16a34a',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    📚 New Book Request
                  </div>
                </div>
                <div className="request-body">
                  <h3 style={{marginBottom: '16px', fontSize: '1.1rem', color: '#333'}}>
                    {request.bookName}
                  </h3>
                  <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: '#92400e'
                  }}>
                    ⚠️ Review the book details carefully before approving the addition to the library catalog.
                  </div>
                  <button 
                    className="btn-primary" 
                    onClick={() => handleViewAdditionRequest(request.id)}
                    style={{width: '100%'}}
                  >
                    📋 View Full Details & Approve/Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Addition Request Details Modal */}
      {showAdditionDetailsModal && (
        <div className="modal-overlay" onClick={() => setShowAdditionDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px', maxHeight: '80vh', overflow: 'auto'}}>
            <div className="modal-header">
              <h2>Addition Request Details</h2>
              <button className="modal-close" onClick={() => setShowAdditionDetailsModal(false)}>×</button>
            </div>
            
            {loadingAdditionDetails ? (
              <div className="modal-body" style={{textAlign: 'center', padding: '40px'}}>
                <div>Loading request details...</div>
              </div>
            ) : additionRequestDetails ? (
              <>
                <div className="modal-body">
                  {/* Book Cover */}
                  {additionRequestDetails.pic_path && (
                    <div style={{textAlign: 'center', marginBottom: '20px'}}>
                      <img 
                        src={`/api/serve_image.php?path=${additionRequestDetails.pic_path}`}
                        alt={additionRequestDetails.title}
                        style={{maxWidth: '150px', maxHeight: '200px', borderRadius: '8px'}}
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}

                  {/* Request Info */}
                  <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px'}}>
                    <h3 style={{margin: '0 0 12px 0', fontSize: '1.1rem', color: '#333'}}>{additionRequestDetails.title}</h3>
                    
                    <div style={{display: 'grid', gap: '8px', fontSize: '0.9rem'}}>
                      <div><strong>Author:</strong> {additionRequestDetails.author || 'N/A'}</div>
                      <div><strong>ISBN:</strong> {additionRequestDetails.isbn || 'N/A'}</div>
                      <div><strong>Publisher:</strong> {additionRequestDetails.publisher || 'N/A'}</div>
                      <div><strong>Year:</strong> {additionRequestDetails.publication_year || 'N/A'}</div>
                      <div><strong>Edition:</strong> {additionRequestDetails.edition || 'N/A'}</div>
                      <div><strong>Category:</strong> {additionRequestDetails.category || 'N/A'}</div>
                      <div><strong>Requested by:</strong> {additionRequestDetails.email}</div>
                    </div>
                  </div>

                  {/* Description */}
                  {additionRequestDetails.description && (
                    <div style={{marginBottom: '20px'}}>
                      <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>Description:</label>
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '6px',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.9rem'
                      }}>
                        {additionRequestDetails.description}
                      </div>
                    </div>
                  )}

                  {/* PDF Link */}
                  {additionRequestDetails.pdf_path && (
                    <div style={{marginBottom: '20px'}}>
                      <a 
                        href={`/api/serve_image.php?path=${additionRequestDetails.pdf_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-block',
                          padding: '10px 20px',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '6px',
                          fontSize: '0.9rem'
                        }}
                      >
                        📄 View PDF
                      </a>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setShowAdditionDetailsModal(false)}
                  >
                    Close
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={handleDeclineAdditionRequest}
                    style={{marginLeft: '8px'}}
                  >
                    ✕ Decline
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={handleApproveAdditionRequest}
                    style={{marginLeft: '8px'}}
                  >
                    ✓ Approve
                  </button>
                </div>
              </>
            ) : (
              <div className="modal-body" style={{textAlign: 'center', padding: '40px'}}>
                <div>Request details not found</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Damage Notes Modal */}
      {damageEditorFor !== null && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit damage notes">
            <div className="modal">
              <div className="modal-header">
                <h3>Edit Damage Details</h3>
              </div>
              <div className="modal-body">
                <div className="hint">
                  Add a brief description of the damage (e.g., "torn pages on 15-18", "wet cover", "scribbles on index").
                </div>
                <textarea
                  className="textarea"
                  rows={5}
                  value={editorText}
                  onChange={(e) => setEditorText(e.target.value)}
                  placeholder="Describe the damages here..."
                />
                <div className="quick-tags">
                  {[
                    "Torn pages",
                    "Wet/Water stained",
                    "Scribbles/Highlights",
                    "Damaged cover",
                    "Loose binding",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="damage-tag"
                      onClick={() => setEditorText((t) => (t ? `${t}\n${tag}` : tag))}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={closeDamageEditor}>Cancel</button>
                <button className="btn-primary" onClick={saveDamageNotes} disabled={!editorText.trim()}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Copy Selection Modal */}
        {showCopySelectionModal && selectedRequestForCopy && (
          <div className="modal-overlay" onClick={() => setShowCopySelectionModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Select Copy to Issue</h3>
                <button className="modal-close" onClick={() => setShowCopySelectionModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div style={{marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px'}}>
                  <div style={{fontWeight: '600', marginBottom: '4px'}}>Request Details</div>
                  <div style={{fontSize: '0.9rem', color: '#666'}}>
                    Student: {selectedRequestForCopy.requester_name} ({selectedRequestForCopy.student_roll})<br/>
                    Book: {selectedRequestForCopy.title}
                  </div>
                  {selectedRequestForCopy.requested_copy_id && (
                    <div style={{marginTop: '8px', fontSize: '0.9rem', color: '#3b82f6'}}>
                      ℹ️ Student requested copy: <strong>{selectedRequestForCopy.requested_copy_id}</strong>
                    </div>
                  )}
                </div>
                
                <p style={{marginBottom: '16px', color: '#666'}}>
                  Select which copy to issue ({availableCopies.length} available):
                </p>
                
                <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {availableCopies.map((copy) => {
                    const isRequested = copy.copy_id === selectedRequestForCopy.requested_copy_id
                    return (
                      <div 
                        key={copy.copy_id}
                        onClick={() => setSelectedCopyId(copy.copy_id)}
                        style={{
                          padding: '16px',
                          border: `2px solid ${selectedCopyId === copy.copy_id ? '#3b82f6' : (isRequested ? '#10b981' : '#e0e0e0')}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          backgroundColor: selectedCopyId === copy.copy_id ? '#f0f9ff' : (isRequested ? '#f0fdf4' : 'white')
                        }}
                      >
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'start'}}>
                          <div style={{flex: 1}}>
                            <div style={{fontWeight: '600', fontSize: '1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                              Copy ID: {copy.copy_id}
                              {isRequested && (
                                <span style={{fontSize: '0.75rem', padding: '2px 8px', backgroundColor: '#10b981', color: 'white', borderRadius: '4px'}}>
                                  Requested
                                </span>
                              )}
                            </div>
                            <div style={{fontSize: '0.9rem', color: '#666'}}>
                              📍 {copy.location}
                            </div>
                            {copy.condition_note && (
                              <div style={{fontSize: '0.85rem', color: '#f59e0b', marginTop: '4px'}}>
                                ⚠️ Note: {copy.condition_note}
                              </div>
                            )}
                          </div>
                          {selectedCopyId === copy.copy_id && (
                            <span style={{fontSize: '1.5rem'}}>✓</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowCopySelectionModal(false)
                    setSelectedCopyId(null)
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary" 
                  onClick={() => approveWithCopy(selectedRequestForCopy, selectedCopyId)}
                  disabled={!selectedCopyId}
                >
                  Issue Selected Copy
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Return Approval Modal */}
      {showReturnApprovalModal && selectedReturnRequest && (
        <div className="modal-overlay" onClick={() => setShowReturnApprovalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h2>Approve Return</h2>
              <button className="modal-close" onClick={() => setShowReturnApprovalModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px'}}>
                <h3 style={{margin: '0 0 8px 0', fontSize: '1rem'}}>{selectedReturnRequest.title}</h3>
                <p style={{margin: '0', color: '#666', fontSize: '0.9rem'}}>Copy ID: {selectedReturnRequest.copyId}</p>
                <p style={{margin: '4px 0 0 0', color: '#666', fontSize: '0.9rem'}}>Requester: {selectedReturnRequest.requesterName}</p>
              </div>

              <div className="form-group" style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                  Book Condition *
                </label>
                <select 
                  value={returnBookCondition}
                  onChange={(e) => setReturnBookCondition(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="good">✓ Good - No damage</option>
                  <option value="damaged">⚠️ Damaged - Minor issues</option>
                  <option value="lost">❌ Lost - Cannot be returned</option>
                  <option value="discarded">🗑️ Discarded - Unusable</option>
                </select>
              </div>

              {returnBookCondition !== 'good' && (
                <>
                  <div className="form-group" style={{marginBottom: '20px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                      Compensation Amount (BDT) *
                    </label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={returnCompensationAmount}
                      onChange={(e) => setReturnCompensationAmount(e.target.value)}
                      placeholder="Enter compensation amount"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '1rem'
                      }}
                    />
                  </div>

                  <div className="form-group" style={{marginBottom: '20px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                      Note/Reason (Optional)
                    </label>
                    <textarea 
                      value={returnCompensationNote}
                      onChange={(e) => setReturnCompensationNote(e.target.value)}
                      placeholder="Describe the damage or reason for compensation..."
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{
                    padding: '12px',
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '6px',
                    marginBottom: '20px'
                  }}>
                    <p style={{margin: 0, fontSize: '0.9rem', color: '#92400e'}}>
                      ⚠️ <strong>Note:</strong> The student will be charged {returnCompensationAmount || '0'} BDT for the {returnBookCondition} book.
                      {(returnBookCondition === 'lost' || returnBookCondition === 'discarded') && 
                        ' The book will NOT be added back to inventory.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowReturnApprovalModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={confirmReturnApproval}
              >
                ✓ Confirm Return
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Bottom Navigation */}
        {/* Top navigation is provided by Header when user is logged in */}
    </div>
  )
}

export default LibrarianRequests
