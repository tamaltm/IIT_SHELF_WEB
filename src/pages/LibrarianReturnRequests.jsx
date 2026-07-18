"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import { api } from "../api/client"
import "./LibrarianRequests.css"

function LibrarianReturnRequests({ user, onLogout }) {
  const [returnRequests, setReturnRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingRequest, setProcessingRequest] = useState(null)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [bookCondition, setBookCondition] = useState('Good')
  const [compensationAmount, setCompensationAmount] = useState('')
  const [compensationNote, setCompensationNote] = useState('')

  useEffect(() => {
    fetchReturnRequests()
  }, [])

  const fetchReturnRequests = async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/librarian/get_requests.php', { params: { type: 'return' } })
      if (data.success) {
        const mapped = (data.items || []).map((r) => ({
          returnRequestId: r.transaction_id,
          transactionId: r.transaction_id,
          requesterName: r.name,
          requestedBy: r.email,
          requestedAt: r.requested_at,
          title: r.title,
          copyId: r.copy_id || undefined,
          isbn: r.isbn,
          issueDate: r.issue_date,
          dueDate: r.due_date,
          cover: undefined,
          author: '',
        }))
        setReturnRequests(mapped)
      } else {
        console.error('Failed to fetch return requests:', data.message)
      }
    } catch (error) {
      console.error('Error fetching return requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (returnRequestId) => {
    const request = returnRequests.find(r => r.returnRequestId === returnRequestId)
    setSelectedRequest(request)
    setBookCondition('Good')
    setCompensationAmount('')
    setCompensationNote('')
    setShowApprovalModal(true)
  }

  const confirmApproval = async () => {
    if (!selectedRequest) return

    // Validate compensation amount if condition is not Good
    if (bookCondition !== 'Good' && (!compensationAmount || parseFloat(compensationAmount) <= 0)) {
      alert('Please enter a valid compensation amount for damaged/lost books')
      return
    }

    setProcessingRequest(selectedRequest.returnRequestId)
    
    try {
      const data = await api.post('/api/borrow/return_book.php', {
        transaction_id: selectedRequest.transactionId,
      })
      
      if (data.success) {
        alert('✅ ' + data.message)
        setShowApprovalModal(false)
        setSelectedRequest(null)
        // Refresh the list
        await fetchReturnRequests()
      } else {
        alert('❌ Error: ' + data.message)
      }
    } catch (error) {
      console.error('Approve return error:', error)
      alert('Network error. Please try again.')
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleReject = async (returnRequestId) => {
    if (!window.confirm('Are you sure you want to reject this return request?')) {
      return
    }

    setProcessingRequest(returnRequestId)
    
    try {
      const data = await api.post('/api/borrow/return_book.php', {
        transaction_id: returnRequestId,
      })
      
      if (data.success) {
        alert('✅ ' + data.message)
        // Refresh the list
        await fetchReturnRequests()
      } else {
        alert('❌ Error: ' + data.message)
      }
    } catch (error) {
      console.error('Reject return error:', error)
      alert('Network error. Please try again.')
    } finally {
      setProcessingRequest(null)
    }
  }

  return (
    <div className="librarian-requests-page">
      <Header user={user} onLogout={onLogout} />

      <div className="requests-container">
        <div className="requests-header">
          <h1>Return Requests</h1>
          <p className="subtitle">Review and approve book return requests from users</p>
        </div>

        {loading ? (
          <div className="loading-message" style={{textAlign: 'center', padding: '40px'}}>
            Loading return requests...
          </div>
        ) : returnRequests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h2>All Caught Up!</h2>
            <p>No pending return requests at the moment.</p>
          </div>
        ) : (
          <div className="requests-grid">
            {returnRequests.map((request) => (
              <div key={request.returnRequestId} className="request-card">
                <div className="request-book-info">
                  <img 
                    src={request.cover || "/placeholder.svg"} 
                    alt={request.title} 
                    className="request-book-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/placeholder.svg";
                    }}
                  />
                  <div className="request-details">
                    <h3>{request.title}</h3>
                    <p className="request-author">{request.author}</p>
                    <p className="request-copy">Copy ID: {request.copyId}</p>
                  </div>
                </div>

                <div className="request-user-info">
                  <div className="info-row">
                    <span className="info-label">Requested by:</span>
                    <span className="info-value">{request.requesterName}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{request.requestedBy}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Issued:</span>
                    <span className="info-value">{new Date(request.issueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Due Date:</span>
                    <span className="info-value">{new Date(request.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Requested At:</span>
                    <span className="info-value">{new Date(request.requestedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="request-actions">
                  <Link 
                    to={`/book/${request.isbn}`} 
                    className="btn btn-sm btn-secondary"
                  >
                    View Book
                  </Link>
                  <button 
                    onClick={() => handleApprove(request.returnRequestId)}
                    className="btn btn-sm btn-success"
                    disabled={processingRequest === request.returnRequestId}
                  >
                    {processingRequest === request.returnRequestId ? '⏳ Processing...' : '✓ Approve'}
                  </button>
                  <button 
                    onClick={() => handleReject(request.returnRequestId)}
                    className="btn btn-sm btn-danger"
                    disabled={processingRequest === request.returnRequestId}
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowApprovalModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="modal-header">
              <h2>Approve Return</h2>
              <button className="modal-close" onClick={() => setShowApprovalModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div style={{marginBottom: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '8px'}}>
                <h3 style={{margin: '0 0 8px 0', fontSize: '1rem'}}>{selectedRequest.title}</h3>
                <p style={{margin: '0', color: '#666', fontSize: '0.9rem'}}>Copy ID: {selectedRequest.copyId}</p>
                <p style={{margin: '4px 0 0 0', color: '#666', fontSize: '0.9rem'}}>Requester: {selectedRequest.requesterName}</p>
              </div>

              <div className="form-group" style={{marginBottom: '20px'}}>
                <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                  Book Condition *
                </label>
                <select 
                  value={bookCondition}
                  onChange={(e) => setBookCondition(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem'
                  }}
                >
                  <option value="Good">✓ Good - No damage</option>
                  <option value="Damaged">⚠️ Damaged - Minor issues</option>
                  <option value="Lost">❌ Lost - Cannot be returned</option>
                  <option value="Discarded">🗑️ Discarded - Unusable</option>
                </select>
              </div>

              {bookCondition !== 'Good' && (
                <>
                  <div className="form-group" style={{marginBottom: '20px'}}>
                    <label style={{display: 'block', marginBottom: '8px', fontWeight: '600'}}>
                      Compensation Amount (BDT) *
                    </label>
                    <input 
                      type="number"
                      min="0"
                      step="0.01"
                      value={compensationAmount}
                      onChange={(e) => setCompensationAmount(e.target.value)}
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
                      value={compensationNote}
                      onChange={(e) => setCompensationNote(e.target.value)}
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
                      ⚠️ <strong>Note:</strong> The student will be charged {compensationAmount || '0'} BDT for the {bookCondition.toLowerCase()} book.
                      {(bookCondition === 'Lost' || bookCondition === 'Discarded') && 
                        ' The book will NOT be added back to inventory.'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowApprovalModal(false)}
                disabled={processingRequest}
              >
                Cancel
              </button>
              <button 
                className="btn btn-success" 
                onClick={confirmApproval}
                disabled={processingRequest}
              >
                {processingRequest ? '⏳ Processing...' : '✓ Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav userRole="librarian" />
    </div>
  )
}

export default LibrarianReturnRequests
