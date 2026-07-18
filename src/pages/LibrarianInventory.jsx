"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import "./LibrarianInventory.css"

function LibrarianInventory({ user, onLogout }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [sortBy, setSortBy] = useState('title')
  const [sortOrder, setSortOrder] = useState('ASC')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [pagination, setPagination] = useState({})
  const [categories, setCategories] = useState([])
  
  const [viewMode, setViewMode] = useState('table') // 'table' or 'cards'
  const [showAddBookModal, setShowAddBookModal] = useState(false)
  const [showEditBookModal, setShowEditBookModal] = useState(false)
  const [showAddShelfModal, setShowAddShelfModal] = useState(false)
  const [showRemoveShelfModal, setShowRemoveShelfModal] = useState(false)
  const [shelfForm, setShelfForm] = useState({
    shelf_id: '',
    compartment: '',
    subcompartment: ''
  })
  const [selectedBook, setSelectedBook] = useState(null)
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [coverPreview, setCoverPreview] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [newBook, setNewBook] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    publisher: '',
    publication_year: '',
    edition: '',
    description: '',
    pic_path: '',
    pdf_url: ''
  })

  // Additional state used by forms and validation
  const [physicalCopies, setPhysicalCopies] = useState([])
  const [courseIdsInput, setCourseIdsInput] = useState('')
  const [invalidCourseIds, setInvalidCourseIds] = useState([])
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfEdition, setPdfEdition] = useState('')
  const [bookType, setBookType] = useState('physical') // 'physical' or 'digital'
  const [numberOfCopies, setNumberOfCopies] = useState(1)
  const [conditionNote, setConditionNote] = useState('')
  const [copyFields, setCopyFields] = useState([]) // Array of {copyId: '', shelfLocation: ''} for NEW copies
  const [existingCopies, setExistingCopies] = useState([]) // Array of existing copies from DB

  // Shelves and compartments (optional; used for physical copy placement)
  const [shelves, setShelves] = useState([])
  const [shelfLocations, setShelfLocations] = useState([]) // Available shelf locations
  const [availableCompartments, setAvailableCompartments] = useState({})
  const [availableSubCompartments, setAvailableSubCompartments] = useState({})

  // Course selection (fetched from backend)
  const [courses, setCourses] = useState([])
  // Multi-select support: selectedCourseIds is an array
  const [selectedCourseIds, setSelectedCourseIds] = useState([])

  // Watch for changes in numberOfCopies and adjust copyFields array
  useEffect(() => {
    const count = parseInt(numberOfCopies) || 0
    setCopyFields(prev => {
      const newFields = [...prev]
      // Add new empty fields if needed
      while (newFields.length < count) {
        newFields.push({ copyId: '', shelfLocation: '' })
      }
      // Remove extra fields if needed
      while (newFields.length > count) {
        newFields.pop()
      }
      return newFields
    })
  }, [numberOfCopies])

  // Fetch shelf locations
  useEffect(() => {
    async function fetchShelfLocations() {
      try {
        const resp = await fetch('/api/librarian/manage_shelves.php')
        const data = await resp.json()
        if (data.success && Array.isArray(data.shelves)) {
          // Filter out any invalid entries (missing required fields)
          const validShelves = data.shelves.filter(shelf => 
            shelf.shelf_id && shelf.compartment && shelf.subcompartment
          )
          setShelfLocations(validShelves)
        }
      } catch (e) {
        console.error('Error fetching shelf locations:', e)
      }
    }
    fetchShelfLocations()
  }, [])

  // Trigger inventory fetch on filter/sort/pagination changes
  useEffect(() => {
    // fetchInventory is defined below; effect runs after render
    if (typeof fetchInventory === 'function') {
      fetchInventory()
    }
  }, [searchQuery, selectedCategory, availabilityFilter, sortBy, sortOrder, currentPage, itemsPerPage])

  // Fetch available courses for dropdowns
  useEffect(() => {
    async function fetchCourses() {
      try {
        const resp = await fetch('/api/courses/list_courses.php')
        const data = await resp.json()
        if (data.success && Array.isArray(data.courses)) {
          setCourses(data.courses)
        }
      } catch (e) {
        console.error('Error fetching courses:', e)
      }
    }
    fetchCourses()
  }, [])

  // Fetch categories from database
  useEffect(() => {
    async function fetchCategories() {
      try {
        const resp = await fetch('/api/books/get_categories.php')
        const data = await resp.json()
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories)
        }
      } catch (e) {
        console.error('Error fetching categories:', e)
      }
    }
    fetchCategories()
  }, [])

  // Fetch inventory list from backend
  async function fetchInventory() {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (searchQuery && searchQuery.trim()) params.set('search', searchQuery.trim())
      if (selectedCategory) params.set('category', selectedCategory)
      // Optional params; backend may ignore if unsupported
      if (availabilityFilter) params.set('availability', availabilityFilter)
      if (sortBy) params.set('sortBy', sortBy)
      if (sortOrder) params.set('sortOrder', sortOrder)
      params.set('page', String(currentPage))
      params.set('per_page', String(itemsPerPage))

      const resp = await fetch(`/api/books/get_books.php?${params.toString()}`)
      const data = await resp.json()

      const booksData = data.books || data.data || []
      setBooks(booksData)
      setPagination(
        data.pagination || {
          total: Array.isArray(booksData) ? booksData.length : 0,
          total_pages: 1
        }
      )
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBook = async (e) => {
    e.preventDefault()
    
    try {
      let response;
      
      // Selected course IDs (array, optional)
      const courseIds = selectedCourseIds.filter(id => id && id.trim() !== '')
      
                      // Use FormData if files are provided (PDF or cover image)
                      if (pdfFile || coverFile) {
                        const formData = new FormData()
                        formData.append('isbn', newBook.isbn)
                        formData.append('title', newBook.title)
                        formData.append('author', newBook.author || '')
                        formData.append('category', newBook.category || '')
                        formData.append('publisher', newBook.publisher || '')
                        formData.append('publication_year', newBook.publication_year || '')
                        formData.append('edition', newBook.edition || '')
                        formData.append('description', newBook.description || '')
                        
                        // Handle cover image
                        if (coverFile) {
                          formData.append('image', coverFile)
                        } else if (newBook.pic_path) {
                          formData.append('pic_path', newBook.pic_path)
                        }
                        
                        // Handle PDF file upload
                        if (pdfFile) {
                          formData.append('pdf_file', pdfFile) // Send actual PDF file
                        }
        
        // Handle physical copies
        if (physicalCopies.length > 0) {
          const copyIds = physicalCopies.map(c => c.copy_id).filter(id => id)
          if (copyIds.length > 0) {
            formData.append('copy_ids', JSON.stringify(copyIds))
            formData.append('copy_locations', JSON.stringify(physicalCopies))
          }
          formData.append('copies_total', String(physicalCopies.length))
        }
        
        // Send course_ids as JSON array
        if (courseIds.length > 0) formData.append('course_ids', JSON.stringify(courseIds))
        formData.append('condition_note', conditionNote || '')
        
        response = await fetch('/api/books/add_book.php', {
          method: 'POST',
          body: formData
        })
      } else {
        const bookData = {
          isbn: newBook.isbn,
          title: newBook.title,
          author: newBook.author || '',
          category: newBook.category || '',
          publisher: newBook.publisher || '',
          publication_year: newBook.publication_year || '',
          edition: newBook.edition || '',
          description: newBook.description || '',
          pic_path: newBook.pic_path || '',
          ...(courseIds.length > 0 ? { course_ids: courseIds } : {})
        }
        
        // Handle physical copies for JSON request
        if (physicalCopies.length > 0) {
          const copyIds = physicalCopies.map(c => c.copy_id).filter(id => id)
          if (copyIds.length > 0) {
            bookData.copy_ids = copyIds
            bookData.copy_locations = physicalCopies
          }
          bookData.copies_total = physicalCopies.length
        }
        
        if (conditionNote) {
          bookData.condition_note = conditionNote
        }
        
        response = await fetch('/api/books/add_book.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookData)
        })
      }
      
      const data = await response.json()
      
      if (data.success) {
        alert('✓ Book added successfully!')
        setShowAddBookModal(false)
        setNewBook({
          title: '', author: '', isbn: '', category: '', publisher: '',
          publication_year: '', edition: '', description: '', pic_path: ''
        })
        setPhysicalCopies([])
        setSelectedCourseIds([])
        setCoverPreview('')
        setCoverFile(null)
        setPdfFile(null)
        setPdfEdition('')
        setConditionNote('')
        setInvalidCourseIds([])
        fetchInventory()
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error adding book:', error)
      alert('Network error. Please check the backend server.')
    }
  }

  const addPhysicalCopy = () => {
    setPhysicalCopies([...physicalCopies, {
      copy_id: '',
      shelf_id: '',
      compartment_no: '',
      subcompartment_no: '',
      condition_note: ''
    }])
  }

  const removePhysicalCopy = (index) => {
    setPhysicalCopies(physicalCopies.filter((_, i) => i !== index))
  }

  const updatePhysicalCopy = (index, field, value) => {
    const updated = [...physicalCopies]
    updated[index][field] = value
    setPhysicalCopies(updated)
  }

  const handleAddShelf = async (e) => {
    e.preventDefault()
    
    if (!shelfForm.shelf_id || !shelfForm.compartment || !shelfForm.subcompartment) {
      alert('All fields are required')
      return
    }
    
    try {
      const response = await fetch('/api/librarian/manage_shelves.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shelf_id: shelfForm.shelf_id,
          compartment: shelfForm.compartment,
          subcompartment: shelfForm.subcompartment
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✓ Shelf added successfully!')
        setShowAddShelfModal(false)
        setShelfForm({ shelf_id: '', compartment: '', subcompartment: '' })
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error adding shelf:', error)
      alert('Network error. Please try again.')
    }
  }

  const handleRemoveShelf = async (e) => {
    e.preventDefault()
    
    if (!shelfForm.shelf_id || !shelfForm.compartment || !shelfForm.subcompartment) {
      alert('All fields are required')
      return
    }
    
    try {
      const response = await fetch('/api/librarian/manage_shelves.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shelf_id: shelfForm.shelf_id,
          compartment: shelfForm.compartment,
          subcompartment: shelfForm.subcompartment
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✓ Shelf removed successfully!')
        setShowRemoveShelfModal(false)
        setShelfForm({ shelf_id: '', compartment: '', subcompartment: '' })
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error removing shelf:', error)
      alert('Network error. Please try again.')
    }
  }

  const handleDeleteBook = async (isbn) => {
    if (!confirm(`Are you sure you want to delete this book (${isbn})?`)) return
    
    try {
      const response = await fetch('/api/books/delete_book.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isbn })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✓ Book deleted successfully!')
        fetchInventory()
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      console.error('Error deleting book:', error)
      alert('Network error.')
    }
  }

  const handleEditBook = async (book) => {
    console.log('Edit book clicked - book data:', book)
    setSelectedBook(book)
    setNewBook({
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      category: book.category || '',
      publisher: book.publisher || '',
      publication_year: book.publication_year || '',
      edition: book.edition || '',
      description: book.description || '',
      pic_path: book.pic_path || '',
      pdf_url: book.pdf_path || ''
    })
    console.log('Setting PDF URL to:', book.pdf_path || '(empty)')
    console.log('Setting ISBN to:', book.isbn)
    // Only preview if it's a valid absolute URL; otherwise don't preview
    const picPath = book.pic_path || ''
    const isValidUrl = picPath.startsWith('http')
    setCoverPreview(isValidUrl ? picPath : '')
    setPdfFile(null) // Reset PDF for editing
    setCoverFile(null) // Reset cover file for editing
    setInvalidCourseIds([]) // Reset validation
    
    // Fetch existing courses for this book
    setSelectedCourseIds([])
    try {
      const coursesResponse = await fetch(`/api/books/get_book_courses.php?isbn=${encodeURIComponent(book.isbn)}`)
      const coursesData = await coursesResponse.json()
      if (coursesData.success && coursesData.courses) {
        const existingCourseIds = coursesData.courses.map(c => c.course_id)
        setSelectedCourseIds(existingCourseIds)
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
    
    // Fetch existing copies from database
    try {
      const response = await fetch(`/api/books/get_book_copies.php?isbn=${encodeURIComponent(book.isbn)}`)
      const data = await response.json()
      if (data.success) {
        setExistingCopies(data.copies || [])
      } else {
        setExistingCopies([])
      }
    } catch (error) {
      console.error('Error fetching copies:', error)
      setExistingCopies([])
    }
    
    // Initialize for adding NEW copies (start empty)
    setNumberOfCopies(0)
    setCopyFields([])
    
    setShowEditBookModal(true)
  }

  const handleUpdateBook = async (e) => {
    e.preventDefault()

    try {
      const courseIds = selectedCourseIds.filter(id => id && id.trim() !== '')

      // Use FormData if files are provided (PDF or cover image)
      if (pdfFile || coverFile) {
        const formData = new FormData()
        formData.append('isbn', newBook.isbn) // Always include ISBN for updates
        formData.append('title', newBook.title)
        formData.append('author', newBook.author || '')
        formData.append('category', newBook.category || '')
        formData.append('publisher', newBook.publisher || '')
        formData.append('publication_year', newBook.publication_year || '')
        formData.append('edition', newBook.edition || '')
        formData.append('description', newBook.description || '')
        
        // Handle cover image
        if (coverFile) {
          formData.append('image', coverFile)
        } else if (newBook.pic_path) {
          formData.append('pic_path', newBook.pic_path)
        }
        
        // Handle PDF file upload - ONLY if a new file is selected
        if (pdfFile) {
          formData.append('pdf_file', pdfFile) // Send actual PDF file
        }
        // Don't send pdf_url if no new file is uploaded - this preserves the existing PDF
        
        // Send course_ids as JSON array
        if (courseIds.length > 0) formData.append('course_ids', JSON.stringify(courseIds))

        // Combine existing copies with new copies
        const allCopyIds = [
          ...existingCopies.map(c => c.copy_id),
          ...copyFields.map(cf => cf.copyId)
        ]
        
        if (allCopyIds.length > 0) {
          formData.append('copies_total', allCopyIds.length)
          allCopyIds.forEach((copyId, index) => {
            formData.append(`copy_ids[${index}]`, copyId)
          })
          
          // Locations for existing copies (with their existing condition notes)
          existingCopies.forEach((copy, index) => {
            if (copy.shelf_id) formData.append(`copy_locations[${index}][shelf_id]`, copy.shelf_id)
            if (copy.compartment_no) formData.append(`copy_locations[${index}][compartment_no]`, copy.compartment_no)
            if (copy.subcompartment_no) formData.append(`copy_locations[${index}][subcompartment_no]`, copy.subcompartment_no)
            if (copy.condition_note) formData.append(`copy_locations[${index}][condition_note]`, copy.condition_note)
          })
          
          // Locations for new copies
          copyFields.forEach((cf, index) => {
            const locationIndex = existingCopies.length + index
            if (cf.shelfLocation) {
              const parts = cf.shelfLocation.split('-')
              formData.append(`copy_locations[${locationIndex}][shelf_id]`, parts[0] || '')
              formData.append(`copy_locations[${locationIndex}][compartment_no]`, parts[1] || '')
              formData.append(`copy_locations[${locationIndex}][subcompartment_no]`, parts[2] || '')
            }
          })
        }
        
        const response = await fetch('/api/books/update_book.php', {
          method: 'POST',
          body: formData
        })
        
        const data = await response.json()
        
        if (data.success) {
          alert('✓ Book updated successfully!')
          setShowEditBookModal(false)
          setSelectedBook(null)
          setNewBook({
            title: '',
            author: '',
            isbn: '',
            category: '',
            publisher: '',
            publication_year: '',
            edition: '',
            description: '',
            pic_path: '',
            pdf_url: ''
          })
          setSelectedCourseIds([])
          setPdfFile(null)
          setCoverPreview('')
          setCoverFile(null)
          setInvalidCourseIds([])
          fetchInventory()
        } else {
          alert('Error: ' + data.message)
        }
      } else {
        // JSON request when no files are present
        const payload = {
          isbn: newBook.isbn,
          title: newBook.title,
          author: newBook.author || '',
          category: newBook.category || '',
          publisher: newBook.publisher || '',
          edition: newBook.edition || '',
          description: newBook.description || '',
          pic_path: newBook.pic_path || '',
          pdf_url: newBook.pdf_url || ''
        }
        
        if (newBook.publication_year) {
          payload.publication_year = newBook.publication_year
        }
        
        if (courseIds.length > 0) {
          payload.course_ids = courseIds
        }

        // Combine existing copies with new copies
        const allCopyIds = [
          ...existingCopies.map(c => c.copy_id),
          ...copyFields.map(cf => cf.copyId)
        ]
        
        const allCopyLocations = [
          ...existingCopies.map(c => ({
            shelf_id: c.shelf_id,
            compartment_no: c.compartment_no,
            subcompartment_no: c.subcompartment_no,
            condition_note: c.condition_note
          })),
          ...copyFields.map(cf => {
            if (cf.shelfLocation) {
              const parts = cf.shelfLocation.split('-')
              return {
                shelf_id: parts[0] || null,
                compartment_no: parts[1] || null,
                subcompartment_no: parts[2] || null
              }
            }
            return {
              shelf_id: null,
              compartment_no: null,
              subcompartment_no: null
            }
          })
        ]

        if (allCopyIds.length > 0) {
          payload.copies_total = allCopyIds.length
          payload.copy_ids = allCopyIds
          payload.copy_locations = allCopyLocations
        }

        const response = await fetch('/api/books/update_book.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        const data = await response.json()
        
        if (data.success) {
          alert('✓ Book updated successfully!')
          setShowEditBookModal(false)
          setSelectedBook(null)
          setNewBook({
            title: '',
            author: '',
            isbn: '',
            category: '',
            publisher: '',
            publication_year: '',
            edition: '',
            description: '',
            pic_path: '',
            pdf_url: ''
          })
          setSelectedCourseIds([])
          setPdfFile(null)
          setCoverPreview('')
          setCoverFile(null)
          setInvalidCourseIds([])
          fetchInventory()
        } else {
          alert('Error: ' + data.message)
        }
      }
    } catch (error) {
      console.error('Error updating book:', error)
      alert('Error updating book: ' + (error.message || 'Unknown error'))
    }
  }

  // Reset and open add book modal
  function openAddBookModal() {
    setNewBook({
      title: '',
      author: '',
      isbn: '',
      category: '',
      publisher: '',
      publication_year: '',
      edition: '',
      description: '',
      pic_path: '',
      pdf_url: ''
    })
    setSelectedCourseIds([])
    setCoverFile(null)
    setCoverPreview('')
    setPdfFile(null)
    setBookType('physical')
    setNumberOfCopies(1)
    setConditionNote('')
    setPhysicalCopies([])
    setCopyFields([{ copyId: '', shelfLocation: '' }]) // Reset to 1 empty copy
    setShowAddBookModal(true)
  }

  return (
    <div className="librarian-inventory-page">
      <Header user={user} onLogout={onLogout} />

      <div className="inventory-container">
        <div className="inventory-header">
          <h1 className="inventory-title">Inventory Management</h1>
          <div className="header-actions">
            <button className="btn-primary" onClick={openAddBookModal}>
              + Add Book
            </button>
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
              >
                ☰ Table
              </button>
              <button 
                className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
              >
                ⊞ Cards
              </button>
            </div>
          </div>
        </div>

      {/* Quick Action Cards removed per request */}
        {/* Search Bar */}
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search books by title, author, ISBN, or publisher..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
          />
        </div>

        {/* Filters and Sorting */}
        <div className="toolbar">
          <div className="toolbar-left">
            <select 
              className="filter-select"
              value={selectedCategory} 
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select 
              className="filter-select"
              value={availabilityFilter} 
              onChange={(e) => {
                setAvailabilityFilter(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option value="">All Stock</option>
              <option value="available">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>

            <select 
              className="filter-select"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="title">Sort: Title</option>
              <option value="author">Sort: Author</option>
              <option value="category">Sort: Category</option>
              <option value="availability">Sort: Stock</option>
            </select>

            <button 
              className="sort-order-btn"
              onClick={() => setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC')}
              title={sortOrder === 'ASC' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'ASC' ? '↑' : '↓'}
            </button>
          </div>

          <div className="toolbar-right">
            {pagination.total > 0 && (
              <span className="results-count">{pagination.total} books</span>
            )}
            <select 
              className="filter-select"
              value={itemsPerPage} 
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
            >
              <option value="10">10/page</option>
              <option value="20">20/page</option>
              <option value="50">50/page</option>
              <option value="100">100/page</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        {pagination.total > 0 && (
          <div className="results-summary">
            Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} books
          </div>
        )}

        {/* Books List */}
        <div className="books-content">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>Loading inventory...</div>
          ) : books.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No books found.</div>
          ) : viewMode === 'table' ? (
            <div className="table-container">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Category</th>
                    <th>ISBN</th>
                    <th className="text-center">Total</th>
                    <th className="text-center">Borrowed</th>
                    <th className="text-center">Available</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book.isbn} className={book.available === 0 ? 'out-of-stock' : book.available <= 2 ? 'low-stock' : ''}>
                      <td className="book-title">
                        <div className="title-cell">
                          <span className="title-text">{book.title}</span>
                          {book.totalCopies === 0 && <span className="badge-digital">Digital Only</span>}
                        </div>
                      </td>
                      <td>{book.author}</td>
                      <td><span className="category-badge">{book.category}</span></td>
                      <td className="isbn-cell">{book.isbn}</td>
                      <td className="text-center">{book.totalCopies}</td>
                      <td className="text-center">{book.borrowed}</td>
                      <td className="text-center">
                        <span className={`stock-badge ${book.available === 0 ? 'out' : book.available <= 2 ? 'low' : 'ok'}`}>
                          {book.available}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="action-buttons">
                          <button className="btn-icon" onClick={() => handleEditBook(book)} title="Edit">✏️</button>
                          <button className="btn-icon" onClick={() => navigate(`/book/${book.isbn}`)} title="View">👁️</button>
                          <button className="btn-icon btn-danger" onClick={() => handleDeleteBook(book.isbn)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="books-list">
              {books.map((book) => (
                <div
                  key={book.isbn}
                  className="book-inventory-card"
                  data-variant={book.available === 0 ? "out" : book.available <= 2 ? "low" : "ok"}
                >
                  <div className="book-inventory-header">
                    <h3>{book.title}</h3>
                    <p className="book-author">{book.author} • {book.category}</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {book.totalCopies > 0 ? (
                      <div className="book-inventory-stats">
                        <div className="stat-item">
                          <span className="stat-label">Total:</span>
                          <span className="stat-value">{book.totalCopies}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Borrowed:</span>
                          <span className="stat-value">{book.borrowed}</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-label">Available:</span>
                          <span className="stat-value">{book.available}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="no-physical-copy">Digital Only</div>
                    )}

                    <div className="book-inventory-actions">
                      <button className="btn-primary btn-sm" onClick={() => handleEditBook(book)}>
                        Edit
                      </button>
                      <button className="btn-danger btn-sm" onClick={() => handleDeleteBook(book.isbn)}>
                        Delete
                      </button>
                      <button className="btn-link btn-sm" onClick={() => navigate(`/book-details/${book.isbn}`)}>
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="pagination-container">
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            
            <div className="pagination-info">
              Page {currentPage} of {pagination.total_pages}
            </div>
            
            <div className="pagination-numbers">
              {[...Array(pagination.total_pages)].map((_, idx) => {
                const pageNum = idx + 1
                // Show first page, last page, current page, and 2 pages around current
                if (
                  pageNum === 1 || 
                  pageNum === pagination.total_pages || 
                  (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  )
                } else if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                  return <span key={pageNum} className="pagination-ellipsis">...</span>
                }
                return null
              })}
            </div>
            
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(pagination.total_pages, prev + 1))}
              disabled={currentPage === pagination.total_pages}
            >
              Next
            </button>
          </div>
        )}

        {/* Add Book Modal */}
        {showAddBookModal && (
          <div className="modal-overlay" onClick={() => setShowAddBookModal(false)}>
            <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add New Book</h3>
                <button className="modal-close" onClick={() => setShowAddBookModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form className="book-form" onSubmit={handleAddBook}>
                  {/* Basic Information Section */}
                  <div className="form-section">
                    <h4 className="section-title">Basic Information</h4>
                    
                    {/* Cover Image Upload */}
                    <div className="form-group">
                      <label>Cover Image</label>
                      <div className="cover-upload-section">
                        <input 
                          type="file"
                          accept="image/*"
                          id="cover-upload"
                          onChange={(e) => {
                            const file = e.target.files[0]
                            setCoverFile(file || null)
                            if (file) {
                              setCoverPreview(URL.createObjectURL(file))
                              setNewBook({...newBook, pic_path: ''})
                            }
                          }}
                          style={{display: 'none'}}
                        />
                        <label htmlFor="cover-upload" className="upload-btn">
                          <span>📤</span>
                          <span>{coverFile ? 'Image Selected' : 'Upload Cover Image'}</span>
                        </label>
                        {coverPreview && (
                          <div className="image-preview">
                            <img src={coverPreview} alt="Cover preview" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Book Title and ISBN Row */}
                    <div className="form-row">
                      <div className="form-group">
                        <label>Book Title *</label>
                        <input 
                          type="text" 
                          placeholder="Enter book title" 
                          value={newBook.title}
                          onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                          required
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>ISBN *</label>
                        <input 
                          type="text" 
                          placeholder="Enter ISBN" 
                          value={newBook.isbn}
                          onChange={(e) => setNewBook({...newBook, isbn: e.target.value})}
                          required
                          className="form-input"
                        />
                      </div>
                    </div>

                    {/* Author and Publisher Row */}
                    <div className="form-row">
                      <div className="form-group">
                        <label>Author</label>
                        <input 
                          type="text" 
                          placeholder="Enter author name" 
                          value={newBook.author}
                          onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>Publisher</label>
                        <input 
                          type="text" 
                          placeholder="Enter publisher (optional)" 
                          value={newBook.publisher}
                          onChange={(e) => setNewBook({...newBook, publisher: e.target.value})}
                          className="form-input"
                        />
                      </div>
                    </div>

                    {/* Category and Year Row */}
                    <div className="form-row">
                      <div className="form-group">
                        <label>Category</label>
                        <select 
                          className="form-select"
                          value={newBook.category}
                          onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                        >
                          <option value="">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Publication Year</label>
                        <input 
                          type="text" 
                          placeholder="e.g., 2024 (optional)" 
                          value={newBook.publication_year}
                          onChange={(e) => setNewBook({...newBook, publication_year: e.target.value})}
                          className="form-input"
                        />
                      </div>
                    </div>

                    {/* Edition */}
                    <div className="form-group">
                      <label>Edition</label>
                      <input 
                        type="text" 
                        placeholder="Enter edition (optional)" 
                        value={newBook.edition}
                        onChange={(e) => setNewBook({...newBook, edition: e.target.value})}
                        className="form-input"
                      />
                    </div>
                  </div>

                  {/* Courses Section */}
                  <div className="form-section">
                    <h4 className="section-title">Related Courses (Optional)</h4>
                    <div className="form-group">
                      <div className="course-multi-select">
                        {courses.length > 0 ? (
                          courses.map(c => (
                            <label key={c.course_id} className="course-checkbox-label">
                              <input 
                                type="checkbox"
                                value={c.course_id}
                                checked={selectedCourseIds.includes(c.course_id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCourseIds([...selectedCourseIds, c.course_id])
                                  } else {
                                    setSelectedCourseIds(selectedCourseIds.filter(id => id !== c.course_id))
                                  }
                                }}
                              />
                              <span>{c.course_id} — {c.course_name} ({c.semester})</span>
                            </label>
                          ))
                        ) : (
                          <p className="text-muted">No courses available</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Book Type and Copies Section */}
                  <div className="form-section">
                    <h4 className="section-title">Book Type & Copies</h4>
                    
                    {/* Book Type Toggle */}
                    <div className="form-group">
                      <label>Book Type</label>
                      <div className="book-type-toggle">
                        <button
                          type="button"
                          className={`toggle-btn ${bookType === 'physical' ? 'active' : ''}`}
                          onClick={() => setBookType('physical')}
                        >
                          📚 Physical Copy
                        </button>
                        <button
                          type="button"
                          className={`toggle-btn ${bookType === 'digital' ? 'active' : ''}`}
                          onClick={() => setBookType('digital')}
                        >
                          💻 Digital Copy
                        </button>
                      </div>
                    </div>

                    {/* Number of Physical Copies - Only for physical books */}
                    {bookType === 'physical' && (
                      <>
                        <div className="form-group">
                          <label>Number of Copies</label>
                          <input 
                            type="number" 
                            placeholder="Enter number of copies" 
                            value={numberOfCopies}
                            onChange={(e) => setNumberOfCopies(parseInt(e.target.value) || 1)}
                            min="1"
                            className="form-input"
                          />
                        </div>

                        {/* Copy IDs and Shelf Locations */}
                        {copyFields.length > 0 && (
                          <div className="form-group">
                            <div className="copy-expansion-section">
                              <div className="copy-section-header">Copy Details & Shelf Locations</div>
                              {copyFields.map((copy, index) => (
                                <div key={index} className="copy-item">
                                  <div className="copy-item-header">Copy {index + 1}</div>
                                  <div className="form-row">
                                    <input 
                                      type="text" 
                                      placeholder="Copy ID" 
                                      value={copy.copyId}
                                      onChange={(e) => {
                                        const newFields = [...copyFields]
                                        newFields[index].copyId = e.target.value
                                        setCopyFields(newFields)
                                      }}
                                      className="form-input"
                                    />
                                    <select 
                                      className="form-select"
                                      value={copy.shelfLocation}
                                      onChange={(e) => {
                                        const newFields = [...copyFields]
                                        newFields[index].shelfLocation = e.target.value
                                        setCopyFields(newFields)
                                      }}
                                    >
                                      <option value="">Select Shelf Location</option>
                                      {shelfLocations.map(shelf => (
                                        <option 
                                          key={`${shelf.shelf_id}-${shelf.compartment}-${shelf.subcompartment}`} 
                                          value={`${shelf.shelf_id}-${shelf.compartment}-${shelf.subcompartment}`}
                                        >
                                          Shelf {shelf.shelf_id} - Comp {shelf.compartment} - Sub {shelf.subcompartment}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* PDF and Description Section */}
                  <div className="form-section">
                    <h4 className="section-title">Additional Information</h4>
                    
                    {/* PDF URL/Upload */}
                    <div className="form-group">
                      <label>PDF File (Optional)</label>
                      <div className="pdf-upload-section">
                        <input 
                          type="text" 
                          placeholder="Paste PDF URL or upload file" 
                          value={newBook.pdf_url || ''}
                          onChange={(e) => setNewBook({ ...newBook, pdf_url: e.target.value })}
                          className="form-input pdf-input"
                        />
                        <input 
                          type="file" 
                          accept=".pdf,application/pdf"
                          id="pdf-upload"
                          onChange={(e) => setPdfFile(e.target.files[0])}
                          style={{display: 'none'}}
                        />
                        <label htmlFor="pdf-upload" className="pdf-upload-btn">
                          📤 Upload
                        </label>
                      </div>
                      {pdfFile && (
                        <div className="file-preview-small">
                          <span>📄 {pdfFile.name}</span>
                          <button type="button" onClick={() => setPdfFile(null)} className="btn-remove-small">×</button>
                        </div>
                      )}
                    </div>

                    {/* Condition Note (optional) - only for physical books */}
                    {bookType === 'physical' && (
                      <div className="form-group">
                        <label>Condition Note (Optional)</label>
                        <textarea 
                          placeholder="e.g., Good condition, Minor wear on cover..." 
                          value={conditionNote}
                          onChange={(e) => setConditionNote(e.target.value)}
                          rows="2"
                          className="form-textarea"
                        />
                      </div>
                    )}

                    {/* Short description (optional) */}
                    <div className="form-group">
                      <label>Description (Optional)</label>
                      <textarea 
                        placeholder="Enter a brief description of the book..." 
                        value={newBook.description}
                        onChange={(e) => setNewBook({...newBook, description: e.target.value})}
                        rows="4"
                        className="form-textarea"
                      />
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn-secondary" onClick={() => setShowAddBookModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-confirm">
                      ✓ Add Book
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        )}

        {/* Edit Book Modal */}
        {showEditBookModal && (
          <div className="modal-overlay" onClick={() => setShowEditBookModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Edit Book</h3>
                <button className="modal-close" onClick={() => setShowEditBookModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form className="book-form" onSubmit={handleUpdateBook}>
                  {/* ISBN (Read-only) */}
                  <div className="form-group">
                    <label>ISBN (Cannot be changed)</label>
                    <input 
                      type="text" 
                      value={newBook.isbn}
                      readOnly
                      className="form-input-dark"
                      style={{backgroundColor: '#f3f4f6', cursor: 'not-allowed', opacity: 0.7}}
                    />
                  </div>

                  {/* Cover Image Upload */}
                  <div className="form-group">
                    <label>Cover Image</label>
                    <div className="cover-upload-section">
                      <input 
                        type="file"
                        accept="image/*"
                        id="cover-upload-edit"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          setCoverFile(file || null)
                          if (file) {
                            setCoverPreview(URL.createObjectURL(file))
                            setNewBook({...newBook, pic_path: ''})
                          }
                        }}
                        style={{display: 'none'}}
                      />
                      <label htmlFor="cover-upload-edit" className="upload-btn">
                        <span>📤</span>
                        <span>{coverFile ? 'Image Selected' : 'Upload img'}</span>
                      </label>
                    </div>
                  </div>

                  {/* Book Title */}
                  <div className="form-group">
                    <input 
                      type="text" 
                      placeholder="Book Title" 
                      value={newBook.title}
                      onChange={(e) => setNewBook({...newBook, title: e.target.value})}
                      required
                      className="form-input-dark"
                    />
                  </div>

                  {/* Author */}
                  <div className="form-group">
                    <input 
                      type="text" 
                      placeholder="Author:" 
                      value={newBook.author}
                      onChange={(e) => setNewBook({...newBook, author: e.target.value})}
                      className="form-input-dark"
                    />
                  </div>

                  {/* Category (optional) */}
                  <div className="form-group">
                    <label>Category (optional)</label>
                    <select 
                      className="form-select-dark"
                      value={newBook.category}
                      onChange={(e) => setNewBook({...newBook, category: e.target.value})}
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Publisher (optional) */}
                  <div className="form-group">
                    <input 
                      type="text" 
                      placeholder="Publisher (optional):" 
                      value={newBook.publisher}
                      onChange={(e) => setNewBook({...newBook, publisher: e.target.value})}
                      className="form-input-dark"
                    />
                  </div>

                  {/* Publication Year (optional) */}
                  <div className="form-group">
                    <input 
                      type="text" 
                      placeholder="Publication Year (optional):" 
                      value={newBook.publication_year}
                      onChange={(e) => setNewBook({...newBook, publication_year: e.target.value})}
                      className="form-input-dark"
                    />
                  </div>

                  {/* Edition (optional) */}
                  <div className="form-group">
                    <input 
                      type="text" 
                      placeholder="Edition (optional):" 
                      value={newBook.edition}
                      onChange={(e) => setNewBook({...newBook, edition: e.target.value})}
                      className="form-input-dark"
                    />
                  </div>

                  {/* Courses (multi-select) */}
                  <div className="form-group">
                    <label>Courses (optional - select multiple)</label>
                    <div className="course-multi-select">
                      {courses.map(c => (
                        <label key={c.course_id} className="course-checkbox-label">
                          <input 
                            type="checkbox"
                            value={c.course_id}
                            checked={selectedCourseIds.includes(c.course_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCourseIds([...selectedCourseIds, c.course_id])
                              } else {
                                setSelectedCourseIds(selectedCourseIds.filter(id => id !== c.course_id))
                              }
                            }}
                          />
                          <span>{c.course_id} — {c.course_name} ({c.semester})</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* PDF URL/Upload */}
                  <div className="form-group">
                    <div className="pdf-upload-section">
                      <input 
                        type="text" 
                        placeholder="PDF: Paste the URL or Upload .pdf" 
                        value={newBook.pdf_url || ''}
                        onChange={(e) => setNewBook({ ...newBook, pdf_url: e.target.value })}
                        className="form-input-dark pdf-input"
                      />
                      <input 
                        type="file" 
                        accept=".pdf,application/pdf"
                        id="pdf-upload-edit"
                        onChange={(e) => setPdfFile(e.target.files[0])}
                        style={{display: 'none'}}
                      />
                      <label htmlFor="pdf-upload-edit" className="pdf-upload-btn">
                        📤
                      </label>
                    </div>
                    {pdfFile && (
                      <div className="file-preview-small">
                        <span>📄 {pdfFile.name}</span>
                        <button type="button" onClick={() => setPdfFile(null)} className="btn-remove-small">×</button>
                      </div>
                    )}
                  </div>

                  {/* Short description (optional) */}
                  <div className="form-group">
                    <textarea 
                      placeholder="Short description (optional)" 
                      value={newBook.description}
                      onChange={(e) => setNewBook({...newBook, description: e.target.value})}
                      rows="4"
                      className="form-textarea-dark"
                    />
                  </div>

                  {/* Existing Physical Copies */}
                  {existingCopies.length > 0 && (
                    <div className="form-group">
                      <div className="existing-copies-section">
                        <div className="copy-section-header">
                          Existing Physical Copies ({existingCopies.length})
                        </div>
                        {existingCopies.map((copy, index) => (
                          <div key={copy.copy_id} className="existing-copy-item">
                            <div className="copy-item-header">
                              Copy {index + 1} - {copy.copy_id}
                            </div>
                            <div className="copy-info">
                              <div><strong>Status:</strong> {copy.status}</div>
                              {copy.shelf_id && (
                                <div>
                                  <strong>Location:</strong> Shelf {copy.shelf_id}
                                  {copy.compartment_no && ` - Comp ${copy.compartment_no}`}
                                  {copy.subcompartment_no && ` - Sub ${copy.subcompartment_no}`}
                                </div>
                              )}
                              {copy.condition_note && (
                                <div><strong>Condition:</strong> {copy.condition_note}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add New Physical Copies */}
                  <div className="form-group">
                    <div style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px'}}>
                      <label style={{margin: 0, flex: 1}}>Add New Physical Copies</label>
                      <button 
                        type="button"
                        className="btn-add-copy"
                        onClick={() => {
                          const newCount = numberOfCopies + 1
                          setNumberOfCopies(newCount)
                          const nextCopyNum = existingCopies.length + copyFields.length + 1
                          setCopyFields([...copyFields, {
                            copyId: `${newBook.isbn}-${String(nextCopyNum).padStart(4, '0')}`,
                            shelfLocation: ''
                          }])
                        }}
                        title="Add new copy"
                      >
                        ➕ Add Copy
                      </button>
                    </div>
                    
                    {copyFields.length > 0 && (
                      <div className="copy-expansion-section">
                        {copyFields.map((copy, index) => (
                          <div key={index} className="copy-item">
                            <div className="copy-item-header">
                              New Copy {index + 1}
                              <button
                                type="button"
                                onClick={() => {
                                  const newFields = copyFields.filter((_, i) => i !== index)
                                  setCopyFields(newFields)
                                  setNumberOfCopies(newFields.length)
                                }}
                                className="btn-remove-copy"
                                title="Remove this copy"
                              >
                                ×
                              </button>
                            </div>
                            <input 
                              type="text" 
                              placeholder="Copy ID" 
                              value={copy.copyId}
                              onChange={(e) => {
                                const newFields = [...copyFields]
                                newFields[index].copyId = e.target.value
                                setCopyFields(newFields)
                              }}
                              className="form-input-dark"
                              style={{marginBottom: '8px'}}
                            />
                            <select 
                              className="form-select-dark"
                              value={copy.shelfLocation}
                              onChange={(e) => {
                                const newFields = [...copyFields]
                                newFields[index].shelfLocation = e.target.value
                                setCopyFields(newFields)
                              }}
                            >
                              <option value="">Select Shelf Location</option>
                              {shelfLocations.map(shelf => (
                                <option 
                                  key={`${shelf.shelf_id}-${shelf.compartment}-${shelf.subcompartment}`} 
                                  value={`${shelf.shelf_id}-${shelf.compartment}-${shelf.subcompartment}`}
                                >
                                  Shelf {shelf.shelf_id} - Comp {shelf.compartment} - Sub {shelf.subcompartment}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setShowEditBookModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      Update Book
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Add Shelf Modal */}
        {showAddShelfModal && (
          <div className="modal-overlay" onClick={() => setShowAddShelfModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Add Shelf</h3>
                <button className="modal-close" onClick={() => setShowAddShelfModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form className="shelf-form" onSubmit={handleAddShelf}>
                  <div className="form-group">
                    <label>Shelf No *</label>
                    <input 
                      type="text" 
                      placeholder="Enter shelf number (e.g., 1, A1, S-001)" 
                      value={shelfForm.shelf_id}
                      onChange={(e) => setShelfForm({...shelfForm, shelf_id: e.target.value})}
                      required
                    />
                    <small style={{color: '#666', fontSize: '0.85rem'}}>Manual entry - you control the shelf numbering</small>
                  </div>
                  <div className="form-group">
                    <label>Compartment No *</label>
                    <input 
                      type="text" 
                      placeholder="Enter compartment number" 
                      value={shelfForm.compartment}
                      onChange={(e) => setShelfForm({...shelfForm, compartment: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sub-Compartment No *</label>
                    <input 
                      type="text" 
                      placeholder="Enter sub-compartment number" 
                      value={shelfForm.subcompartment}
                      onChange={(e) => setShelfForm({...shelfForm, subcompartment: e.target.value})}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary btn-lg">
                    Add Shelf
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Remove Shelf Modal */}
        {showRemoveShelfModal && (
          <div className="modal-overlay" onClick={() => setShowRemoveShelfModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Remove Shelf</h3>
                <button className="modal-close" onClick={() => setShowRemoveShelfModal(false)}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <form className="shelf-form" onSubmit={handleRemoveShelf}>
                  <div className="form-group">
                    <label>Shelf No *</label>
                    <input 
                      type="text" 
                      placeholder="Enter shelf number" 
                      value={shelfForm.shelf_id}
                      onChange={(e) => setShelfForm({...shelfForm, shelf_id: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Compartment No *</label>
                    <input 
                      type="text" 
                      placeholder="Enter compartment number" 
                      value={shelfForm.compartment}
                      onChange={(e) => setShelfForm({...shelfForm, compartment: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Sub-Compartment No *</label>
                    <input 
                      type="text" 
                      placeholder="Enter sub-compartment number" 
                      value={shelfForm.subcompartment}
                      onChange={(e) => setShelfForm({...shelfForm, subcompartment: e.target.value})}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-danger btn-lg">
                    Remove Shelf
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      {/* Top navigation is provided by Header when user is logged in */}
    </div>
  )
}

export default LibrarianInventory
