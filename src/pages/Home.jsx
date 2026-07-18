import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import "./Home.css"
import PageTransition from "../components/PageTransition"

function Home() {
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestForm, setRequestForm] = useState({
    requester_identifier: '',
    isbn: '',
    title: '',
    author: '',
    description: '',
    resource_type: 'PDF'
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')
        }
      })
    }, observerOptions)

    const sections = document.querySelectorAll('.about-section, .features-section, .how-it-works-section, .rules-section, .cta-section')
    sections.forEach(section => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  const handleRequestSubmit = async (e) => {
    e.preventDefault()
    
    if (!requestForm.requester_identifier || !requestForm.title || !requestForm.isbn || !selectedFile) {
      alert('Please provide your email, book title, ISBN, and select a PDF file')
      return
    }
    
    setSubmitting(true)
    try {
      // Create FormData for file upload
      const formData = new FormData()
      formData.append('requester_identifier', requestForm.requester_identifier)
      formData.append('isbn', requestForm.isbn)
      formData.append('title', requestForm.title)
      formData.append('author', requestForm.author || '')
      formData.append('description', requestForm.description || '')
      formData.append('resource_type', requestForm.resource_type)
      formData.append('pdf_file', selectedFile)
      
      const response = await fetch('/api/books/request_book.php', {
        method: 'POST',
        body: formData  // Don't set Content-Type header, browser will set it with boundary
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✓ Digital resource request submitted successfully! Librarian will review it soon.')
        setShowRequestModal(false)
        setRequestForm({
          requester_identifier: '',
          isbn: '',
          title: '',
          author: '',
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
    <PageTransition className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-logo">IITShelf</h1>
          <h2 className="hero-title">Digital Library Management System</h2>
          <p className="hero-description">
            Your gateway to a vast collection of books, journals, and academic resources. 
            Streamlined borrowing, smart tracking, and seamless management.
          </p>
          <div className="hero-actions">
            <Link to="/search" className="btn btn-primary hero-btn">
              Find Books
            </Link>
            <Link to="/login" className="btn btn-primary hero-btn">
              Login
            </Link>
            <Link to="/register" className="btn btn-primary hero-btn">
              Register
            </Link>
          </div>
          <div className="hero-app-download">
            <a href="#" className="app-download-btn">
              <i className="fab fa-google-play"></i>
              <span>
                <small>GET IT ON</small>
                <strong>Google Play</strong>
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="container">
          <h2 className="section-title">Why Choose IITShelf?</h2>
          <p className="section-description">
            IITShelf revolutionizes library management with a modern, student-friendly platform. 
            Say goodbye to manual paperwork and hello to instant book access, smart reminders, 
            and transparent fine tracking.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-book"></i></div>
              <h3>Large Book Collection</h3>
              <p>Access thousands of books across various subjects and genres, all in one place.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-search"></i></div>
              <h3>Smart Book Search</h3>
              <p>Find books instantly with our advanced search and filter system.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-clock"></i></div>
              <h3>Due Date & Fine Tracking</h3>
              <p>Get automatic reminders for due dates and transparent fine calculations.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-user-circle"></i></div>
              <h3>User-Friendly Dashboard</h3>
              <p>Manage your borrowed books, requests, and history in one simple dashboard.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-shield-alt"></i></div>
              <h3>Secure Login System</h3>
              <p>Your data is protected with industry-standard security measures.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon"><i className="fas fa-credit-card"></i></div>
              <h3>Easy Payment Management</h3>
              <p>Handle fines and payments securely within the platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Register</h3>
              <p>Create your free account with your Institutional Email in seconds.</p>
            </div>

            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Login to Dashboard</h3>
              <p>Access your personalized dashboard with all library features.</p>
            </div>

            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Search & Request Books</h3>
              <p>Browse the catalog and request books you need for your studies.</p>
            </div>

            <div className="step-card">
              <div className="step-number">4</div>
              <h3>Issue & Return Easily</h3>
              <p>Collect your books from the library and return them on time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Rules & Policies Section */}
      <section className="rules-section">
        <div className="container">
          <h2 className="section-title">Library Rules & Policies</h2>
          <div className="rules-grid">
            <div className="rule-card">
              <div className="rule-icon"><i className="fas fa-book-open"></i></div>
              <h3>Maximum Books</h3>
              <p>Students can borrow up to <strong>2 books</strong> at a time</p>
            </div>

            <div className="rule-card">
              <div className="rule-icon"><i className="fas fa-hourglass-half"></i></div>
              <h3>Return Duration</h3>
              <p>All books must be returned within <strong>7 days</strong></p>
            </div>

            <div className="rule-card">
              <div className="rule-icon"><i className="fas fa-money-bill-wave"></i></div>
              <h3>Fine Policy</h3>
              <p><strong>10 BDT per day</strong> for late returns after due date</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <div className="container">
          <h2 className="cta-title">Ready to Explore Our Library?</h2>
          <p className="cta-description">Login to your account and start accessing thousands of books today!</p>
          <Link to="/login" className="btn btn-primary cta-button">
            Login Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h3 className="footer-logo">IITShelf</h3>
              <p>Digital Seminar Library Management System</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <Link to="/login" className="footer-link">Login</Link>
              <Link to="/register" className="footer-link">Register</Link>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p>Developed by <strong>Shakib Ibne Rashid</strong></p>
              <p>IIT, Noakhali Science and Technology University</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2026 IITShelf Library Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Request New Book Modal */}
      {showRequestModal && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content request-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Request New Book Upload</h3>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-info">
                📚 Request a new digital resource for the library. Provide complete information below.
                The librarian will review and approve your request.
              </p>
              <form onSubmit={handleRequestSubmit} className="request-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Your Email *</label>
                    <input 
                      type="email" 
                      placeholder="your.email@example.com"
                      value={requestForm.requester_identifier}
                      onChange={(e) => setRequestForm({...requestForm, requester_identifier: e.target.value})}
                      required
                    />
                  </div>
                </div>

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
                      <option value="E-Book">E-Book</option>
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
                    onClick={() => setShowRequestModal(false)}
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
    </PageTransition>
  )
}

export default Home
