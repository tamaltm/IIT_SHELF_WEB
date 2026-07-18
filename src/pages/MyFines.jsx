import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import './MyFines.css';

const MyFines = ({ user, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [fines, setFines] = useState([]);
  const [summary, setSummary] = useState({ total: 0, unpaid: 0, paid: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedFines, setSelectedFines] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');

  useEffect(() => {
    if (user && user.email) {
      fetchFines(user.email);
    }
  }, [user]);

  const fetchFines = async (email) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/payments/get_user_fines.php?user_email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.success) {
        setFines(data.fines);
        setSummary(data.summary);
      } else {
        console.error('Failed to fetch fines:', data.message);
      }
    } catch (error) {
      console.error('Error fetching fines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFine = (fineId) => {
    setSelectedFines(prev => {
      if (prev.includes(fineId)) {
        return prev.filter(id => id !== fineId);
      } else {
        return [...prev, fineId];
      }
    });
  };

  const handleSelectAll = () => {
    const unpaidFines = fines.filter(f => f.paid === '0');
    if (selectedFines.length === unpaidFines.length) {
      setSelectedFines([]);
    } else {
      setSelectedFines(unpaidFines.map(f => f.fine_id));
    }
  };

  const calculateSelectedTotal = () => {
    return fines
      .filter(f => selectedFines.includes(f.fine_id))
      .reduce((sum, f) => sum + parseFloat(f.amount), 0)
      .toFixed(2);
  };

  const handlePayFines = () => {
    if (selectedFines.length === 0) {
      alert('Please select at least one fine to pay');
      return;
    }
    setSelectedPaymentMethod('bkash'); // Auto-select bKash
    setShowPaymentModal(true);
  };

  const processBkashPayment = async () => {
    
    try {
      setProcessing(true);
      
      // Directly call process payment endpoint
      const response = await fetch('/api/payments/process_payment.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fine_ids: selectedFines,
          user_email: user.email,
          payment_method: 'bkash'
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Payment successful! Transaction ID: ${data.transaction_id}`);
        setShowPaymentModal(false);
        setSelectedFines([]);
        setSelectedPaymentMethod('');
        // Reload fines to show updated status
        fetchFines(user.email);
      } else {
        alert(`Payment failed: ${data.message}`);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Error processing payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const unpaidFines = fines.filter(f => f.paid === '0');
  const paidFines = fines.filter(f => f.paid === '1');

  if (loading) {
    return (
      <>
        <Header user={user} onLogout={onLogout} />
        <div className="fines-page">
          <div className="fines-container">
            <div className="loading">Loading fines...</div>
          </div>
        </div>
        <BottomNav userRole={userRole} />
      </>
    );
  }

  return (
    <>
      <Header user={user} onLogout={onLogout} />
      <div className="fines-page">
        <div className="fines-container">
          <div className="fines-header">
            <h1>My Fines</h1>
            <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
          </div>

      {/* Summary Cards */}
      <div className="fines-summary">
        <div className="summary-card">
          <h3>Total Fines</h3>
          <p className="amount">{summary.total} Tk</p>
        </div>
        <div className="summary-card unpaid">
          <h3>Unpaid Fines</h3>
          <p className="amount">{summary.unpaid} Tk</p>
        </div>
        <div className="summary-card paid">
          <h3>Paid Fines</h3>
          <p className="amount">{summary.paid} Tk</p>
        </div>
      </div>

      {/* Unpaid Fines Section */}
      {unpaidFines.length > 0 && (
        <div className="fines-section">
          <div className="section-header">
            <h2>Unpaid Fines ({unpaidFines.length})</h2>
            <div className="actions">
              <button onClick={handleSelectAll} className="select-all-btn">
                {selectedFines.length === unpaidFines.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedFines.length > 0 && (
                <button 
                  onClick={handlePayFines} 
                  className="pay-btn"
                  disabled={processing}
                >
                  {processing ? 'Processing...' : `Pay Selected (${calculateSelectedTotal()} Tk)`}
                </button>
              )}
            </div>
          </div>

          <div className="fines-table-wrapper">
            <table className="fines-table">
              <thead>
                <tr>
                  <th>Select</th>
                  <th>Book</th>
                  <th>Author</th>
                  <th>Borrowed Date</th>
                  <th>Due Date</th>
                  <th>Returned Date</th>
                  <th>Days Overdue</th>
                  <th>Description</th>
                  <th>Amount (Tk)</th>
                </tr>
              </thead>
              <tbody>
                {unpaidFines.map(fine => (
                  <tr key={fine.fine_id} className="unpaid-row">
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedFines.includes(fine.fine_id)}
                        onChange={() => handleSelectFine(fine.fine_id)}
                      />
                    </td>
                    <td className="book-title">{fine.title || 'N/A'}</td>
                    <td>{fine.author || 'N/A'}</td>
                    <td>{new Date(fine.borrowed_date).toLocaleDateString()}</td>
                    <td>{new Date(fine.due_date).toLocaleDateString()}</td>
                    <td>{new Date(fine.returned_date).toLocaleDateString()}</td>
                    <td className="overdue-days">{fine.days_overdue || 'N/A'}</td>
                    <td>{fine.description}</td>
                    <td className="amount-cell">{parseFloat(fine.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paid Fines Section */}
      {paidFines.length > 0 && (
        <div className="fines-section">
          <h2>Paid Fines ({paidFines.length})</h2>
          <div className="fines-table-wrapper">
            <table className="fines-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Author</th>
                  <th>Borrowed Date</th>
                  <th>Due Date</th>
                  <th>Returned Date</th>
                  <th>Days Overdue</th>
                  <th>Description</th>
                  <th>Amount (Tk)</th>
                  <th>Payment Date</th>
                </tr>
              </thead>
              <tbody>
                {paidFines.map(fine => (
                  <tr key={fine.fine_id} className="paid-row">
                    <td className="book-title">{fine.title || 'N/A'}</td>
                    <td>{fine.author || 'N/A'}</td>
                    <td>{new Date(fine.borrowed_date).toLocaleDateString()}</td>
                    <td>{new Date(fine.due_date).toLocaleDateString()}</td>
                    <td>{new Date(fine.returned_date).toLocaleDateString()}</td>
                    <td>{fine.days_overdue || 'N/A'}</td>
                    <td>{fine.description}</td>
                    <td className="amount-cell">{parseFloat(fine.amount).toFixed(2)}</td>
                    <td>{fine.payment_date ? new Date(fine.payment_date).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Fines Message */}
      {fines.length === 0 && (
        <div className="no-fines">
          <p>No fines found. Great job!</p>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="payment-modal-overlay" onClick={() => !processing && setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              className="close-modal" 
              onClick={() => setShowPaymentModal(false)}
              disabled={processing}
            >
              ×
            </button>
            
            <h2>Pay Outstanding Fines</h2>
            
            <div className="payment-summary">
              <div className="summary-row">
                <span>Total Outstanding:</span>
                <strong>BDT {calculateSelectedTotal()}</strong>
              </div>
            </div>

            <div className="payment-methods">
              <h3>Select Payment Method</h3>
              <div 
                className={`payment-option ${selectedPaymentMethod === 'bkash' ? 'selected' : ''}`}
                onClick={() => setSelectedPaymentMethod('bkash')}
              >
                <div className="payment-logo bkash-logo">
                  <span style={{color: '#E2136E', fontWeight: 'bold', fontSize: '20px'}}>bKash</span>
                </div>
                <div className="payment-info">
                  <strong>bKash</strong>
                  <p>Pay with your bKash account</p>
                </div>
                {selectedPaymentMethod === 'bkash' && (
                  <div className="checkmark">✓</div>
                )}
              </div>
            </div>

            <button 
              className="proceed-payment-btn" 
              onClick={processBkashPayment}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      )}
        </div>
      </div>
      <BottomNav userRole={userRole} />
    </>
  );
};

export default MyFines;
