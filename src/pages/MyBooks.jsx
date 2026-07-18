"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import PageTransition from "../components/PageTransition"
import { borrowApi } from "../api/borrow"
import { booksApi } from "../api/books"
import "./MyBooks.css"

function MyBooks({ user, userRole, onLogout }) {
  const [activeTab, setActiveTab] = useState("borrowed")
  const [borrowedBooks, setBorrowedBooks] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [reservations, setReservations] = useState([])
  const [returnedBooks, setReturnedBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedFine, setSelectedFine] = useState(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [requestingReturn, setRequestingReturn] = useState(null)

  // Fetch borrowed books and pending requests
  useEffect(() => {
    if (user && user.email) {
      fetchMyBooks()
      fetchMyReservations()
      if (activeTab === 'returned') {
        fetchReturnedBooks()
      }
    }
  }, [user, activeTab])

  const fetchMyBooks = async () => {
    setLoading(true)
    try {
      const data = await borrowApi.getUserTransactions(user.email)
      
      if (data.success) {
        // Filter transactions by status and calculate days_remaining if not provided
        const borrowed = (data.transactions || []).filter(t => t.status === 'Borrowed' || t.status === 'Overdue').map(t => ({
          ...t,
          days_remaining: t.days_remaining !== undefined ? parseInt(t.days_remaining) : Math.ceil((new Date(t.due_date) - new Date()) / (1000 * 60 * 60 * 24)),
          fine_amount: t.fine_amount || 0
        }))
        const pending = (data.transactions || []).filter(t => t.status === 'Pending' || t.status === 'Pending Return')
        
        setBorrowedBooks(borrowed)
        setPendingRequests(pending)
      } else {
        console.error('Failed to fetch books:', data.message)
        setBorrowedBooks([])
        setPendingRequests([])
      }
    } catch (error) {
      console.error('Error fetching books:', error)
      setBorrowedBooks([])
      setPendingRequests([])
    } finally {
      setLoading(false)
    }
  }
  
  const fetchMyReservations = async () => {
    try {
      const data = await booksApi.getUserReservations(user.email)
      
      if (data.success) {
        setReservations(data.reservations || [])
      } else {
        console.error('Failed to fetch reservations:', data.message)
        setReservations([])
      }
    } catch (error) {
      console.error('Error fetching reservations:', error)
      setReservations([])
    }
  }

  const fetchReturnedBooks = async () => {
    try {
      const data = await borrowApi.getUserTransactions(user.email)
      
      if (data.success) {
        // Filter for returned books only and calculate late days
        const returned = (data.transactions || []).filter(t => t.status === 'Returned').map(book => {
          // Calculate if returned on time
          const dueDate = new Date(book.due_date)
          const returnDate = new Date(book.return_date)
          const daysLate = Math.floor((returnDate - dueDate) / (1000 * 60 * 60 * 24))
          const returnedOnTime = daysLate <= 0
          
          return {
            ...book,
            transactionId: book.transaction_id,
            copyId: book.copy_id,
            issueDate: book.issue_date,
            dueDate: book.due_date,
            returnDate: book.return_date,
            returnedOnTime: returnedOnTime,
            daysLate: Math.max(0, daysLate),
            fineAmount: book.fine_amount || 0,
            finePaid: book.fine_paid === 1,
            approvedBy: book.approved_by
          }
        })
        setReturnedBooks(returned)
      } else {
        console.error('Failed to fetch returned books:', data.message)
        setReturnedBooks([])
      }
    } catch (error) {
      console.error('Error fetching returned books:', error)
      setReturnedBooks([])
    }
  }

  const getImageUrl = (picPath) => {
    if (!picPath) return "/placeholder.svg"
    // If it's already a full URL, return as is
    if (picPath.startsWith('http')) return picPath
    // Otherwise, construct the backend image serving URL
    return `/api/serve_image.php?path=${encodeURIComponent(picPath)}`
  }

  const processPayment = async () => {
    if (!selectedFine || selectedFine.amount <= 0) {
      alert('No fine to pay')
      return
    }

    try {
      setProcessingPayment(true)

      // If no fine_id, we need to create the fine first by running check_overdue_books
      if (!selectedFine.fineId) {
        // Call check_overdue_books to create fines for all overdue books
        const checkResponse = await fetch('/api/borrow/check_overdue_books.php', {
          method: 'GET'
        })
        
        const checkData = await checkResponse.json()
        
        if (!checkData.success) {
          alert('Error creating fine record. Please try again.')
          setProcessingPayment(false)
          return
        }

        // Refresh books to get the newly created fine_id
        await fetchMyBooks()
        
        // Close modal and show message to try again
        alert('Fine record created. Please click "Pay Now" again to complete payment.')
        setShowPaymentModal(false)
        setSelectedFine(null)
        setProcessingPayment(false)
        return
      }

      const response = await fetch('/api/payments/process_payment.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fine_ids: [parseInt(selectedFine.fineId)],
          user_email: user.email,
          payment_method: 'bkash'
        })
      })

      const data = await response.json()

      if (data.success) {
        // Close modal first
        setShowPaymentModal(false)
        setSelectedFine(null)
        
        // Show success alert with details
        alert(
          `✅ Payment Successful!\n\n` +
          `Amount Paid: ${data.amount.toFixed(2)} BDT\n` +
          `Transaction ID: ${data.transaction_id}\n` +
          `Payment Method: bKash\n\n` +
          `Your fine has been paid successfully. You can now return the book to the library.`
        )
        
        // Reload books to update fine status
        await fetchMyBooks()
      } else {
        alert(`❌ Payment Failed\n\n${data.message}`)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Network error. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleReturnRequest = async (transactionId) => {
    if (!window.confirm('Are you sure you want to request to return this book?')) {
      return
    }

    setRequestingReturn(transactionId)
    
    try {
      const data = await borrowApi.requestReturn({ 
        transaction_id: transactionId, 
        user_email: user.email 
      })
      
      if (data.success) {
        alert('✅ Return request submitted successfully!\n\nYour request is now pending librarian approval. You will be notified once it is approved.')
        // Refresh books list
        await fetchMyBooks()
      } else {
        if (data.requires_payment) {
          alert(`❌ ${data.message}\n\nPlease pay your fine first before requesting a return.`)
        } else {
          alert(`❌ ${data.message}`)
        }
      }
    } catch (error) {
      console.error('Return request error:', error)
      alert(`Failed to submit return request: ${error.message || 'Network error'}`)
    } finally {
      setRequestingReturn(null)
    }
  }

  const handleCancelQueue = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return
    }
    
    try {
      const data = await booksApi.cancelReservation(reservationId)
      
      if (data.success) {
        alert('Reservation cancelled successfully')
        // Refresh reservations
        fetchMyReservations()
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Cancel reservation error:', error)
      alert('Network error. Please try again.')
    }
  }

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this pending request?')) {
      return
    }
    
    try {
      const data = await borrowApi.cancelRequest({
        user_email: user.email,
        request_id: requestId
      })
      
      if (data.success) {
        alert('Request cancelled successfully')
        // Refresh books list
        fetchMyBooks()
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Cancel request error:', error)
      alert('Network error. Please try again.')
    }
  }

  return (
    <PageTransition className="my-books-page">
      <Header user={user} onLogout={onLogout} />

      <div className="my-books-container">
        <div className="my-books-header">
          <h1>IITShelf</h1>
          <div className="search-bar-container">
            <input type="text" className="search-input" placeholder="Search books..." />
          </div>
        </div>

        <div className="my-books-tabs">
          <button
            className={`my-books-tab ${activeTab === "borrowed" ? "active" : ""}`}
            onClick={() => setActiveTab("borrowed")}
          >
            Borrowed ({borrowedBooks.length})
          </button>
          <button
            className={`my-books-tab ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending ({pendingRequests.length})
          </button>
          <button
            className={`my-books-tab ${activeTab === "reserved" ? "active" : ""}`}
            onClick={() => setActiveTab("reserved")}
          >
            Reserved ({reservations.length})
          </button>
          <button
            className={`my-books-tab ${activeTab === "returned" ? "active" : ""}`}
            onClick={() => setActiveTab("returned")}
          >
            Returned
          </button>
        </div>

        <div className="my-books-content">
          <h2>Book {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>

          {loading ? (
            <div className="loading-message" style={{textAlign: 'center', padding: '40px'}}>
              Loading your books...
            </div>
          ) : (
            <>
              {activeTab === "borrowed" && (
                <div className="books-list">
                  {borrowedBooks.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>
                      <p>You haven't borrowed any books yet.</p>
                      <Link to="/search" className="btn btn-primary">Browse Books</Link>
                    </div>
                  ) : (
                    borrowedBooks.map((book) => (
                      <div key={book.transaction_id} className="my-book-card">
                        <img 
                          src={getImageUrl(book.pic_path || book.cover)} 
                          alt={book.title} 
                          className="my-book-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder.svg";
                          }}
                        />
                        <div className="my-book-info">
                          <h3>{book.title}</h3>
                          <p className="my-book-author">{book.author}</p>
                          <p className="my-book-id">Copy: {book.copy_id}</p>
                          <p style={{fontSize: '0.9em', color: '#666'}}>
                            Issued: {new Date(book.issue_date).toLocaleDateString()}<br />
                            Due: {new Date(book.due_date).toLocaleDateString()}
                          </p>
                          {book.days_remaining > 0 ? (
                            <span className="badge badge-success">Due in {book.days_remaining} days</span>
                          ) : book.days_remaining === 0 ? (
                            <span className="badge badge-warning">Due Today!</span>
                          ) : (
                            <span className="badge badge-danger">
                              Overdue {Math.abs(book.days_remaining || 0)} days {book.fine_amount && book.fine_amount > 0 ? `- Fine: ${Number(book.fine_amount).toFixed(2)} BDT` : ''}
                            </span>
                          )}
                        </div>
                        <div className="my-book-actions">
                          <Link to={`/book/${book.isbn}`} className="btn btn-sm btn-secondary">
                            Details
                          </Link>
                          {book.days_remaining < 0 && book.fine_amount > 0 && book.fine_id && book.fine_paid !== 1 ? (
                            <button 
                              onClick={() => handlePayFine(book)} 
                              className="btn btn-sm btn-danger" 
                              style={{marginLeft: '8px'}}
                            >
                              💳 Pay Now
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleReturnRequest(book.transaction_id)} 
                              className="btn btn-sm btn-primary" 
                              style={{marginLeft: '8px'}}
                              disabled={requestingReturn === book.transaction_id || book.hasReturnRequest}
                            >
                              {requestingReturn === book.transaction_id ? 'Requesting...' : 
                               book.hasReturnRequest ? '⏳ Return Pending' : '📤 Request Return'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "pending" && (
                <div className="books-list">
                  {pendingRequests.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>
                      <p>No pending requests.</p>
                      <Link to="/search" className="btn btn-primary">Request a Book</Link>
                    </div>
                  ) : (
                    pendingRequests.map((request) => (
                      <div key={request.request_id || request.transaction_id} className="my-book-card">
                        <img 
                          src={getImageUrl(request.cover || request.pic_path)} 
                          alt={request.title} 
                          className="my-book-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder.svg";
                          }}
                        />
                        <div className="my-book-info">
                          <h3>{request.title}</h3>
                          <p className="my-book-author">{request.author}</p>
                          <p style={{fontSize: '0.9em', color: '#666'}}>
                            Requested: {new Date(request.request_date).toLocaleDateString()}
                          </p>
                          <span className="badge badge-warning">
                            ⏳ {request.status === 'Pending Return' ? 'Return Request Pending' : 'Pending Librarian Approval'}
                          </span>
                        </div>
                        <div className="my-book-actions">
                          <Link to={`/book/${request.isbn}`} className="btn btn-sm btn-secondary">
                            Details
                          </Link>
                          {request.status !== 'Pending Return' && (
                            <button 
                              className="btn btn-sm btn-danger"
                              onClick={() => handleCancelRequest(request.request_id)}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "reserved" && (
                <div className="books-list">
                  {reservations.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>
                      <p>No active reservations.</p>
                      <Link to="/search" className="btn btn-primary">Browse Books</Link>
                    </div>
                  ) : (
                    reservations.map((reservation) => (
                      <div key={reservation.reservationId} className="my-book-card">
                        <img 
                          src={getImageUrl(reservation.cover || reservation.pic_path)} 
                          alt={reservation.title} 
                          className="my-book-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder.svg";
                          }}
                        />
                        <div className="my-book-info">
                          <h3>{reservation.title}</h3>
                          <p className="my-book-author">{reservation.author}</p>
                          <p style={{fontSize: '0.9em', color: '#666'}}>
                            Reserved: {new Date(reservation.createdAt).toLocaleDateString()}
                          </p>
                          {reservation.isReady ? (
                            <div style={{marginTop: '8px'}}>
                              <span className="badge badge-success">✓ Ready to Collect!</span>
                              <p style={{fontSize: '0.85rem', color: '#059669', marginTop: '4px'}}>
                                Collect within {reservation.hoursRemaining} hours - Click Details to borrow
                              </p>
                            </div>
                          ) : (
                            <div style={{marginTop: '8px'}}>
                              <span className="badge badge-warning">Queue Position: #{reservation.queuePosition}</span>
                              <p style={{fontSize: '0.85rem', color: '#666', marginTop: '4px'}}>
                                {reservation.totalInQueue} {reservation.totalInQueue === 1 ? 'person' : 'people'} in queue
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="my-book-actions">
                          <Link 
                            to={`/book/${reservation.isbn}`} 
                            className={`btn btn-sm ${reservation.isReady ? 'btn-primary' : 'btn-secondary'}`}
                          >
                            {reservation.isReady ? 'Borrow Now' : 'Details'}
                          </Link>
                          <button 
                            onClick={() => handleCancelQueue(reservation.reservationId)}
                            className="btn btn-sm btn-outline"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "returned" && (
                <div className="books-list">
                  {returnedBooks.length === 0 ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>
                      <p>No returned books history yet.</p>
                    </div>
                  ) : (
                    returnedBooks.map((book) => (
                      <div key={book.transactionId} className="my-book-card">
                        <img 
                          src={getImageUrl(book.cover || book.pic_path)} 
                          alt={book.title} 
                          className="my-book-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/placeholder.svg";
                          }}
                        />
                        <div className="my-book-info">
                          <h3>{book.title}</h3>
                          <p className="my-book-author">{book.author}</p>
                          <p className="my-book-id">Copy: {book.copyId}</p>
                          <div style={{fontSize: '0.9em', color: '#666', marginTop: '8px'}}>
                            <div>📅 Borrowed: {new Date(book.issueDate).toLocaleDateString()}</div>
                            <div>📅 Due: {new Date(book.dueDate).toLocaleDateString()}</div>
                            <div>✅ Returned: {new Date(book.returnDate).toLocaleDateString()}</div>
                            {book.approvedBy && (
                              <div style={{marginTop: '4px', color: '#059669'}}>
                                👤 Approved by: {book.approvedBy}
                              </div>
                            )}
                          </div>
                          <div style={{marginTop: '8px'}}>
                            {book.returnedOnTime ? (
                              <span className="badge badge-success">✓ Returned On Time</span>
                            ) : (
                              <>
                                <span className="badge badge-warning">
                                  ⚠️ Late by {book.daysLate} {book.daysLate === 1 ? 'day' : 'days'}
                                </span>
                                {book.fineAmount > 0 && (
                                  <span 
                                    className={`badge ${book.finePaid ? 'badge-success' : 'badge-danger'}`}
                                    style={{marginLeft: '8px'}}
                                  >
                                    {book.finePaid ? '✓' : '💳'} Fine: {book.fineAmount.toFixed(2)} BDT 
                                    {book.finePaid ? ' (Paid)' : ' (Unpaid)'}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="my-book-actions">
                          <Link to={`/book/${book.isbn}`} className="btn btn-sm btn-secondary">
                            Details
                          </Link>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedFine && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '450px'}}>
            <div className="modal-header">
              <h2>Pay Outstanding Fines</h2>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
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
                  {selectedFine.amount.toFixed(2)} <span style={{fontSize: '1.2rem'}}>BDT</span>
                </div>
                <div style={{fontSize: '0.85rem', color: '#666', marginTop: '8px'}}>
                  1 fine to be paid
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
                  <li>{selectedFine.bookTitle}: {selectedFine.amount.toFixed(2)} BDT</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPaymentModal(false)}
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

      <BottomNav userRole={userRole} />
    </PageTransition>
  )
}

export default MyBooks
