"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import "./LibrarianBorrowedBooks.css"

function LibrarianBorrowedBooks({ user, onLogout }) {
  const navigate = useNavigate()
  const [borrowedBooks, setBorrowedBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchBorrowedBooks()
  }, [])

  const fetchBorrowedBooks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/librarian/get_transaction_history.php?status=Borrowed')
      const data = await response.json()
      
      if (data.success) {
        setBorrowedBooks(data.borrowed_books || [])
      } else {
        console.error('Failed to fetch borrowed books:', data.message)
      }
    } catch (error) {
      console.error('Error fetching borrowed books:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async (book) => {
    const fineMessage = book.fine_amount > 0 
      ? `\n\nOverdue Fine: ${book.fine_amount} BDT (${Math.ceil(book.fine_amount / 10)} days overdue)`
      : '\n\nNo fine - returned on time'
    
    const confirmReturn = window.confirm(
      `Process book return?\n\nStudent: ${book.requester_name}${book.student_roll ? ` (${book.student_roll})` : ''}\nBook: ${book.title}\nCopy ID: ${book.copy_id}${fineMessage}\n\nThis will mark the book as returned and make it available.`
    )
    
    if (!confirmReturn) return

    try {
      const response = await fetch('/api/borrow/return_book.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: book.transaction_id,
          librarian_email: user.email
        })
      })

      const data = await response.json()
      
      if (data.success) {
        const successMessage = data.fine_amount > 0
          ? `✓ Book returned successfully!\n\nFine Applied: ${data.fine_amount} BDT\nDays Overdue: ${data.days_overdue}`
          : '✓ Book returned successfully!\n\nNo fine - returned on time'
        
        alert(successMessage)
        fetchBorrowedBooks() // Refresh list
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Return error:', error)
      alert('Network error. Please try again.')
    }
  }

  const filteredBooks = borrowedBooks.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.requester_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (book.student_roll && book.student_roll.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="librarian-borrowed-books-page">
      <Header user={user} onLogout={onLogout} />

      <div className="borrowed-books-container">
        <h1 className="page-title">Borrowed Books Management</h1>

        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search by book title, student name, or roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Stats Summary */}
        <div className="stats-summary">
          <div className="stat-box">
            <div className="stat-label">Total Borrowed</div>
            <div className="stat-value">{borrowedBooks.length}</div>
          </div>
          <div className="stat-box overdue">
            <div className="stat-label">Overdue</div>
            <div className="stat-value">
              {borrowedBooks.filter(b => b.days_remaining < 0).length}
            </div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Due Soon (≤3 days)</div>
            <div className="stat-value">
              {borrowedBooks.filter(b => b.days_remaining >= 0 && b.days_remaining <= 3).length}
            </div>
          </div>
        </div>

        {/* Borrowed Books List */}
        <div className="borrowed-books-list">
          {loading ? (
            <div className="empty-state">Loading borrowed books...</div>
          ) : filteredBooks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>No Borrowed Books</h3>
              <p>{searchQuery ? 'No books match your search' : 'All books have been returned'}</p>
            </div>
          ) : (
            filteredBooks.map((book) => {
              const isOverdue = book.days_remaining < 0
              const isDueSoon = book.days_remaining >= 0 && book.days_remaining <= 3
              
              return (
                <div 
                  key={book.transaction_id} 
                  className={`borrowed-book-card ${isOverdue ? 'overdue' : isDueSoon ? 'due-soon' : ''}`}
                >
                  <div className="book-image">
                    {book.cover ? (
                      <img 
                        src={book.cover} 
                        alt={book.title}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/placeholder.svg";
                        }}
                      />
                    ) : (
                      <div className="no-image">📖</div>
                    )}
                  </div>
                  
                  <div className="book-details">
                    <h3>{book.title}</h3>
                    <p className="book-author">by {book.author}</p>
                    
                    <div className="borrower-info">
                      <div className="info-row">
                        <span className="label">Borrower:</span>
                        <span className="value">{book.requester_name}</span>
                      </div>
                      {book.student_roll && (
                        <div className="info-row">
                          <span className="label">Roll:</span>
                          <span className="value">{book.student_roll}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="label">Copy ID:</span>
                        <span className="value">{book.copy_id}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">ISBN:</span>
                        <span className="value">{book.isbn}</span>
                      </div>
                    </div>

                    <div className="date-info">
                      <div className="date-row">
                        <span className="label">Issued:</span>
                        <span className="value">
                          {new Date(book.issue_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="date-row">
                        <span className="label">Due:</span>
                        <span className="value">
                          {new Date(book.due_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {isOverdue ? (
                      <div className="status-badge overdue-badge">
                        ⚠️ Overdue {Math.abs(book.days_remaining)} days - Fine: {book.fine_amount} BDT
                      </div>
                    ) : isDueSoon ? (
                      <div className="status-badge due-soon-badge">
                        ⏰ Due in {book.days_remaining} {book.days_remaining === 1 ? 'day' : 'days'}
                      </div>
                    ) : (
                      <div className="status-badge">
                        ✓ {book.days_remaining} days remaining
                      </div>
                    )}
                    
                    {/* Fine Payment Status */}
                    {book.fine_id && (
                      <div className={`fine-status ${book.fine_paid === 1 ? 'paid' : 'unpaid'}`}>
                        {book.fine_paid === 1 ? (
                          <>
                            <span className="status-icon">✅</span>
                            <span className="status-text">Fine Paid: {book.actual_fine_amount} BDT</span>
                          </>
                        ) : (
                          <>
                            <span className="status-icon">⚠️</span>
                            <span className="status-text">Unpaid Fine: {book.actual_fine_amount} BDT</span>
                            <span className="warning-text">Payment required before return</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="book-actions">
                    <button 
                      className="btn-return"
                      onClick={() => handleReturn(book)}
                    >
                      📥 Process Return
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default LibrarianBorrowedBooks
