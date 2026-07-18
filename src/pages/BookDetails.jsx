"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import { booksApi } from "../api/books"
import { borrowApi } from "../api/borrow"
import "./BookDetails.css"

function BookDetails({ user, userRole, onLogout }) {
  const { id } = useParams() // This is the ISBN
  const navigate = useNavigate()
  const isGuest = !user
  const [showBorrowModal, setShowBorrowModal] = useState(false)
  const [showReserveModal, setShowReserveModal] = useState(false)
  const [borrowStatus, setBorrowStatus] = useState(null) // null, 'pending', 'borrowed'
  const [bookData, setBookData] = useState(null)
  const [copies, setCopies] = useState([])
  const [loading, setLoading] = useState(true)
  const role = user?.role || userRole
  // Librarian issue fields
  const [issueStudentId, setIssueStudentId] = useState("")
  const defaultDueDate = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  }, [])
  const [issueDueDate, setIssueDueDate] = useState(defaultDueDate)
  const [issuedInfo, setIssuedInfo] = useState(null)
  const [userBorrowedCount, setUserBorrowedCount] = useState(0)
  const [pendingRequests, setPendingRequests] = useState([])
  const [borrowedBooks, setBorrowedBooks] = useState([])
  const [userReservation, setUserReservation] = useState(null)
  const [reservationQueueCount, setReservationQueueCount] = useState(0)
  const [showReservationReadyModal, setShowReservationReadyModal] = useState(false)
  const [availableCopies, setAvailableCopies] = useState([])
  const [selectedCopyId, setSelectedCopyId] = useState(null)
  const [showCopySelectionModal, setShowCopySelectionModal] = useState(false)
  const [courseInfo, setCourseInfo] = useState(null) // NEW: Course and prerequisite info
  const [loadingCourseInfo, setLoadingCourseInfo] = useState(false)
  const [digitalResources, setDigitalResources] = useState([]) // Digital PDFs available for download

  // Load issued state from localStorage
  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0)
    
    try {
      const raw = sessionStorage.getItem("iitshelf_issuedBooks")
      const map = raw ? JSON.parse(raw) : {}
      const info = map?.[id] || null
      setIssuedInfo(info)
      if (info) setBorrowStatus("borrowed")
    } catch {
      /* ignore parse errors */
    }
  }, [id])

  // Fetch user's borrow status (skip for guests)
  useEffect(() => {
    if (user?.email && role !== 'librarian' && role !== 'director') {
      fetchUserBorrowStatus()
    }
  }, [user, role, id])

  const fetchUserBorrowStatus = async () => {
    try {
      const data = await borrowApi.getUserTransactions(user.email)
      if (data.success) {
        const borrowed = data.transactions?.filter(t => t.status === 'Borrowed') || []
        const pending = data.transactions?.filter(t => t.status === 'Pending') || []
        setUserBorrowedCount(borrowed.length)
        setBorrowedBooks(borrowed)
        setPendingRequests(pending)
        
        // Check if current book is borrowed or pending
        if (borrowed.some(b => b.isbn === id)) {
          setBorrowStatus('borrowed')
        } else if (pending.some(r => r.isbn === id)) {
          setBorrowStatus('pending')
        }
      }
    } catch (error) {
      console.error('Error fetching user borrow status:', error)
      setUserBorrowedCount(0)
      setBorrowedBooks([])
      setPendingRequests([])
    }
  }

  // Fetch book details from backend
  useEffect(() => {
    const fetchBookDetails = async () => {
      setLoading(true)
      try {
        // Search for the specific book by ISBN
        const data = await booksApi.getBooks({ search: id })
        
        if (data.success && data.books && data.books.length > 0) {
          const bookFromApi = data.books.find(b => b.isbn === id) || data.books[0]
          
          // Map API fields to component fields
          const mappedBook = {
            ...bookFromApi,
            availableCopies: bookFromApi.copies_available || 0,
            totalCopies: bookFromApi.copies_total || 0,
            available: bookFromApi.copies_available > 0,
            publicationYear: bookFromApi.publication_year,
            cover: bookFromApi.pic_path ? `/api/serve_image.php?path=${bookFromApi.pic_path}` : '/placeholder.svg'
          }
          
          setBookData(mappedBook)
          
          // Get book status for availability
          const statusData = await booksApi.getBookStatus(id)
          if (statusData.success) {
            setCopies([])
            setReservationQueueCount(statusData.reserved_count || 0)
          }
          
          // Check user reservation if logged in
          if (user?.email) {
            // You can add reservation check here if endpoint exists
            setUserReservation(null)
          }
          
          // Fetch digital resources if available
          if (bookFromApi.pdf_url) {
            // Always serve via download endpoint when given a relative path so legacy stored paths work
            const downloadHref = /^https?:\/\//i.test(bookFromApi.pdf_url)
              ? bookFromApi.pdf_url
              : `/api/books/download_pdf.php?isbn=${encodeURIComponent(id)}`
            setDigitalResources([{ url: downloadHref, type: 'PDF', resource_type: 'PDF' }])
          } else {
            setDigitalResources([])
          }
        } else {
          setBookData(null)
        }
      } catch (error) {
        console.error('Error fetching book details:', error)
        setBookData(null)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchBookDetails()
    }
  }, [id, user])

  // Fetch course info when book details are loaded
  useEffect(() => {
    if (bookData?.isbn) {
      fetchCourseInfo()
    }
  }, [bookData])

  const fetchCourseInfo = async () => {
    setLoadingCourseInfo(true)
    try {
      // This endpoint might not exist yet - handle gracefully
      const response = await fetch(`/api/books/get_book_courses.php?isbn=${id}`)
      const data = await response.json()
      if (data.success) {
        setCourseInfo(data)
      }
    } catch (error) {
      console.log('Course info not available:', error)
      // Not critical, just leave course info empty
    } finally {
      setLoadingCourseInfo(false)
    }
  }

  // Fetch user's borrowed count when borrow modal opens
  useEffect(() => {
    if (showBorrowModal && user?.email && role !== 'librarian') {
      const fetchBorrowedCount = async () => {
        try {
          const data = await borrowApi.getUserTransactions(user.email)
          if (data.success) {
            const borrowed = data.transactions?.filter(t => t.status === 'Borrowed') || []
            setUserBorrowedCount(borrowed.length)
          }
        } catch (error) {
          console.error('Error fetching borrowed count:', error)
        }
      }
      fetchBorrowedCount()
    }
  }, [showBorrowModal, user, role])

  // Use backend data
  const book = bookData || {
    isbn: id,
    title: "Loading...",
    author: "...",
    category: "...",
    publisher: "...",
    publicationYear: "",
    edition: "",
    description: loading ? "Loading book details..." : "Book not found",
    cover: "/placeholder.svg",
    totalCopies: 0,
    availableCopies: 0,
    available: false
  }

  // Calculate due date based on role
  const getDueDate = () => {
    const today = new Date()
    const loanDays = (userRole === 'Teacher' || userRole === 'Director') ? 15 : 7
    today.setDate(today.getDate() + loanDays)
    return today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  // Get max borrow limit based on role
  const getMaxBorrowLimit = () => {
    return (role === 'Teacher' || role === 'Director') ? 5 : 2
  }

  const handleBorrow = async () => {
    if (isGuest) {
      alert('Please login to borrow books')
      return
    }
    // Simply show the borrow modal - no need for complex copy checking
    setShowBorrowModal(true)
  }

  const confirmBorrow = async () => {
    if (role === "librarian") {
      // Librarian issues immediately to a student
      if (!issueStudentId.trim()) {
        return
      }
      try {
        const key = "iitshelf_issuedBooks"
        const raw = localStorage.getItem(key)
        const map = raw ? JSON.parse(raw) : {}
        map[id] = {
          studentId: issueStudentId.trim(),
          dueDate: issueDueDate,
          issuedAt: Date.now(),
          title: book.title,
          bookId: book.bookId,
        }
        localStorage.setItem(key, JSON.stringify(map))
        setIssuedInfo(map[id])
      } catch {
        /* ignore storage errors */
      }
      setBorrowStatus("borrowed")
    } else {
      // Student/Teacher sends borrow request
      try {
        console.log('User object:', user)
        console.log('ISBN (id):', id)
        console.log('User email:', user?.email)
        const requestData = { 
          isbn: id, 
          user_email: user?.email,
          copy_id: selectedCopyId 
        }
        console.log('Submitting borrow request:', requestData)
        const data = await borrowApi.requestBorrow(requestData)
        console.log('Borrow request response:', data)
        
        if (data.success) {
          alert('✓ Borrow request submitted successfully!\n\nYour request is pending librarian approval.')
          setBorrowStatus("pending")
          setShowBorrowModal(false)
          setShowCopySelectionModal(false)
          setSelectedCopyId(null)
          
          // If this was from a reservation, mark it as completed
          if (userReservation && userReservation.isNotified) {
            setUserReservation(null)
            setReservationQueueCount(prev => Math.max(0, prev - 1))
          }
          
          // Refresh user borrow status
          fetchUserBorrowStatus()
        } else {
          alert('Error: ' + (data.message || 'Failed to submit borrow request'))
        }
      } catch (error) {
        console.error('Borrow request error:', error)
        const errorMessage = error?.message || error?.toString() || 'Unknown error'
        // Show the actual error message from the API
        alert(`Cannot submit borrow request:\n\n${errorMessage}`)
      }
    }
    setShowBorrowModal(false)
    setShowReservationReadyModal(false)
  }
  
  const handleBorrowFromReservation = () => {
    setShowReservationReadyModal(false)
    setShowBorrowModal(true)
  }

  const handleReserve = () => {
    if (isGuest) {
      alert('Please login to reserve books')
      return
    }
    setShowReserveModal(true)
  }

  const confirmReserve = async () => {
    if (role === "librarian") {
      // Librarian can reserve for student - keeping old logic for now
      setBorrowStatus("reserved")
      setShowReserveModal(false)
      return
    }
    
    // Student/Teacher reservation
    try {
      const data = await booksApi.reserveBook(id, user.email)
      
      if (data.success) {
        alert(`✓ Book reserved successfully!\n\nYou are #${data.queue_position} in the reservation queue.\n\nYou will be notified when the book becomes available.`)
        setBorrowStatus("reserved")
        setUserReservation({
          reservationId: data.reservation_id,
          queuePosition: data.queue_position,
          isNotified: false
        })
        setReservationQueueCount(prev => prev + 1)
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Reservation error:', error)
      alert('Network error. Please make sure the backend server is running.')
    }
    setShowReserveModal(false)
  }
  
  const handleCancelReservation = async () => {
    if (!userReservation || !window.confirm('Are you sure you want to cancel your reservation?')) {
      return
    }
    
    try {
      const data = await booksApi.cancelReservation(userReservation.reservationId)
      
      if (data.success) {
        alert('Reservation cancelled successfully')
        setBorrowStatus(null)
        setUserReservation(null)
        setReservationQueueCount(prev => Math.max(0, prev - 1))
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Cancel reservation error:', error)
      alert('Network error. Please try again.')
    }
  }

  return (
    <div className="book-details-page">
      <Header user={user} onLogout={onLogout} />

      <div className="book-details-container">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="book-details-header">
          <img 
            src={book.cover || "/placeholder.svg"} 
            alt={book.title} 
            className="book-cover-large"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/placeholder.svg";
            }}
          />
          <div className="book-header-info">
            <h1>{book.title}</h1>
            <p className="book-author-large">{book.author}</p>
            <div className="book-meta">
              <span className="book-department">{book.category || 'N/A'}</span>
              {book.edition && <span className="book-department">Edition: {book.edition}</span>}
            </div>
            {borrowStatus === "reserved-ready" ? (
              <div className="availability-badge available">
                <span className="availability-icon">✓</span>
                Reserved for You - Ready to Collect!
              </div>
            ) : borrowStatus === "reserved" ? (
              <div className="availability-badge" style={{backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a'}}>
                <span className="availability-icon">⏳</span>
                Reserved - Position #{userReservation?.queuePosition}
              </div>
            ) : book.available && !issuedInfo ? (
              <div className="availability-badge available">
                <span className="availability-icon">✓</span>
                Available ({book.availableCopies} of {book.totalCopies} copies)
              </div>
            ) : (
              <div className="availability-badge unavailable">
                <span className="availability-icon">✗</span>
                {issuedInfo ? (
                  <>
                    Issued{issuedInfo.studentId ? ` to ${issuedInfo.studentId}` : ""}
                  </>
                ) : book.expectedReturnDate ? (
                  <>Not Available - Expected Return: {new Date(book.expectedReturnDate).toLocaleDateString()}</>
                ) : (
                  <>Not Available</>
                )}
              </div>
            )}
            <div className="book-actions-large">
              {isGuest ? (
                // Guest user - show disabled buttons with login prompt
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', width: '100%'}}>
                  <button className="btn btn-secondary btn-lg" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                    Login to Borrow
                  </button>
                  <button className="btn btn-secondary btn-lg" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                    Join Reservation Queue
                  </button>
                  <p style={{fontSize: '0.85rem', color: '#666', margin: 0, fontStyle: 'italic'}}>
                    Please login to borrow or reserve books
                  </p>
                </div>
              ) : borrowStatus === "borrowed" ? (
                <button className="btn btn-success btn-lg" disabled>
                  Borrowed
                </button>
              ) : borrowStatus === "pending" ? (
                <button className="btn btn-warning btn-lg" disabled>
                  Borrow Request Pending
                </button>
              ) : borrowStatus === "reserved-ready" ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', width: '100%'}}>
                  <button className="btn btn-success btn-lg" onClick={handleBorrowFromReservation}>
                    ✓ Borrow Now - Your Turn!
                  </button>
                  <button className="btn btn-outline-secondary" onClick={handleCancelReservation}>
                    Cancel Reservation
                  </button>
                  <p style={{fontSize: '0.85rem', color: '#059669', margin: 0}}>
                    You have {userReservation?.hoursRemaining || 48} hours to collect this book
                  </p>
                </div>
              ) : borrowStatus === "reserved" ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', width: '100%'}}>
                  <button className="btn btn-warning btn-lg" disabled>
                    Reserved - Position #{userReservation?.queuePosition || '?'}
                  </button>
                  <button className="btn btn-outline-secondary" onClick={handleCancelReservation}>
                    Cancel Reservation
                  </button>
                  <p style={{fontSize: '0.85rem', color: '#666', margin: 0}}>
                    {reservationQueueCount} {reservationQueueCount === 1 ? 'person' : 'people'} in queue
                  </p>
                </div>
              ) : book.available && !issuedInfo ? (
                <button 
                  className="btn btn-primary btn-lg" 
                  onClick={handleBorrow}
                  disabled={role !== 'librarian' && userBorrowedCount >= getMaxBorrowLimit()}
                >
                  {role === "librarian" ? "Issue" : "Borrow"}
                </button>
              ) : book.category !== "Digital Resource" ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px', width: '100%'}}>
                  <button className="btn btn-secondary btn-lg" onClick={handleReserve}>
                    {role === "librarian" ? "Reserve for Student" : "Join Reservation Queue"}
                  </button>
                  {reservationQueueCount > 0 && (
                    <p style={{fontSize: '0.85rem', color: '#666', margin: 0}}>
                      {reservationQueueCount} {reservationQueueCount === 1 ? 'person' : 'people'} already in queue
                    </p>
                  )}
                </div>
              ) : null}
              
              {!isGuest && role !== 'librarian' && userBorrowedCount >= getMaxBorrowLimit() && borrowStatus !== 'borrowed' && borrowStatus !== 'pending' && !borrowStatus?.includes('reserved') && (
                <p className="text-warning" style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                  You have reached your borrowing limit ({userBorrowedCount}/{getMaxBorrowLimit()})
                </p>
              )}
              
              {/* Digital PDF Download Section - Available for everyone including guests */}
              {digitalResources && digitalResources.length > 0 ? (
                <div style={{marginTop: '12px'}}>
                  {isGuest && (
                    <p style={{fontSize: '0.9rem', color: '#0369a1', marginBottom: '8px', fontWeight: '500'}}>
                      📚 Download available for all users
                    </p>
                  )}
                  {(book.availableCopies === 0 || (role !== 'librarian' && userBorrowedCount >= getMaxBorrowLimit())) && !isGuest && (
                    <p style={{fontSize: '0.9rem', color: '#ff6b6b', marginBottom: '8px', fontWeight: '500'}}>
                      ⚠️ {book.availableCopies === 0 ? 'Physical copies not available' : 'Borrowing limit reached'} - Read digital version below
                    </p>
                  )}
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {digitalResources.map((resource, index) => (
                      <a
                        key={index}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-lg"
                        style={{textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}
                      >
                        <span>📚</span>
                        Download {resource.resource_type || 'PDF'}
                        {resource.edition && resource.edition !== book.edition && (
                          <span style={{fontSize: '0.85rem', color: '#ff6600', fontWeight: '600'}}>
                            ({resource.edition} Edition)
                          </span>
                        )}
                        {resource.file_name && (
                          <span style={{fontSize: '0.8rem', opacity: 0.7}}>
                            {!resource.edition || resource.edition === book.edition ? `(${resource.file_name})` : ''}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              ) : book.category !== 'Digital Resource' && (
                <div style={{marginTop: '12px', padding: '12px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107'}}>
                  <p style={{fontSize: '0.9rem', color: '#856404', margin: 0, display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <span>📄</span>
                    <span>No digital version available for this book</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="book-details-content">
          <section className="book-section">
            <h2>Description</h2>
            <p className="book-description">{book.description}</p>
          </section>

          <section className="book-section">
            <h2>Book Information</h2>
            <div className="book-info-grid">
              <div className="info-item">
                <span className="info-label">ISBN:</span>
                <span className="info-value">{book.isbn}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Author:</span>
                <span className="info-value">{book.author}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Publisher:</span>
                <span className="info-value">{book.publisher || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Publication Year:</span>
                <span className="info-value">{book.publicationYear || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Edition:</span>
                <span className="info-value">{book.edition || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Category:</span>
                <span className="info-value">{book.category || 'N/A'}</span>
              </div>
              {book.category !== 'Digital Resource' && (
                <>
                  <div className="info-item">
                    <span className="info-label">Total Copies:</span>
                    <span className="info-value">{book.totalCopies}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Available Copies:</span>
                    <span className="info-value">{book.availableCopies}/{book.totalCopies}</span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Course Information Section */}
          {courseInfo && courseInfo.courses && courseInfo.courses.length > 0 && (
            <section className="book-section">
              <h2>Related Courses</h2>
              <div className="course-info-grid">
                {courseInfo.courses.map((course, index) => (
                  <div key={index} className="course-info-card">
                    <div className="course-code">{course.course_id}</div>
                    <div className="course-name">{course.course_name}</div>
                    <div className="course-semester">Semester {course.semester}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Copies Location Section */}
          {copies && copies.length > 0 && (
            <section className="book-section">
              <h2>Book Copies Location</h2>
              <div className="copies-table-container">
                <table className="copies-table">
                  <thead>
                    <tr>
                      <th>Copy ID</th>
                      <th>Shelf ID</th>
                      <th>Compartment</th>
                      <th>Sub-Compartment</th>
                      <th>Status</th>
                      <th>Condition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copies.map((copy, index) => (
                      <tr key={index}>
                        <td>{copy.copyId}</td>
                        <td>{copy.shelfId}</td>
                        <td>{copy.compartmentNo || 'N/A'}</td>
                        <td>{copy.subcompartmentNo || 'N/A'}</td>
                        <td>
                          <span className={`status-badge status-${copy.status.toLowerCase()}`}>
                            {copy.status}
                          </span>
                        </td>
                        <td>{copy.conditionNote || 'Good'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Prerequisite Books Section */}
          {courseInfo && courseInfo.prerequisite_books && courseInfo.prerequisite_books.length > 0 && (
            <section className="book-section">
              <h2>Recommended Reading (Prerequisites)</h2>
              <p className="section-subtitle">Books from prerequisite courses that may help with understanding this book:</p>
              <div className="prerequisite-books">
                {courseInfo.prerequisite_books.map((prereq, index) => (
                  <div 
                    key={index} 
                    className="prerequisite-book-card"
                    onClick={() => navigate(`/book/${prereq.isbn}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <img 
                      src={prereq.pic_path || "/placeholder.svg"} 
                      alt={prereq.title} 
                      className="prerequisite-book-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/placeholder.svg";
                      }}
                    />
                    <div className="prerequisite-book-info">
                      <h4>{prereq.title}</h4>
                      <p>{prereq.author}</p>
                      <span className="prereq-isbn">ISBN: {prereq.isbn}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {book.prerequisiteBooks && book.prerequisiteBooks.length > 0 && (
            <section className="book-section">
              <h2>Pre Requisite Books</h2>
              <div className="prerequisite-books">
                {book.prerequisiteBooks.map((prereq, index) => (
                  <div key={index} className="prerequisite-book-card">
                    <img 
                      src={prereq.cover || "https://placehold.co/200x300/cccccc/white?text=No+Cover"} 
                      alt={prereq.title} 
                      className="prerequisite-book-cover"
                    />
                    <div className="prerequisite-book-info">
                      <h4>{prereq.title}</h4>
                      <p>{prereq.author}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Borrow Confirmation Modal */}
        {showBorrowModal && (
          <div className="modal-overlay" onClick={() => setShowBorrowModal(false)}>
            <div className="modal-content borrow-modal" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close-top" onClick={() => setShowBorrowModal(false)}>
                ×
              </button>
              
              {role === "librarian" ? (
                <>
                  <div className="modal-header">
                    <h3>Confirm Issue</h3>
                  </div>
                  <div className="modal-body">
                    <div className="confirm-book-info">
                      <img 
                        src={book.cover || "/placeholder.svg"} 
                        alt={book.title} 
                        className="confirm-book-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "/placeholder.svg";
                        }}
                      />
                      <div>
                        <h4>{book.title}</h4>
                        <p className="text-secondary">{book.author}</p>
                      </div>
                    </div>
                    <div className="borrow-details">
                      <div className="borrow-detail-row">
                        <span>Student ID</span>
                        <input
                          type="text"
                          placeholder="e.g., 2019-1-60-001"
                          value={issueStudentId}
                          onChange={(e) => setIssueStudentId(e.target.value)}
                          className="input"
                          style={{ width: "100%" }}
                        />
                      </div>
                      <div className="borrow-detail-row">
                        <span>Due Date</span>
                        <input
                          type="date"
                          value={issueDueDate}
                          onChange={(e) => setIssueDueDate(e.target.value)}
                          className="input"
                        />
                      </div>
                    </div>
                    <div className="modal-actions">
                      <button className="btn btn-secondary" onClick={() => setShowBorrowModal(false)}>
                        Cancel
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={confirmBorrow}
                        disabled={!issueStudentId.trim()}
                      >
                        Issue
                      </button>
                    </div>
                    {!issueStudentId.trim() && (
                      <p className="text-secondary" style={{ marginTop: 8 }}>Enter Student ID to enable issuing.</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="modal-book-header">
                    <img 
                      src={book.cover || "/placeholder.svg"} 
                      alt={book.title} 
                      className="modal-book-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/placeholder.svg";
                      }}
                    />
                    <div className="modal-book-info">
                      <h3>{book.title}</h3>
                      <p className="modal-book-author">{book.author}</p>
                    </div>
                  </div>

                  <div className="modal-details-grid">
                    <div className="modal-detail-item">
                      <span className="modal-detail-label">Your Role</span>
                      <span className="modal-detail-value">{userRole || 'Student'}</span>
                    </div>
                    <div className="modal-detail-item">
                      <span className="modal-detail-label">Due Date</span>
                      <span className="modal-detail-value">{getDueDate()}</span>
                    </div>
                    <div className="modal-detail-item">
                      <span className="modal-detail-label">Borrowing limit:</span>
                      <span className="modal-detail-value">{userBorrowedCount}/{getMaxBorrowLimit()}</span>
                    </div>
                  </div>

                  <div className="modal-actions-centered">
                    <button className="btn btn-outline-secondary btn-modal" onClick={() => setShowBorrowModal(false)}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary btn-modal"
                      onClick={confirmBorrow}
                      disabled={userBorrowedCount >= getMaxBorrowLimit()}
                    >
                      Confirm
                    </button>
                  </div>
                  
                  {userBorrowedCount >= getMaxBorrowLimit() && (
                    <p className="text-warning" style={{ marginTop: 8, textAlign: 'center' }}>
                      You have reached your borrowing limit. Please return a book first.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Reserve Confirmation Modal */}
        {showReserveModal && (
          <div className="modal-overlay" onClick={() => setShowReserveModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Confirm Reserve</h3>
                <button className="modal-close" onClick={() => setShowReserveModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="confirm-book-info">
                  <img 
                    src={book.cover || "/placeholder.svg"} 
                    alt={book.title} 
                    className="confirm-book-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/placeholder.svg";
                    }}
                  />
                  <div>
                    <h4>{book.title}</h4>
                    <p className="text-secondary">{book.author}</p>
                  </div>
                </div>
                <div className="borrow-details">
                  <div className="borrow-detail-row">
                    <span>Your Role</span>
                    <strong>{role === "librarian" ? "Librarian" : userRole === "professor" ? "Professor" : "Student"}</strong>
                  </div>
                  {role === "librarian" && (
                    <div className="borrow-detail-row">
                      <span>Student ID</span>
                      <input
                        type="text"
                        placeholder="e.g., 2019-1-60-001"
                        value={issueStudentId}
                        onChange={(e) => setIssueStudentId(e.target.value)}
                        className="input"
                        style={{ width: "100%" }}
                      />
                    </div>
                  )}
                  <div className="borrow-detail-row">
                    <span>Expected Return Date</span>
                    <strong>{book.expectedReturnDate ? new Date(book.expectedReturnDate).toLocaleDateString() : 'Not Available'}</strong>
                  </div>
                  <div className="borrow-detail-row">
                    <span>Queue Position</span>
                    <strong>{reservationQueueCount > 0 ? `You will be #${reservationQueueCount + 1} in queue` : 'You will be first in queue'}</strong>
                  </div>
                  <div style={{padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', marginTop: '12px'}}>
                    <p style={{fontSize: '0.9rem', color: '#0369a1', margin: 0}}>
                      📢 You will be notified when this book becomes available. You'll have 48 hours to collect it.
                    </p>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn btn-secondary" onClick={() => setShowReserveModal(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={confirmReserve}>
                    {role === "librarian" ? "Reserve for Student" : "Join Queue"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Reservation Ready Modal - Auto-shown when book is ready to collect */}
        {showReservationReadyModal && (
          <div className="modal-overlay" onClick={() => setShowReservationReadyModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>🎉 Your Reserved Book is Ready!</h3>
                <button className="modal-close" onClick={() => setShowReservationReadyModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="confirm-book-info">
                  <img 
                    src={book.cover || "/placeholder.svg"} 
                    alt={book.title} 
                    className="confirm-book-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/placeholder.svg";
                    }}
                  />
                  <div>
                    <h4>{book.title}</h4>
                    <p className="text-secondary">{book.author}</p>
                  </div>
                </div>
                <div style={{padding: '16px', backgroundColor: '#d1fae5', borderRadius: '8px', marginTop: '16px'}}>
                  <p style={{fontSize: '1rem', color: '#065f46', margin: 0, fontWeight: '500'}}>
                    ✓ Great news! The book you reserved is now available for borrowing.
                  </p>
                  <p style={{fontSize: '0.9rem', color: '#047857', marginTop: '8px', marginBottom: 0}}>
                    You have <strong>{userReservation?.hoursRemaining || 48} hours</strong> to borrow this book or your reservation will be cancelled.
                  </p>
                </div>
                <div className="borrow-details" style={{marginTop: '16px'}}>
                  <div className="borrow-detail-row">
                    <span>Your Borrowing Limit</span>
                    <strong>{userBorrowedCount}/{getMaxBorrowLimit()}</strong>
                  </div>
                  <div className="borrow-detail-row">
                    <span>Loan Period</span>
                    <strong>{(userRole === 'Teacher' || userRole === 'Director') ? '15 days' : '7 days'}</strong>
                  </div>
                </div>
                <div className="modal-actions" style={{marginTop: '20px'}}>
                  <button className="btn btn-secondary" onClick={() => setShowReservationReadyModal(false)}>
                    Later
                  </button>
                  <button 
                    className="btn btn-primary btn-lg" 
                    onClick={handleBorrowFromReservation}
                    disabled={userBorrowedCount >= getMaxBorrowLimit()}
                  >
                    Borrow Now
                  </button>
                </div>
                {userBorrowedCount >= getMaxBorrowLimit() && (
                  <p className="text-warning" style={{ marginTop: 12, textAlign: 'center', fontSize: '0.9rem' }}>
                    You have reached your borrowing limit. Please return a book first.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Copy selection removed - librarian assigns copy during approval */}
      </div>

      <BottomNav userRole={userRole} />
    </div>
  )
}

export default BookDetails
