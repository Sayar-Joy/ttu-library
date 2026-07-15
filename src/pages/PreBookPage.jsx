import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './PreBookPage.css';

const API_BASE = 'http://localhost:3001/api';

function PreBookPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const storedUser = sessionStorage.getItem('ttu_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    fetch(`${API_BASE}/books/${bookId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
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

  const handlePreBook = async () => {
    if (!user) {
      navigate('/');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/transactions/pre-book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, bookId: book._id }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setErrorMessage(data.message);
      }
    } catch (err) {
      setErrorMessage('Failed to pre-book. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="pre-book-page">
        <div className="pre-book-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E4E7EC" strokeWidth="3"/>
              <path d="M12 2a10 10 0 0 9.95 9" stroke="#366380" strokeWidth="3" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>
            <p style={{ marginTop: 16, color: '#43474D', fontSize: 14 }}>Loading book details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pre-book-page">
        <div className="pre-book-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
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

  return (
    <div className="pre-book-page">
      <div className="pre-book-main-content">
        <header className="pre-book-header">
          <h1>Pre-book</h1>
        </header>

        <main className="pre-book-main">
          <div className="pre-book-book-info">
            <h2>{book.title}</h2>
            <p>by {book.author}</p>
            <p>Status: {book.availableCopies > 0 ? 'Available' : 'Unavailable'}</p>
          </div>

          {success && (
            <p className="success-message">✅ Book pre-booked successfully!</p>
          )}

          {errorMessage && (
            <p className="error-message">❌ {errorMessage}</p>
          )}

          <div className="pre-book-actions">
            {book.availableCopies > 0 ? (
              <button className="btn-pre-book" onClick={handlePreBook}>
                Pre-book This Book
              </button>
            ) : (
              <button className="btn-pre-book" disabled>
                Pre-book (Coming Soon)
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default PreBookPage;