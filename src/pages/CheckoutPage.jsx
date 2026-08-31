import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MembershipModal from '../components/MembershipModal';
import './CheckoutPage.css';

const API_BASE = '/api';

function CheckoutPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Borrow Request Form State
  const [studentRealName, setStudentRealName] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('ttu_user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      setStudentRealName(u.name || '');
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

  const handleRequestBorrow = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/');
      return;
    }

    if (!studentRealName.trim()) {
      setErrorMessage('Please provide your official real name.');
      return;
    }

    if (user.role !== 'librarian' && user.membership_status !== 'approved') {
      setIsMembershipModalOpen(true);
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch(API_BASE + '/transactions/request-borrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          bookId: book.id,
          studentRealName: studentRealName.trim(),
          notes: notes.trim(),
          durationDays: parseInt(durationDays, 10) || 7
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitSuccess(data.transaction || true);
        
        // Update name in local state and session storage
        const updatedUser = { ...user, name: studentRealName.trim() };
        setUser(updatedUser);
        sessionStorage.setItem('ttu_user', JSON.stringify(updatedUser));
      } else {
        setErrorMessage(data.message || 'Failed to submit borrow request.');
      }
    } catch (err) {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-page">
        <div className="checkout-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="checkout-spinner" />
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
            <p style={{ marginTop: 16, color: '#E74C3C', fontSize: 16, fontWeight: 600 }}>Book not found</p>
            <p style={{ marginTop: 4, color: '#43474D', fontSize: 14 }}>{error}</p>
            <button onClick={() => navigate('/bookshelf')} className="retry-btn">Back to Bookshelf</button>
          </div>
        </div>
      </div>
    );
  }

  const isAvailable = (book.availableCopies || 0) > 0;

  return (
    <div className="checkout-page">
      <div className="checkout-main-content">
        <header className="checkout-header">
          <div>
            <h1>Request to Borrow Book</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13.5 }}>
              Submit your borrowing request for librarian verification and physical copy reservation.
            </p>
          </div>
          <button className="btn-back" onClick={() => navigate(-1)}>← Back</button>
        </header>

        <main className="checkout-main">
          {/* Left Column: Book Preview */}
          <div className="checkout-book-card">
            <div className="checkout-cover-container">
              {book.cover || book.cover_url ? (
                <img src={book.cover || book.cover_url} alt={book.title} className="checkout-cover-img" />
              ) : (
                <div className="checkout-cover-fallback">
                  <span>📖</span>
                  <span>{book.title}</span>
                </div>
              )}
            </div>

            <div className="checkout-book-details">
              <span className="checkout-genre-badge">{book.genre || 'General'}</span>
              <h2>{book.title}</h2>
              <p className="checkout-author">by {book.author}</p>
              
              <div className="checkout-meta-grid">
                <div className="meta-item">
                  <span className="meta-label">Publisher</span>
                  <span className="meta-value">{book.publisher || '—'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Class No</span>
                  <span className="meta-value">{book.class_no || '—'}</span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Available</span>
                  <span className={`meta-value ${isAvailable ? 'text-green' : 'text-amber'}`}>
                    {book.availableCopies} of {book.totalCopies || book.availableCopies} copies
                  </span>
                </div>
                <div className="meta-item">
                  <span className="meta-label">Loan Term</span>
                  <span className="meta-value">{durationDays} days loan</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Request Form or Success State */}
          <div className="checkout-form-container">
            {submitSuccess ? (
              <div className="checkout-success-card">
                <div className="success-icon">🎉</div>
                <h3>Borrow Request Submitted!</h3>
                <p>
                  Your request for <strong>"{book.title}"</strong> has been sent to the library desk. 
                  The librarian will verify the physical copy and approve your loan shortly.
                </p>
                <div className="success-details-box">
                  <div className="detail-row">
                    <span>Borrower:</span>
                    <strong>{user?.name}</strong>
                  </div>
                  <div className="detail-row">
                    <span>Requested Period:</span>
                    <strong>{durationDays} days</strong>
                  </div>
                  <div className="detail-row">
                    <span>Status:</span>
                    <span className="status-pill pending">⏳ Pending Librarian Approval</span>
                  </div>
                </div>
                <div className="success-actions">
                  <button className="btn-primary" onClick={() => user && navigate(`/mybooks/${user.id}`)}>
                    View My Borrow Requests →
                  </button>
                  <button className="btn-secondary" onClick={() => navigate('/bookshelf')}>
                    Explore More Books
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestBorrow} className="checkout-form">
                <h3 className="form-heading">Borrowing Application Form</h3>

                {/* Membership Check Alert */}
                {user && user.role !== 'librarian' && user.membership_status !== 'approved' && (
                  <div className="checkout-membership-alert">
                    <div>
                      <strong>🪪 Library Membership Required</strong>
                      <p>You must have an approved student membership to request physical book loans.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-alert-action"
                      onClick={() => setIsMembershipModalOpen(true)}
                    >
                      {user.membership_status === 'pending' ? 'View Status' : 'Apply Now'}
                    </button>
                  </div>
                )}

                {errorMessage && (
                  <div className="checkout-error-banner">
                    <span>✕</span>
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Student Real Name input */}
                <div className="form-group">
                  <label htmlFor="student-realname">Student Official Full Name (Real Name)</label>
                  <input
                    id="student-realname"
                    type="text"
                    className="form-control"
                    placeholder="Enter your official real name (e.g. Mg Aung Kyaw)"
                    value={studentRealName}
                    onChange={e => setStudentRealName(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '3px' }}>
                    💡 Overwrites any random Google account username with your official name across the library system.
                  </span>
                </div>

                {/* Loan Duration Selector */}
                <div className="form-group">
                  <label htmlFor="duration-select">Select Loan Duration</label>
                  <select
                    id="duration-select"
                    value={durationDays}
                    onChange={e => setDurationDays(Number(e.target.value))}
                    className="form-control"
                  >
                    <option value={7}>7 Days (Standard Student Loan)</option>
                    <option value={14}>14 Days (Extended Research Loan)</option>
                    <option value={21}>21 Days (Semester Thesis Loan)</option>
                  </select>
                </div>

                {/* Purpose / Notes */}
                <div className="form-group">
                  <label htmlFor="purpose-notes">Purpose / Notes for Librarian (Optional)</label>
                  <textarea
                    id="purpose-notes"
                    rows={3}
                    className="form-control"
                    placeholder="e.g. For Course Assignment / Final Year Project Reference"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>

                {/* Policy reminder */}
                <div className="loan-policy-box">
                  <span className="policy-icon">ℹ️</span>
                  <span>
                    Books returned after the due date incur a late fee of <strong>50 kyats per day</strong>. Please handle books with care.
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-submit-request"
                    disabled={submitting || !isAvailable || (user && user.role !== 'librarian' && user.membership_status !== 'approved')}
                  >
                    {submitting ? 'Submitting Request…' : !isAvailable ? 'No Copies Available' : 'Submit Borrow Request 📥'}
                  </button>
                  <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </main>
      </div>

      {/* Membership Modal */}
      {user && (
        <MembershipModal
          isOpen={isMembershipModalOpen}
          onClose={() => setIsMembershipModalOpen(false)}
          user={user}
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
          }}
        />
      )}
    </div>
  );
}

export default CheckoutPage;
