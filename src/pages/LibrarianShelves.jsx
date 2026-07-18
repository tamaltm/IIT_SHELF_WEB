import { useState, useEffect } from "react"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import "./LibrarianShelves.css"

function LibrarianShelves({ user, onLogout }) {
  const [shelves, setShelves] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [selectedShelves, setSelectedShelves] = useState([])
  const [shelfForm, setShelfForm] = useState({
    shelf_id: '',
    compartment: '',
    subcompartment: ''
  })

  useEffect(() => {
    fetchShelves()
  }, [])

  const fetchShelves = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/librarian/manage_shelves.php')
      const data = await response.json()
      
      if (data.success) {
        setShelves(data.shelves)
      }
    } catch (error) {
      console.error('Error fetching shelves:', error)
    } finally {
      setLoading(false)
    }
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
        body: JSON.stringify(shelfForm)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert('Shelf added successfully!')
        setShowAddModal(false)
        setShelfForm({ shelf_id: '', compartment: '', subcompartment: '' })
        fetchShelves()
      } else {
        alert(data.message || 'Failed to add shelf')
      }
    } catch (error) {
      console.error('Error adding shelf:', error)
      alert('Error adding shelf')
    }
  }

  const handleRemoveShelf = async (e) => {
    e.preventDefault()
    
    if (selectedShelves.length === 0) {
      alert('Please select at least one shelf to remove')
      return
    }
    
    if (!window.confirm(`Are you sure you want to remove ${selectedShelves.length} shelf location(s)?`)) {
      return
    }
    
    try {
      // Backend supports deletion by shelf_id only; deduplicate selected shelf IDs
      const idsToDelete = Array.from(new Set(selectedShelves.map(key => key.split('|')[0])))
      const removePromises = idsToDelete.map(shelfId => fetch('/api/librarian/manage_shelves.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shelf_id: shelfId })
      }))

      const results = await Promise.all(removePromises)
      const jsonResults = await Promise.all(results.map(r => r.json()))

      const allSuccessful = jsonResults.every(result => result.success)

      if (allSuccessful) {
        alert(`Successfully removed ${idsToDelete.length} shelf(s)!`)
      } else {
        const failedCount = jsonResults.filter(r => !r.success).length
        alert(`${idsToDelete.length - failedCount} shelf(s) removed successfully. ${failedCount} failed.`)
      }
      setShowRemoveModal(false)
      setSelectedShelves([])
      fetchShelves()
    } catch (error) {
      console.error('Error removing shelves:', error)
      alert('Failed to remove shelves. Please try again.')
    }
  }

  const toggleShelfSelection = (shelfKey) => {
    setSelectedShelves(prev => {
      if (prev.includes(shelfKey)) {
        return prev.filter(key => key !== shelfKey)
      } else {
        return [...prev, shelfKey]
      }
    })
  }

  const getShelfKey = (shelf) => {
    return `${shelf.shelf_id}|${shelf.compartment}|${shelf.subcompartment}`
  }

  return (
    <div className="librarian-shelves-page">
      <Header user={user} onLogout={onLogout} />

      <div className="shelves-container">
        <div className="shelves-header">
          <h1>📚 Manage Shelves</h1>
          <div className="header-actions">
            <button className="btn-add-shelf" onClick={() => setShowAddModal(true)}>
              + Add New Shelf
            </button>
            <button className="btn-remove-shelf" onClick={() => setShowRemoveModal(true)}>
              - Remove Shelf
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">Loading shelves...</div>
        ) : shelves.length === 0 ? (
          <div className="empty-state">
            <p>No shelves found. Add your first shelf to get started!</p>
          </div>
        ) : (
          <div className="shelves-grid">
            {shelves.map((shelf, index) => (
              <div key={index} className="shelf-card">
                <div className="shelf-header">
                  <h3>Shelf {shelf.shelf_id}</h3>
                </div>
                
                <div className="shelf-info">
                  <div className="info-item">
                    <span className="info-label">Compartment:</span>
                    <span className="info-value">{shelf.compartment}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Subcompartment:</span>
                    <span className="info-value">{shelf.subcompartment}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Shelf Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Shelf</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleAddShelf}>
              <div className="form-group">
                <label>Shelf No *</label>
                <input
                  type="text"
                  value={shelfForm.shelf_id}
                  onChange={(e) => setShelfForm({...shelfForm, shelf_id: e.target.value})}
                  required
                  placeholder="Enter shelf number (e.g., 1, A1, S-001)"
                />
                <small style={{color: '#666', fontSize: '0.85rem'}}>Manual entry - you control the shelf numbering</small>
              </div>
              
              <div className="form-group">
                <label>Compartment No *</label>
                <input
                  type="text"
                  value={shelfForm.compartment}
                  onChange={(e) => setShelfForm({...shelfForm, compartment: e.target.value})}
                  required
                  placeholder="Enter compartment number"
                />
              </div>
              
              <div className="form-group">
                <label>Sub-Compartment No *</label>
                <input
                  type="text"
                  value={shelfForm.subcompartment}
                  onChange={(e) => setShelfForm({...shelfForm, subcompartment: e.target.value})}
                  required
                  placeholder="Enter sub-compartment number"
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Add Shelf
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Shelf Modal */}
      {showRemoveModal && (
        <div className="modal-overlay" onClick={() => {
          setShowRemoveModal(false)
          setSelectedShelves([])
        }}>
          <div className="modal-content remove-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Remove Shelf</h2>
              <button className="modal-close" onClick={() => {
                setShowRemoveModal(false)
                setSelectedShelves([])
              }}>×</button>
            </div>
            
            {shelves.length === 0 ? (
              <div className="empty-shelf-list">
                <p>No shelves available to remove</p>
              </div>
            ) : (
              <form onSubmit={handleRemoveShelf}>
                <div className="shelf-selection-list">
                  {shelves.map((shelf, index) => {
                    const shelfKey = getShelfKey(shelf)
                    const isSelected = selectedShelves.includes(shelfKey)
                    
                    return (
                      <label key={index} className={`shelf-checkbox-item ${isSelected ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleShelfSelection(shelfKey)}
                        />
                        <span className="shelf-label">
                          Shelf {shelf.shelf_id} - Compartment {shelf.compartment} - SubCompartment {shelf.subcompartment}
                        </span>
                      </label>
                    )
                  })}
                </div>
                
                <div className="modal-actions">
                  <button 
                    type="submit" 
                    className="btn-primary btn-danger"
                    disabled={selectedShelves.length === 0}
                  >
                    Remove {selectedShelves.length > 0 ? `(${selectedShelves.length})` : ''}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <BottomNav user={user} />
    </div>
  )
}

export default LibrarianShelves
