import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CheckoutPage.css';

const API_BASE = 'http://localhost:3001/api';

function CheckoutPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [borrowing, setBorrowing] = useState(false);
  const [borrowMsg, setBorrowMsg] = useState('');
  const [preBooking, setPreBooking] = useState(false);
  const [preBookingMsg, setPreBookingMsg] = useState('');
  const [qrCode, setQrCode] = useState(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('ttu_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    fetch(API_BASE + '/books/' + bookId)
      .then(res => {
        if (!res.ok) throw new Error('Server responded with ' + res.status);
        return res.json();
      })
      .then(data => {
        if (!data.success || !data.book) throw new Error('Book not found');
        setBook(data.book);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load book:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [bookId]);

  // Auto-close QR code modal after 10 seconds
  useEffect(() => {
    if (qrCode) {
      const timer = setTimeout(() => {
        setQrCode(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [qrCode]);

  const handleBorrow = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    setBorrowing(true);
    setBorrowMsg('');

    try {
      const res = await fetch(API_BASE + '/transactions/borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, bookId: book.id }),
      });
      const data = await res.json();

      if (data.success) {
        setBorrowMsg(`✅ Book borrowed successfully! Please return within 7 days.`);
        
        // Use QR code from backend response
        if (data.qrCode) {
          setQrCode(data.qrCode);
        }
        
        setBook(prev => ({ ...prev, availableCopies: Math.max(0, (prev.availableCopies || 1) - 1) }));
      } else {
        setBorrowMsg('❌ Error: ' + data.message);
      }
    } catch {
      setBorrowMsg('Failed to borrow. Please try again.');
    } finally {
      setBorrowing(false);
    }
  };

  const handlePreBook = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    setPreBooking(true);
    setPreBookingMsg('');

    try {
      const res = await fetch(API_BASE + '/transactions/pre-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, bookId: book.id }),
      });

      const data = await res.json();

      if (data.success) {
        setPreBookingMsg('Book pre-booked successfully!');
      } else {
        setPreBookingMsg('Error: ' + data.message);
      }
    } catch {
      setPreBookingMsg('Failed to pre-book. Please try again.');
    } finally {
      setPreBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="checkout-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E4E7EC" strokeWidth="3"/>
              <path d="M12 2a10 10 0 019.95 9" stroke="#366380" strokeWidth="3" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>
            <p style={{ marginTop: 16, color: '#43474D', fontSize: 14 }}>Loading book details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="checkout-page">
        <div className="checkout-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E74C3C" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p style={{ marginTop: 16, color: '#E74C3C', fontSize: 16, fontWeight: 600 }}>Book not found</p>
            <p style={{ marginTop: 4, color: '#43474D', fontSize: 14 }}>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-btn">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  const status = book
    ? (book.availableCopies > 0 ? 'available' : 'unavailable')
    : null;

  function getMsgClass(msg) {
    if (msg.startsWith('Book')) {
      return 'msg-success';
    }
    return 'msg-error';
  }

  return (
    <div className="checkout-page">
      <div className="checkout-main-content">
        <header className="checkout-header">
          <h1>Checkout Book</h1>
          <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        </header>

        <main className="checkout-main">
          <div className="checkout-book-info">
            <h2>{book.title}</h2>
            <p>by {book.author}</p>
            <p>Genre: {book.genre}</p>
            <p>Status: {status === 'available' ? 'Available' : 'Unavailable'}</p>
            
            {/* Borrowing Details */}
            {status === 'available' && (
              <div className="credit-info">
                <h3>Borrowing Details</h3>
                <p><strong>Borrow Period:</strong> 7 days</p>
                <p><strong>Late Fee:</strong> 50 kyats per day</p>
                <p><strong>Available Copies:</strong> {book.availableCopies}</p>
              </div>
            )}
          </div>

          {borrowMsg && (
            <p className={'borrow-message ' + getMsgClass(borrowMsg)}>
              {borrowMsg}
            </p>
          )}

          {preBookingMsg && (
            <p className={'pre-booking-message ' + getMsgClass(preBookingMsg)}>
              {preBookingMsg}
            </p>
          )}

          <div className="checkout-actions">
            {status === 'available' ? (
              <>
                <button className="btn-borrow" onClick={handleBorrow} disabled={borrowing}>
                  {borrowing ? 'Borrowing...' : 'Borrow This Book'}
                </button>
                <button className="btn-back" style={{ marginTop: '10px' }} onClick={() => navigate(-1)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button className="btn-reserve" onClick={handlePreBook} disabled={preBooking}>
                  {preBooking ? 'Pre-Booking...' : 'Reserve This Book'}
                </button>
                <button className="btn-back" style={{ marginTop: '10px' }} onClick={() => navigate(-1)}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </main>
      </div>

      {/* QR Code Modal */}
      {qrCode && (
        <div className="qr-modal-overlay" onClick={() => setQrCode(null)}>
          <div className="qr-modal-content" onClick={e => e.stopPropagation()}>
            <button className="qr-modal-close" onClick={() => setQrCode(null)}>×</button>
            <h3>✅ Borrow Successful!</h3>
            <div className="qr-code-container">
              {typeof qrCode === 'string' && qrCode.startsWith('data:image') ? (
                <img src={qrCode} alt="QR Code" className="qr-image" />
              ) : (
                <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <rect width="200" height="200" fill="#fff"/>
                  <rect width="40" height="40" x="40" y="40" fill="#000"/>
                  <rect width="40" height="40" x="120" y="40" fill="#000"/>
                  <rect width="40" height="40" x="40" y="120" fill="#000"/>
                  <rect width="40" height="40" x="120" y="120" fill="#000"/>
                  <rect width="20" height="20" x="90" y="90" fill="#000"/>
                </svg>
              )}
            </div>
            {typeof qrCode === 'string' ? (
              <p className="qr-info">
                Scan this QR code for your transaction details
              </p>
            ) : (
              <p className="qr-info">
                Transaction ID: {qrCode.transactionId}<br/>
                Book: {book.title}<br/>
                Due: 7 days from now<br/>
                Time: {new Date(qrCode.timestamp).toLocaleString()}
              </p>
            )}
            <p style={{ color: '#43474D', fontSize: 12, marginTop: 8 }}>This QR code will auto-close in 10 seconds</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default CheckoutPage;
