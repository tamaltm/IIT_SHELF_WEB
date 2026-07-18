"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import PageTransition from "../components/PageTransition"
import { booksApi } from "../api/books"
import { borrowApi } from "../api/borrow"
import "./Search.css"

function Search({ user, userRole, onLogout }) {
  const isGuest = !user
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("") // For immediate input display
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(false)

  // Filters — flat, always-expanded sections (matches design)
  const [filters, setFilters] = useState({
    categories: [],
    availability: "all", // all | available | onhold | ebook
    bookTypes: [], // physical | ebook | reference
    semester: "",
  })
  const [issuedMap, setIssuedMap] = useState({})
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    semesters: [],
  })
  const [showBorrowModal, setShowBorrowModal] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const [userBorrowedCount, setUserBorrowedCount] = useState(0)
  const [pendingRequests, setPendingRequests] = useState([])
  const [borrowedBooks, setBorrowedBooks] = useState([])
  const [activeResultsTab, setActiveResultsTab] = useState("all")
  const [sortBy, setSortBy] = useState("relevance")
  const [viewMode, setViewMode] = useState("grid")

  // Load issued state map from localStorage once
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("iitshelf_issuedBooks")
      setIssuedMap(raw ? JSON.parse(raw) : {})
    } catch {
      setIssuedMap({})
    }

    // Load filter options from backend
    fetchFilterOptions()
  }, [])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchInput])

  // Refetch books whenever filters or searchQuery changes
  useEffect(() => {
    fetchBooks()
  }, [filters, searchQuery])

  // Fetch user's pending and borrowed books (skip for guests)
  useEffect(() => {
    if (user?.email && userRole !== "librarian" && userRole !== "director") {
      fetchUserBorrowStatus()
    }
  }, [user, userRole])

  const fetchUserBorrowStatus = async () => {
    if (isGuest) return
    try {
      const data = await borrowApi.getUserTransactions(user.email)
      if (data.success) {
        const borrowed = data.transactions?.filter((t) => t.status === "Borrowed") || []
        const pending = data.transactions?.filter((t) => t.status === "Pending") || []
        setUserBorrowedCount(borrowed.length)
        setBorrowedBooks(borrowed)
        setPendingRequests(pending)
      }
    } catch (error) {
      console.error("Error fetching user borrow status:", error)
      setUserBorrowedCount(0)
      setBorrowedBooks([])
      setPendingRequests([])
    }
  }

  const getDueDate = () => {
    const today = new Date()
    const loanDays = userRole === "Teacher" || userRole === "Director" ? 15 : 7
    today.setDate(today.getDate() + loanDays)
    return today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
  }

  const getMaxBorrowLimit = () => {
    return userRole === "Teacher" || userRole === "Director" ? 5 : 2
  }

  const getBookStatus = (isbn) => {
    if (isGuest) return null
    if (borrowedBooks.some((b) => b.isbn === isbn)) return "borrowed"
    if (pendingRequests.some((r) => r.isbn === isbn)) return "pending"
    return null
  }

  const fetchFilterOptions = async () => {
    try {
      const data = await booksApi.getCategories()

      if (data.success) {
        setFilterOptions({
          categories: data.categories || [],
          semesters: data.semesters || [],
        })
      }
    } catch (error) {
      console.error("Error fetching filter options:", error)
      setFilterOptions({ categories: [], semesters: [] })
    }
  }

  const fetchBooks = async () => {
    setLoading(true)
    try {
      const params = {}

      if (searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      // Category (only first selected, backend supports single category)
      if (filters.categories.length > 0) {
        params.category = filters.categories[0]
      }

      // Availability
      if (filters.availability !== "all") {
        const availabilityMap = {
          available: "Available",
          onhold: "Not Available",
          ebook: "Available",
        }
        params.availability = availabilityMap[filters.availability] || filters.availability
        if (filters.availability === "ebook") {
          params.book_type = "Digital"
        }
      }

      // Book type (Physical Copy / E-Book / Reference Only — only first selected used)
      if (filters.bookTypes.length > 0) {
        const bookTypeMap = {
          physical: "Physical",
          ebook: "Digital",
          reference: "Reference",
        }
        params.book_type = bookTypeMap[filters.bookTypes[0]] || filters.bookTypes[0]
      }

      // Semester
      if (filters.semester) {
        params.semester = filters.semester
      }

      const data = await booksApi.getBooks(params)

      if (data.success) {
        const mappedBooks = (data.books || []).map((book) => ({
          ...book,
          id: book.isbn || book.id,
          availableCopies: book.copies_available || 0,
          totalCopies: book.copies_total || 0,
          available: book.copies_available > 0,
          waitingCount: book.waiting_count || book.pending_count || 0,
          cover: book.pic_path ? `/api/serve_image.php?path=${book.pic_path}` : "/placeholder.svg",
        }))
        setBooks(mappedBooks)
      } else {
        console.error("Failed to fetch books:", data.message)
        setBooks([])
      }
    } catch (error) {
      console.error("Error fetching books:", error)
      setBooks([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => {
      if (filterType === "categories" || filterType === "bookTypes") {
        const currentValues = prev[filterType]
        const newValues = currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value]
        return { ...prev, [filterType]: newValues }
      }
      return { ...prev, [filterType]: value }
    })
  }

  const resetFilters = () => {
    setFilters({
      categories: [],
      availability: "all",
      bookTypes: [],
      semester: "",
    })
    setSearchInput("")
    setSearchQuery("")
  }

  const handleBorrowRequest = async (book) => {
    if (isGuest) {
      alert("Please login to borrow books")
      return
    }

    if (!user || !user.email) {
      alert("Please login to borrow books")
      return
    }

    if (userRole === "librarian") {
      alert("Librarians cannot borrow books. Please use the Issue feature for students.")
      return
    }

    setSelectedBook(book)

    try {
      const data = await booksApi.getBookStatus(book.isbn)

      if (!data.success) {
        console.error("API error:", data.message)
        alert(data.message || "Error checking book availability")
        return
      }

      if (data.success && data.available && data.copies_available > 0) {
        setShowBorrowModal(true)
      } else {
        alert("No copies available for borrowing at this time.")
      }
    } catch (error) {
      console.error("Error checking book availability:", error)
      alert("Network error. Please try again.")
    }
  }

  const confirmBorrowRequest = async () => {
    if (!selectedBook) return

    try {
      const data = await borrowApi.requestBorrow({
        isbn: selectedBook.isbn,
        user_email: user.email,
        copy_id: null, // Librarian will assign the copy during approval
      })

      if (data.success) {
        alert("✓ Borrow request submitted successfully!\n\nYour request is pending librarian approval.")
        setShowBorrowModal(false)
        setSelectedBook(null)
        fetchUserBorrowStatus()
        fetchBooks()
      } else {
        alert("Error: " + data.message)
      }
    } catch (error) {
      console.error("Borrow request error:", error)
      alert("Network error. Please make sure the backend server is running.")
    }
  }

  return (
    <PageTransition className="search-page">
      <Header user={user} onLogout={onLogout} />

      <div className="search-header">
        <div className="search-header-inner">
          <div className="search-subtitle">IIT DIGITAL LIBRARY</div>
          <h1 className="search-title">Find Your Next Read</h1>
          <div className="search-bar-container">
            <input
              type="text"
              className="search-input"
              placeholder="Search for books, authors, ISBN..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <button className="search-btn" disabled={loading}>
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          <div className="popular-tags">
            <span className="popular-label">Popular:</span>
            <button className="tag" onClick={() => setSearchInput("BSSE Syllabus")}>
              BSSE Syllabus
            </button>
            <button className="tag" onClick={() => setSearchInput("Discrete Math")}>
              Discrete Math
            </button>
            <button className="tag" onClick={() => setSearchInput("IEEE Papers")}>
              IEEE Papers
            </button>
            <button className="tag" onClick={() => setSearchInput("Calculus")}>
              Calculus
            </button>
          </div>
        </div>
      </div>

      <div className="search-container">
        <div className="search-content-wrapper">
          {/* ---------- Filters sidebar (flat, always expanded) ---------- */}
          <div className="filters-sidebar">
            <div className="filters-sidebar-header">
              <h3>Filters</h3>
              <button onClick={resetFilters} className="reset-btn">
                Reset all
              </button>
            </div>

            {/* Category */}
            <div className="filter-section">
              <h4 className="filter-section-label">Category</h4>
              <div className="filter-options">
                {filterOptions.categories.length === 0 ? (
                  <p className="filter-loading">Loading...</p>
                ) : (
                  filterOptions.categories.map((cat) => (
                    <label key={cat} className="filter-checkbox">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(cat)}
                        onChange={() => handleFilterChange("categories", cat)}
                      />
                      <span>{cat}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Availability */}
            <div className="filter-section">
              <h4 className="filter-section-label">Availability</h4>
              <div className="filter-options">
                <label className="filter-checkbox">
                  <input
                    type="radio"
                    name="availability"
                    checked={filters.availability === "all"}
                    onChange={() => handleFilterChange("availability", "all")}
                  />
                  <span>All</span>
                </label>
                <label className="filter-checkbox">
                  <input
                    type="radio"
                    name="availability"
                    checked={filters.availability === "available"}
                    onChange={() => handleFilterChange("availability", "available")}
                  />
                  <span>Available Now</span>
                </label>
                <label className="filter-checkbox">
                  <input
                    type="radio"
                    name="availability"
                    checked={filters.availability === "onhold"}
                    onChange={() => handleFilterChange("availability", "onhold")}
                  />
                  <span>On Hold</span>
                </label>
                <label className="filter-checkbox">
                  <input
                    type="radio"
                    name="availability"
                    checked={filters.availability === "ebook"}
                    onChange={() => handleFilterChange("availability", "ebook")}
                  />
                  <span>PDF / E-Book</span>
                </label>
              </div>
            </div>

            {/* Semester (dropdown) */}
            <div className="filter-section">
              <h4 className="filter-section-label">Semester</h4>
              <select
                className="filter-select"
                value={filters.semester}
                onChange={(e) => handleFilterChange("semester", e.target.value)}
              >
                <option value="">All Semesters</option>
                {filterOptions.semesters &&
                  filterOptions.semesters.map((sem) => (
                    <option key={sem} value={String(sem)}>
                      {sem}
                    </option>
                  ))}
              </select>
            </div>

            {/* Book Type */}
            <div className="filter-section">
              <h4 className="filter-section-label">Book Type</h4>
              <div className="filter-options">
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.bookTypes.includes("physical")}
                    onChange={() => handleFilterChange("bookTypes", "physical")}
                  />
                  <span>Physical Copy</span>
                </label>
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.bookTypes.includes("ebook")}
                    onChange={() => handleFilterChange("bookTypes", "ebook")}
                  />
                  <span>E-Book / PDF</span>
                </label>
                <label className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={filters.bookTypes.includes("reference")}
                    onChange={() => handleFilterChange("bookTypes", "reference")}
                  />
                  <span>Reference Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* ---------- Results ---------- */}
          <div className="books-section">
            <div className="results-header">
              <div className="results-info">
                <h2 className="results-title">
                  Results for "{searchQuery || "All Books"}"
                </h2>
                <span className="results-count">{books.length} books found</span>
              </div>
              <div className="results-controls">
                <div className="sort-dropdown">
                  <label>Sort:</label>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="relevance">Relevance</option>
                    <option value="newest">Newest</option>
                    <option value="title">Title A-Z</option>
                    <option value="author">Author A-Z</option>
                  </select>
                </div>
                <div className="view-mode-toggle">
                  <button
                    className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                    onClick={() => setViewMode("grid")}
                    title="Grid view"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                    </svg>
                  </button>
                  <button
                    className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                    onClick={() => setViewMode("list")}
                    title="List view"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6"></line>
                      <line x1="8" y1="12" x2="21" y2="12"></line>
                      <line x1="8" y1="18" x2="21" y2="18"></line>
                      <line x1="3" y1="6" x2="3.01" y2="6"></line>
                      <line x1="3" y1="12" x2="3.01" y2="12"></line>
                      <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="results-tabs">
              <button
                className={`results-tab ${activeResultsTab === "all" ? "active" : ""}`}
                onClick={() => setActiveResultsTab("all")}
              >
                All Results
              </button>
              <button
                className={`results-tab ${activeResultsTab === "new" ? "active" : ""}`}
                onClick={() => setActiveResultsTab("new")}
              >
                New Arrivals
              </button>
              <button
                className={`results-tab ${activeResultsTab === "collections" ? "active" : ""}`}
                onClick={() => setActiveResultsTab("collections")}
              >
                Collections
              </button>
            </div>

            <div className={`books-grid ${viewMode === "list" ? "list-view" : ""}`}>
              {loading ? (
                <div className="loading-message">Searching for books...</div>
              ) : books.length === 0 ? (
                <div className="no-results-message">No books found. Try adjusting your search or filters.</div>
              ) : (
                books.map((book) => {
                  const isOnHold = book.availableCopies === 0 && book.totalCopies > 0
                  return (
                    <Link key={book.id} to={`/book/${book.isbn}`} className="book-card-link">
                      <div className="book-card">
                        <div className="book-cover-wrapper">
                          <img
                            src={book.cover || "/placeholder.svg"}
                            alt={book.title}
                            className="book-cover"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = "/placeholder.svg"
                            }}
                          />
                          <button
                            className="bookmark-btn"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                            }}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                          </button>

                          <div className="badge-stack">
                            {book.availableCopies > 0 && <span className="status-badge available">Available</span>}
                            {isOnHold && (
                              <span className="status-badge onhold">On Hold ({book.waitingCount || 0})</span>
                            )}
                            {book.category === "Digital Resource" && (
                              <span className="status-badge pdf-only">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M4 2h11l5 5v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />
                                </svg>
                                PDF Only
                              </span>
                            )}
                            {book.category === "Reference" && <span className="status-badge reference">Reference</span>}
                          </div>
                        </div>
                        <div className="book-info">
                          <h3 className="book-title">{book.title}</h3>
                          <p className="book-author">by {book.author}</p>
                          <div className="book-meta">
                            <div className="book-rating">
                              <span className="star">★</span>
                              <span>{book.rating || "4.0"}</span>
                            </div>
                            <div className="book-views">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                              <span>{(book.views || 1000).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="book-copies">
                            {book.availableCopies > 0 ? (
                              <span>
                                {book.availableCopies} / {book.totalCopies} copies
                              </span>
                            ) : isOnHold ? (
                              <span className="waiting-count">{book.waitingCount || 0} waiting</span>
                            ) : null}
                          </div>
                          <div className="book-actions">
                            {(() => {
                              const bookStatus = getBookStatus(book.isbn)

                              if (isGuest) {
                                return (
                                  <button className="btn btn-borrow btn-guest">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                      <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    Login to Borrow
                                  </button>
                                )
                              } else if (bookStatus === "borrowed") {
                                return (
                                  <button className="btn btn-borrow" disabled>
                                    Borrowed
                                  </button>
                                )
                              } else if (bookStatus === "pending") {
                                return (
                                  <button className="btn btn-borrow" disabled>
                                    Pending
                                  </button>
                                )
                              } else if (book.availableCopies > 0) {
                                if (userRole === "librarian") {
                                  return <span className="btn btn-borrow btn-primary">Issue</span>
                                } else {
                                  return (
                                    <button
                                      className="btn btn-borrow"
                                      onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        handleBorrowRequest(book)
                                      }}
                                      disabled={userBorrowedCount >= getMaxBorrowLimit()}
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                                        <polyline points="10 17 15 12 10 7"></polyline>
                                        <line x1="15" y1="12" x2="3" y2="12"></line>
                                      </svg>
                                      Borrow
                                    </button>
                                  )
                                }
                              } else {
                                return (
                                  <button className="btn btn-borrow" disabled>
                                    Unavailable
                                  </button>
                                )
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })
              )}
            </div>

            {books.length > 0 && (
              <div className="pagination">
                <button className="page-btn" disabled>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
                <button className="page-btn active">1</button>
                <button className="page-btn">2</button>
                <button className="page-btn">3</button>
                <span className="page-ellipsis">...</span>
                <button className="page-btn">8</button>
                <button className="page-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Borrow Confirmation Modal */}
      {showBorrowModal && selectedBook && (
        <div className="modal-overlay" onClick={() => setShowBorrowModal(false)}>
          <div className="modal-content borrow-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-top" onClick={() => setShowBorrowModal(false)}>
              ×
            </button>

            <div className="modal-book-header">
              <img
                src={selectedBook.cover || "/placeholder.svg"}
                alt={selectedBook.title}
                className="modal-book-cover"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = "/placeholder.svg"
                }}
              />
              <div className="modal-book-info">
                <h3>{selectedBook.title}</h3>
                <p className="modal-book-author">{selectedBook.author}</p>
              </div>
            </div>

            <div className="modal-details-grid">
              <div className="modal-detail-item">
                <span className="modal-detail-label">Your Role</span>
                <span className="modal-detail-value">{userRole || "Student"}</span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Due Date</span>
                <span className="modal-detail-value">{getDueDate()}</span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Borrowing limit:</span>
                <span className="modal-detail-value">
                  {userBorrowedCount}/{getMaxBorrowLimit()}
                </span>
              </div>
            </div>

            <div className="modal-actions-centered">
              <button className="btn btn-outline-secondary btn-modal" onClick={() => setShowBorrowModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary btn-modal"
                onClick={confirmBorrowRequest}
                disabled={userBorrowedCount >= getMaxBorrowLimit()}
              >
                Confirm
              </button>
            </div>

            {userBorrowedCount >= getMaxBorrowLimit() && (
              <p className="text-warning" style={{ marginTop: 8, textAlign: "center" }}>
                You have reached your borrowing limit. Please return a book first.
              </p>
            )}
          </div>
        </div>
      )}

      <BottomNav userRole={userRole} />
    </PageTransition>
  )
}

export default Search