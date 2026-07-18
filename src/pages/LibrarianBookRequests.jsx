"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import "./LibrarianBookRequests.css"

function LibrarianBookRequests({ user, onLogout }) {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Pending') // Pending, Approved, Rejected
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  useEffect(() => {
    fetchRequests()
  }, [activeTab])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/books/get_request_details.php?status=${activeTab}`)
      const data = await response.json()
      
      if (data.success) {
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (requestId, action) => {
    if (!confirm(`Are you sure you want to ${action} this request?`)) return
    
    try {
      const response = await fetch('/api/books/approve_request.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_id: requestId,
          action: action,
          librarian_email: user.email
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✓ Request ${action}d successfully!`)
        fetchRequests()
        setShowDetailsModal(false)
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error handling request:', error)
      alert('Network error. Please try again.')
    }
  }

  const viewDetails = (request) => {
    setSelectedRequest(request)
    setShowDetailsModal(true)
  }

  return (
    <div className="librarian-book-requests-page">
      <Header user={user} onLogout={onLogout} />

      <div className="requests-container">
        <div className="requests-header">
          <h1 className="requests-title">Book Upload Requests</h1>
          <p className="requests-subtitle">Manage student, teacher, and director book upload requests</p>
        </div>

        {/* Tabs */}
        <div className="request-tabs">
          <button 
            className={`tab-btn ${activeTab === 'Pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('Pending')}
          >
            Pending ({requests.filter(r => r.status === 'Pending').length || 0})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'Approved' ? 'active' : ''}`}
            onClick={() => setActiveTab('Approved')}
          >
            Approved
          </button>
          <button 
            className={`tab-btn ${activeTab === 'Rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('Rejected')}
          >
            Rejected
          </button>
        </div>

        {/* Requests List */}
        <div className="requests-content">
          {loading ? (
            <div className="loading-message">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="empty-message">
              <p>No {activeTab.toLowerCase()} requests found.</p>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((request) => (
                <div key={request.request_id} className="request-card">
                  <div className="request-card-header">
                    <h3>{request.title}</h3>
                    <span className={`status-badge status-${request.status.toLowerCase()}`}>
                      {request.status}
                    </span>
                  </div>
                  
                  <div className="request-card-body">
                    <div className="request-info">
                      <span className="info-label">Requested by:</span>
                      <span className="info-value">
                        {request.requester_name || request.requester_identifier}
                        {request.requester_role && (
                          <span className="role-badge">{request.requester_role}</span>
                        )}
                      </span>
                    </div>
                    
                    {request.author && (
                      <div className="request-info">
                        <span className="info-label">Author:</span>
                        <span className="info-value">{request.author}</span>
                      </div>
                    )}
                    
                    {request.isbn && (
                      <div className="request-info">
                        <span className="info-label">ISBN:</span>
                        <span className="info-value">{request.isbn}</span>
                      </div>
                    )}
                    
                    {request.resource_type && (
                      <div className="request-info">
                        <span className="info-label">Resource Type:</span>
                        <span className="resource-type-badge">{request.resource_type}</span>
                      </div>
                    )}
                    
                    {request.file_name && (
                      <div className="request-info">
                        <span className="info-label">File Name:</span>
                        <span className="info-value">{request.file_name}</span>
                      </div>
                    )}
                    
                    {request.pdf_path && (
                      <div className="request-info">
                        <span className="info-label">File Link:</span>
                        <a 
                          href={request.pdf_path} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="pdf-link"
                        >
                          Open Link
                        </a>
                      </div>
                    )}
                    
                    {request.description && (
                      <div className="request-info">
                        <span className="info-label">Description:</span>
                        <p className="description-text">{request.description}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="request-card-footer">
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => viewDetails(request)}
                    >
                      View Details
                    </button>
                    
                    {request.status === 'Pending' && (
                      <>
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={() => handleAction(request.request_id, 'approve')}
                        >
                          Approve
                        </button>
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={() => handleAction(request.request_id, 'reject')}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    
                    {request.approved_by && (
                      <span className="approved-info">
                        By: {request.approved_by}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request Details</h3>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Title:</strong>
                <span>{selectedRequest.title}</span>
              </div>
              <div className="detail-row">
                <strong>Author:</strong>
                <span>{selectedRequest.author || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>ISBN:</strong>
                <span>{selectedRequest.isbn || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Resource Type:</strong>
                <span className="resource-type-badge">{selectedRequest.resource_type || 'PDF'}</span>
              </div>
              <div className="detail-row">
                <strong>File Name:</strong>
                <span>{selectedRequest.file_name || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <strong>Requested by:</strong>
                <span>
                  {selectedRequest.requester_name || selectedRequest.requester_identifier}
                  {selectedRequest.requester_role && (
                    <span className="role-badge">{selectedRequest.requester_role}</span>
                  )}
                </span>
              </div>
              {selectedRequest.pdf_path && (
                <div className="detail-row">
                  <strong>File Link:</strong>
                  <a 
                    href={selectedRequest.pdf_path} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="pdf-link"
                  >
                    {selectedRequest.pdf_path}
                  </a>
                </div>
              )}
              {selectedRequest.description && (
                <div className="detail-row">
                  <strong>Description:</strong>
                  <p>{selectedRequest.description}</p>
                </div>
              )}
              <div className="detail-row">
                <strong>Status:</strong>
                <span className={`status-badge status-${selectedRequest.status.toLowerCase()}`}>
                  {selectedRequest.status}
                </span>
              </div>
              {selectedRequest.approved_by && (
                <>
                  <div className="detail-row">
                    <strong>Handled by:</strong>
                    <span>{selectedRequest.approved_by}</span>
                  </div>
                  <div className="detail-row">
                    <strong>Handled at:</strong>
                    <span>{new Date(selectedRequest.approved_at).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
            {selectedRequest.status === 'Pending' && (
              <div className="modal-footer">
                <button 
                  className="btn btn-success"
                  onClick={() => handleAction(selectedRequest.request_id, 'approve')}
                >
                  Approve Request
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleAction(selectedRequest.request_id, 'reject')}
                >
                  Reject Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default LibrarianBookRequests
