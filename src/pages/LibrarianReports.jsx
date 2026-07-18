"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import "./LibrarianReports.css"

function LibrarianReports({ user, onLogout }) {
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(1)).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [reportType, setReportType] = useState("most_borrowed")
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState([])
  const [mostBorrowedBooks, setMostBorrowedBooks] = useState([])
  const [loading, setLoading] = useState(false)
  const [recentReports, setRecentReports] = useState([
    { id: 1, name: 'Most Borrowed Books - January 2026', type: 'most_borrowed', date: '2026-01-13' },
    { id: 2, name: 'Most Requested Books - January 2026', type: 'most_requested', date: '2026-01-12' },
    { id: 3, name: 'Semester Wise Borrowing - December 2025', type: 'semester_wise', date: '2026-01-10' }
  ])

  // Fetch available sessions on mount
  useEffect(() => {
    fetchAvailableSessions()
  }, [])

  const fetchAvailableSessions = async () => {
    try {
      const response = await fetch('/api/reports/generate_report.php?type=sessions')
      const data = await response.json()
      if (data.success) {
        // Sessions fetched but not used in UI anymore
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
    }
  }

  // Fetch report data when parameters change
  useEffect(() => {
    fetchReportData()
  }, [reportType, startDate, endDate])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      console.log('User object:', user)
      console.log('User email:', user?.email)
      
      const payload = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        format: 'json'
      }
      
      console.log('Request payload:', payload)
      
      const response = await fetch('/api/reports/generate_report.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      const data = await response.json()
      console.log('Response data:', data)
      
      if (data.success) {
        setMostBorrowedBooks(data.data || [])
        setReportData([])
      } else {
        console.error('Error response:', data.message)
      }
    } catch (error) {
      console.error('Error fetching report:', error)
    } finally {
      setLoading(false)
    }
  }

  const maxBorrows = mostBorrowedBooks.length > 0 ? Math.max(...mostBorrowedBooks.map((b) => b.borrow_count)) : 1

  const toCSV = (rows) => {
    if (!rows || rows.length === 0) return ""
    const headers = Object.keys(rows[0])
    const escape = (v) => {
      const s = String(v ?? "")
      if (s.includes(",") || s.includes("\n") || s.includes("\"")) {
        return '"' + s.replace(/"/g, '""') + '"'
      }
      return s
    }
    const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))]
    return lines.join("\n")
  }

  const downloadFile = (content, filename, type = "text/csv") => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleGenerate = async () => {
    try {
      setIsGenerating(true)
      await fetchReportData()
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportCSV = async () => {
    if (reportData.length === 0 && mostBorrowedBooks.length === 0) {
      alert('Please generate a report first.')
      return
    }
    
    try {
      const dataToExport = reportType === 'most_borrowed' || reportType === 'most_requested' || reportType === 'semester_wise' || reportType === 'session_wise' ? mostBorrowedBooks : reportData
      const csv = toCSV(dataToExport)
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
      downloadFile(csv, `${reportType}-report_${stamp}.csv`)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Error exporting CSV')
    }
  }

  const handleExportPDF = () => {
    const payload = {
      report_type: reportType,
      start_date: startDate,
      end_date: endDate,
      format: 'pdf'
    }
    
    const response = fetch('/api/reports/generate_report.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    })
    .catch(err => console.error('Error downloading PDF:', err))
  }

  return (
    <div className="librarian-reports-page">
      <Header user={user} onLogout={onLogout} />

      <div className="reports-container">
        <h1 className="reports-title">Generate Reports</h1>

        {/* Filters Section */}
        <div className="filters-section">
          <h2>Filters</h2>
          
          <div className="filter-group">
            <label>Date Range</label>
            <div className="date-range-inputs">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="date-separator">—</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="most_borrowed">Most Borrowed Books</option>
              <option value="most_requested">Most Requested Books</option>
              <option value="semester_wise">Semester Wise Borrowing</option>
              <option value="session_wise">Session Wise Borrowing</option>
            </select>
          </div>
        </div>

        {/* Generate Button Section */}
        <div className="action-buttons">
          <button 
            className="btn-primary btn-lg" 
            onClick={handleGenerate} 
            disabled={isGenerating || loading}
          >
            {isGenerating ? "Generating…" : "Generate Report"}
          </button>
        </div>

        {/* Export Buttons */}
        <div className="export-buttons-row">
          <button 
            className="btn-secondary export-pdf" 
            onClick={handleExportPDF} 
            disabled={loading}
          >
            Export PDF
          </button>
          <button 
            className="btn-secondary export-csv" 
            onClick={handleExportCSV} 
            disabled={isGenerating || loading}
          >
            {isGenerating ? "Generating..." : "Export CSV"}
          </button>
        </div>

        {/* Report Preview - Show only if data is loaded */}
        {!loading && (reportData.length > 0 || mostBorrowedBooks.length > 0) && (
          <div className="report-preview-section">
            <h2>Report Preview</h2>
            {(reportType === 'most_borrowed' || reportType === 'most_requested') ? (
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>Author</th>
                      <th>ISBN</th>
                      <th>Category</th>
                      <th>{reportType === 'most_requested' ? 'Request Count' : 'Borrow Count'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostBorrowedBooks.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td>{row.title}</td>
                        <td>{row.author}</td>
                        <td>{row.isbn}</td>
                        <td>{row.category}</td>
                        <td>{reportType === 'most_requested' ? row.request_count : row.borrow_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (reportType === 'semester_wise') ? (
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Semester</th>
                      <th>Borrow Count</th>
                      <th>Request Count</th>
                      <th>Unique Users</th>
                      <th>Books</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostBorrowedBooks.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td>{row.semester || 'Unassigned'}</td>
                        <td>{row.borrow_count}</td>
                        <td>{row.request_count || 0}</td>
                        <td>{row.unique_borrowers || 0}</td>
                        <td>{row.book_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (reportType === 'session_wise') ? (
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Academic Year</th>
                      <th>Borrow Count</th>
                      <th>Request Count</th>
                      <th>Reservations</th>
                      <th>Unique Users</th>
                      <th>Books</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostBorrowedBooks.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td>{row.academic_year || 'Unassigned'}</td>
                        <td>{row.borrow_count}</td>
                        <td>{row.request_count || 0}</td>
                        <td>{row.reservation_count || 0}</td>
                        <td>{row.unique_users || 0}</td>
                        <td>{row.book_count || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (reportType === 'fines') ? (
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Amount</th>
                      <th>Paid At</th>
                      <th>Book Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td>{row.user_name} ({row.student_roll || row.user_role})</td>
                        <td>BDT {parseFloat(row.amount).toFixed(2)}</td>
                        <td>{new Date(row.paid_at).toLocaleDateString()}</td>
                        <td>{row.book_title || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="report-table-container">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>User</th>
                      <th>Days Overdue</th>
                      <th>Fine Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.slice(0, 10).map((row, index) => (
                      <tr key={index}>
                        <td>{row.book_title}</td>
                        <td>{row.user_name} ({row.student_roll || row.user_role})</td>
                        <td>{row.days_overdue}</td>
                        <td>BDT {parseFloat(row.fine_amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Recent Reports Section */}
        <div className="recent-reports-section">
          <h2>Recent Reports</h2>
          {recentReports.length > 0 ? (
            <div className="recent-reports-list">
              {recentReports.map((report) => (
                <div key={report.id} className="recent-report-item">
                  <div className="report-info">
                    <h3>{report.name}</h3>
                    <p>{new Date(report.date).toLocaleDateString()}</p>
                  </div>
                  <a href="#" className="view-link">View</a>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#666', padding: '1rem' }}>No recent reports</p>
          )}
          {recentReports.length > 0 && (
            <a href="#" className="see-all-link">see all</a>
          )}
        </div>
      </div>
    </div>
  )
}

export default LibrarianReports
