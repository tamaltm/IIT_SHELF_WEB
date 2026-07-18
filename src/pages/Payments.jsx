"use client"

import { useState, useEffect } from "react"
import Header from "../components/Header"
import BottomNav from "../components/BottomNav"
import PageTransition from "../components/PageTransition"
import "./Payments.css"

function Payments({ user, userRole, onLogout }) {
  const [activeTab, setActiveTab] = useState("history")
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0], // First day of current month
    endDate: new Date().toISOString().split('T')[0], // Today
  })
  const [transactions, setTransactions] = useState([])
  const [outstandingFines, setOutstandingFines] = useState([])
  const [finesList, setFinesList] = useState([]) // exact API: fines -> fine_id
  const [pendingFinesList, setPendingFinesList] = useState([]) // exact API: pending_fines -> transaction_id
  const [stats, setStats] = useState({
    totalOutstanding: 0,
    totalPaidThisMonth: 0,
    totalTransactions: 0
  })
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  // Fetch payment data from backend
  useEffect(() => {
    const fetchPaymentData = async () => {
      if (!user?.email) return
      
      setLoading(true)
      try {
        console.log('Fetching payment history for:', user.email)
        
        // Fetch payment history
        const historyUrl = `/api/payments/get_payment_history.php?user_email=${encodeURIComponent(user.email)}`
        const historyResponse = await fetch(historyUrl)
        const historyData = await historyResponse.json()
        
        // Fetch outstanding fines
        const finesUrl = `/api/payments/get_user_fines.php?user_email=${encodeURIComponent(user.email)}`
        const finesResponse = await fetch(finesUrl)
        const finesData = await finesResponse.json()
        
        console.log('Payment history:', historyData)
        console.log('Outstanding fines:', finesData)
        
        if (historyData.success && finesData.success) {
          setTransactions(historyData.payment_history || [])

          // Store raw lists for ID extraction (mirrors mobile)
          const fines = finesData.fines || []
          const pendingFines = finesData.pending_fines || []
          setFinesList(fines)
          setPendingFinesList(pendingFines)

          // Build a unified display list for the UI
          const normalizedFines = fines.map((f) => ({
            id: f.fine_id,
            amount: parseFloat(f.amount || 0),
            bookTitle: f.description || 'Library Fine',
            author: '',
            isbn: '',
            bookId: '',
            reason: f.description || 'Fine',
            type: 'fine',
          }))

          const normalizedPending = pendingFines.map((p) => ({
            id: p.transaction_id,
            amount: parseFloat(p.amount || 0),
            bookTitle: p.book_title,
            author: p.author || '',
            isbn: p.isbn || '',
            bookId: p.book_id || '',
            reason: p.description || 'Overdue Fine',
            type: 'pending',
            transaction_id: p.transaction_id,
          }))

          setOutstandingFines([...normalizedPending, ...normalizedFines])

          // Calculate stats
          const totalOutstanding = parseFloat(finesData.total_outstanding || 0)
          const totalPaid = (historyData.payment_history || []).reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
          
          setStats({
            totalOutstanding: totalOutstanding,
            totalPaidThisMonth: totalPaid,
            totalTransactions: (historyData.payment_history || []).length
          })
        } else {
          console.error('API returned error:', historyData.message || finesData.message)
        }
      } catch (error) {
        console.error('Error fetching payment data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchPaymentData()
  }, [user, dateRange])

  const totalOutstanding = stats.totalOutstanding

  const handlePayAllFines = () => {
    if (totalOutstanding <= 0) {
      alert('No outstanding fines to pay')
      return
    }
    setShowPaymentModal(true)
  }

  const processPayment = async () => {
    if (totalOutstanding <= 0) {
      alert('No outstanding fines to pay')
      return
    }

    try {
      setProcessingPayment(true)

      console.log('All outstanding fines:', outstandingFines)
      
      // Log each fine to see what fields are available
      outstandingFines.forEach((fine, index) => {
        console.log(`Fine ${index}:`, fine)
      })

      // Extract IDs from raw lists (mirrors mobile API)
      const fineIds = (finesList || [])
        .map((f) => f.fine_id)
        .filter((id) => id != null)
      const transactionIds = (pendingFinesList || [])
        .map((p) => p.transaction_id)
        .filter((id) => id != null)
      
      console.log('Fine IDs to send:', fineIds)
      console.log('Transaction IDs to send:', transactionIds)

      if (fineIds.length === 0 && transactionIds.length === 0) {
        // If no IDs found, try to use the index or any available ID
        console.error('No fine_id or transaction_id found in fines')
        console.error('Available keys in first fine:', Object.keys(outstandingFines[0] || {}))
        console.error('Raw finesList sample:', finesList[0])
        console.error('Raw pendingFinesList sample:', pendingFinesList[0])
        alert('No valid fines found to pay - check console for details')
        setProcessingPayment(false)
        return
      }

      const response = await fetch('/api/payments/process_payment.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_email: user.email,
          fine_ids: fineIds,
          transaction_ids: transactionIds,
          payment_method: 'cash'
        })
      })

      const data = await response.json()
      
      console.log('Payment response:', data)

      if (data.success) {
        setShowPaymentModal(false)
        
        alert(
          `✅ Payment Successful!\n\n` +
          `Amount Paid: ${data.amount.toFixed(2)} BDT\n` +
          `Transaction ID: ${data.transaction_id}\n` +
          `Payment Method: bKash\n\n` +
          `Thank you for your payment!`
        )
        
        // Refresh payment data
        window.location.reload()
      } else {
        alert('❌ Payment failed: ' + data.message)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Network error. Please try again.')
    } finally {
      setProcessingPayment(false)
    }
  }

  return (
    <PageTransition className="payments-page">
      <Header user={user} onLogout={onLogout} />

      <div className="payments-container">
        <div className="payments-header">
          <h1>IITShelf</h1>
          <div className="search-bar-container">
            <input type="text" className="search-input" placeholder="Search Transaction..." />
          </div>
        </div>

        <div className="payments-tabs">
          <button
            className={`payments-tab ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            History
          </button>
          <button
            className={`payments-tab ${activeTab === "outstanding" ? "active" : ""}`}
            onClick={() => setActiveTab("outstanding")}
          >
            Outstanding
          </button>
          <button
            className={`payments-tab ${activeTab === "details" ? "active" : ""}`}
            onClick={() => setActiveTab("details")}
          >
            Details
          </button>
        </div>

        {activeTab === "history" && (
          <>
            <div className="date-range-selector">
              <label>Date Range</label>
              <div className="date-inputs">
                <input
                  type="date"
                  className="form-input"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
                <span>to</span>
                <input
                  type="date"
                  className="form-input"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="transactions-list">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
              ) : transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No payment history found for the selected date range.</div>
              ) : (
                transactions.map((transaction) => (
                <div key={transaction.id} className="transaction-card">
                  <div className="transaction-header">
                    <span className="transaction-time">{transaction.timeAgo}</span>
                  </div>
                  <div className="transaction-details">
                    <div className="transaction-info">
                      <p className="transaction-id">Transaction ID: {transaction.id}</p>
                      <p className="transaction-book">For Book: {transaction.bookTitle}</p>
                      <p className="transaction-meta">Author: {transaction.author}</p>
                      <p className="transaction-meta">ISBN: {transaction.isbn}</p>
                      <p className="transaction-meta">Book ID: {transaction.bookId}</p>
                      <p className="transaction-reason">Reason: {transaction.reason}</p>
                    </div>
                    <div className="transaction-amount">
                      <span className="amount-label">paid</span>
                      <span className="amount-value">TK {transaction.amount.toFixed(2)}</span>
                      <span className="fine-label">fine</span>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </>
        )}

        {activeTab === "outstanding" && (
          <>
            <div className="outstanding-summary">
              <div className="outstanding-total">
                <span>Outstanding Fines</span>
                <strong>BDT {totalOutstanding.toFixed(2)}</strong>
              </div>
              <button 
                className="btn-compact btn-primary" 
                onClick={handlePayAllFines}
                disabled={totalOutstanding <= 0 || loading}
              >
                Pay Now
              </button>
            </div>

            <div className="transactions-list">
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
              ) : outstandingFines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No outstanding fines.</div>
              ) : (
                outstandingFines.map((fine) => (
                <div key={fine.id} className="transaction-card outstanding">
                  <div className="transaction-details">
                    <div className="transaction-info">
                      <p className="transaction-book">For Book: {fine.bookTitle}</p>
                      <p className="transaction-meta">Author: {fine.author}</p>
                      <p className="transaction-meta">ISBN: {fine.isbn}</p>
                      <p className="transaction-meta">Book ID: {fine.bookId}</p>
                      <p className="transaction-reason">Reason: {fine.reason}</p>
                    </div>
                    <div className="transaction-amount">
                      <span className="amount-label" style={{color: '#dc3545'}}>unpaid</span>
                      <span className="amount-value">TK {fine.amount.toFixed(2)}</span>
                      <span className="fine-label">fine</span>
                    </div>
                  </div>
                </div>
              ))
              )}
            </div>
          </>
        )}

        {activeTab === "details" && (
          <div className="payment-details-section">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Paid This Month</h3>
                <p className="stat-value">BDT {stats.totalPaidThisMonth.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <h3>Total Outstanding</h3>
                <p className="stat-value text-danger">BDT {stats.totalOutstanding.toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <h3>Total Transactions</h3>
                <p className="stat-value">{stats.totalTransactions}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
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
                  {totalOutstanding.toFixed(2)} <span style={{fontSize: '1.2rem'}}>BDT</span>
                </div>
                <div style={{fontSize: '0.85rem', color: '#666', marginTop: '8px'}}>
                  {(finesList.length + pendingFinesList.length)} fine{(finesList.length + pendingFinesList.length) > 1 ? 's' : ''} to be paid
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
                  {[...outstandingFines].slice(0, 3).map(fine => (
                    <li key={fine.id}>{fine.bookTitle || fine.reason || 'Fine'}: {Number(fine.amount || 0).toFixed(2)} BDT</li>
                  ))}
                  {(finesList.length + pendingFinesList.length) > 3 && (
                    <li>...and {(finesList.length + pendingFinesList.length) - 3} more</li>
                  )}
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

export default Payments
