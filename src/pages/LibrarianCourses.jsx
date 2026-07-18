import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import "./LibrarianCourses.css"

function LibrarianCourses({ user, onLogout }) {
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  // Hardcoded semesters - not fetched from database
  const semesters = ['11', '12', '21', '22', '31', '32', '42']
  const [formData, setFormData] = useState({
    course_id: "",
    course_name: "",
    semester: ""
  })

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery && searchQuery.trim()) params.set('search', searchQuery.trim())
      const response = await fetch(`/api/courses/search_courses.php?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setCourses(data.courses || [])
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e) => {
    setSearchQuery(e.target.value)
  }

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCourses()
    }, 300)
    
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const handleAddCourse = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/courses/add_course.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✓ Course added successfully')
        setShowAddModal(false)
        setFormData({ course_id: "", course_name: "", semester: "" })
        fetchCourses()
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      alert('Error adding course')
    }
  }

  const handleEditCourse = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/courses/edit_course.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✓ Course updated successfully')
        setShowEditModal(false)
        setSelectedCourse(null)
        setFormData({ course_id: "", course_name: "", semester: "" })
        fetchCourses()
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      alert('Error updating course')
    }
  }

  const handleDeleteCourse = async (courseId, courseName) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete this course?\n\nCourse: ${courseName}\nID: ${courseId}\n\nThis action cannot be undone.`
    )
    
    if (!confirmDelete) return
    
    try {
      const response = await fetch('/api/courses/delete_course.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('✓ Course deleted successfully')
        fetchCourses()
      } else {
        alert('Error: ' + data.message)
      }
    } catch (error) {
      alert('Error deleting course')
    }
  }

  const openEditModal = (course) => {
    setSelectedCourse(course)
    setFormData({
      course_id: course.course_id,
      course_name: course.course_name,
      semester: course.semester
    })
    setShowEditModal(true)
  }

  const openAddModal = () => {
    setFormData({ course_id: "", course_name: "", semester: "" })
    setShowAddModal(true)
  }

  return (
    <div className="librarian-courses-page">
      <Header user={user} onLogout={onLogout} />

      <div className="courses-container">
        <div className="courses-header">
          <h1 className="courses-title">📚 Course Management</h1>
          <button className="btn-add-course" onClick={openAddModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Course
          </button>
        </div>

        {/* Search */}
        <div className="search-section">
          <div className="search-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search by course ID, name, or semester..."
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        {/* Courses List */}
        <div className="courses-list">
          {loading ? (
            <div className="empty-state">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No Courses Found</h3>
              <p>Start by adding a new course</p>
            </div>
          ) : (
            courses.map((course) => (
              <div key={course.course_id} className="course-card">
                <div className="course-info">
                  <div className="course-header">
                    <h3 className="course-name">{course.course_name}</h3>
                    <span className="course-semester">Semester {course.semester}</span>
                  </div>
                  <div className="course-id">ID: {course.course_id}</div>
                </div>
                <div className="course-actions">
                  <button 
                    className="btn-icon btn-edit" 
                    onClick={() => openEditModal(course)}
                    title="Edit course"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button 
                    className="btn-icon btn-delete" 
                    onClick={() => handleDeleteCourse(course.course_id, course.course_name)}
                    title="Delete course"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Course Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content course-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Course</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddCourse} className="course-form">
              <div className="form-group">
                <label>Course Code</label>
                <input
                  type="text"
                  placeholder="e.g., CSE401"
                  value={formData.course_id}
                  onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Course Name</label>
                <input
                  type="text"
                  placeholder="e.g., Data Structures and Algorithms"
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  required
                  className="form-select"
                >
                  <option value="">Select Semester</option>
                  {semesters.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content course-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Course</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditCourse} className="course-form">
              <div className="form-group">
                <label>Course Code</label>
                <input
                  type="text"
                  value={formData.course_id}
                  disabled
                  style={{ background: '#f1f5f9', cursor: 'not-allowed' }}
                />
                <small className="form-hint">Course ID cannot be changed</small>
              </div>
              <div className="form-group">
                <label>Course Name</label>
                <input
                  type="text"
                  placeholder="e.g., Data Structures and Algorithms"
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Semester</label>
                <select
                  value={formData.semester}
                  onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  required
                  className="form-select"
                >
                  <option value="">Select Semester</option>
                  {semesters.map((sem) => (
                    <option key={sem} value={sem}>
                      {sem}
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default LibrarianCourses
