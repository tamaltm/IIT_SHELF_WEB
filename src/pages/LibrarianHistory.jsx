"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import "./LibrarianHistory.css"

function LibrarianHistory({ user, onLogout }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("all")
  const [searchUserId, setSearchUserId] = useState("")
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [historyData, setHistoryData] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch transaction history from backend
  useEffect(() => {
    fetchTransactionHistory()
  }, [activeTab, startDate, endDate])

  const fetchTransactionHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeTab !== 'all') {
        params.append('type', activeTab)
      }
      if (startDate) {
        params.append('startDate', startDate)
      }
      if (endDate) {
        params.append('endDate', endDate)
      }
      
      const response = await fetch(`/api/librarian/get_transaction_history.php?${params.toString()}`)
      const data = await response.json()
      
      if (data.success) {
        setHistoryData(data.transactions || [])
      } else {
        console.error('Failed to fetch transactions:', data.message)
      }
    } catch (error) {
      console.error('Error fetching transaction history:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredData = historyData
    .filter((item) =>
      searchUserId.trim() ? 
        String(item.userId).toLowerCase().includes(searchUserId.trim().toLowerCase()) ||
        String(item.userName || '').toLowerCase().includes(searchUserId.trim().toLowerCase())
      : true
    )

  const handleExportPDF = () => {
    const params = new URLSearchParams()
    
    if (activeTab !== 'all') {
      params.append('type', activeTab)
    }
    if (startDate) {
      params.append('startDate', startDate)
    }
    if (endDate) {
      params.append('endDate', endDate)
    }
    if (searchUserId.trim()) {
      params.append('search', searchUserId.trim())
    }
    if (user && user.email) {
      params.append('user_email', user.email)
    }
    
    // Open in new window for print/save as PDF
    const url = `/api/export_history_pdf.php?${params.toString()}`
    window.open(url, '_blank')
  }

  return (
    <div className="librarian-history-page">
      <Header user={user} onLogout={onLogout} />

      <div className="history-container">
        <h1 className="history-title">History</h1>

        {/* Tabs */}
        <div className="history-tabs">
          <button className={`tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
            All
          </button>
          <button
            className={`tab-btn ${activeTab === "borrow" ? "active" : ""}`}
            onClick={() => setActiveTab("borrow")}
          >
            Borrow
          </button>
          <button
            className={`tab-btn ${activeTab === "return" ? "active" : ""}`}
            onClick={() => setActiveTab("return")}
          >
            Return
          </button>
          <button
            className={`tab-btn ${activeTab === "payment" ? "active" : ""}`}
            onClick={() => setActiveTab("payment")}
          >
            Payment
          </button>
        </div>

        {/* Search and Filters */}
        <div className="filters-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search by Student ID, Name, Book Title..."
            value={searchUserId}
            onChange={(e) => setSearchUserId(e.target.value)}
          />

          <div className="date-range">
            <h3>Select Date Range</h3>
            <div className="date-inputs">
              <div className="date-input-group">
                <label>Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                />
              </div>
              <div className="date-input-group">
                <label>End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* History List */}
        <div className="history-list">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              Loading transaction history...
            </div>
          ) : filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No transactions found for the selected filters.
            </div>
          ) : (
            filteredData.map((item) => (
              <div key={item.id} className="history-card">
                <div className="history-card-header">
                  <h3>{item.bookName}</h3>
                  <span className={`status-badge status-${item.status.toLowerCase()}`}>{item.status}</span>
                </div>
                <div className="history-details">
                  <div className="detail-row">
                    <span className="detail-label">User:</span>
                    <span className="detail-value">{item.userName} ({item.userType})</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Roll:</span>
                    <span className="detail-value">{item.userId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Copy ID:</span>
                    <span className="detail-value">{item.bookId}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">ISBN:</span>
                    <span className="detail-value">{item.isbn}</span>
                  </div>
                  {item.location && (
                    <div className="detail-row">
                      <span className="detail-label">Location:</span>
                      <span className="detail-value">{item.location}</span>
                    </div>
                  )}
                  {item.amount && item.amount > 0 && (
                    <div className="detail-row">
                      <span className="detail-label">Amount:</span>
                      <span className="detail-value amount">BDT {item.amount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="history-date">
                  {item.type === 'return' && item.returnDate ? 
                    `Returned: ${new Date(item.returnDate).toLocaleDateString()}` : 
                    `Date: ${item.date}`
                  }
                </div>
              </div>
            ))
          )}
        </div>

        {/* Export Button */}
        <button className="btn-secondary btn-lg" onClick={handleExportPDF}>
          Export History as PDF
        </button>
      </div>

      {/* Bottom Navigation */}
      {/* Top navigation is provided by Header when user is logged in */}
    </div>
  )
}

export default LibrarianHistory
