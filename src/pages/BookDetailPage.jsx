import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MembershipModal from '../components/MembershipModal';
import ThesisPdfViewer from '../components/ThesisPdfViewer';
import InternationalCatalogCard from '../components/InternationalCatalogCard';
import { getBookDdcClass, formatClassNoDual, DDC_COLORS, DDC_TEXT_COLORS } from '../lib/ddc';
import './BookDetailPage.css';

const API_BASE = '/api';

const genreColors = {
  ...DDC_COLORS,
  'Thesis': '#D1FAE5',
};

const genreTextColors = {
  ...DDC_TEXT_COLORS,
  'Thesis': '#047857',
};


function BookDetailPage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('bookshelf');
  const [borrowing, setBorrowing] = useState(false);
  const [borrowMsg, setBorrowMsg] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [user, setUser] = useState(null);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [showThesisPdf, setShowThesisPdf] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);
  const handleNavClick = (id) => {
    setActiveNav(id);
    setSidebarOpen(false);
    if (id === 'bookshelf') navigate('/bookshelf');
    if (id === 'profile' || id === 'mybooks' || id === 'notifications' || id === 'friends' || id === 'ai') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        const u = JSON.parse(stored);
        navigate(`/${id}/${u.id}`);
      } else {
        navigate(`/${id}`);
      }
      return;
    }
    if (id === 'logout') navigate('/');
  };

  useEffect(() => {
    setLoading(true);
    setError(null);

    const storedUser = sessionStorage.getItem('ttu_user');
    const userId = storedUser ? JSON.parse(storedUser).id : null;

    fetch(`${API_BASE}/books/${bookId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then(async data => {
        if (!data.success || !data.book) throw new Error('Book not found');
        const b = data.book;
        setBook(b);

        // Check if user has saved this book
        if (userId) {
          const userRes = await fetch(`${API_BASE}/profile/${userId}`);
          if (userRes.ok) {
            const userData = await userRes.json();
            // favoriteBooks is an array of book objects
            const isSaved = userData.profile?.favoriteBooks?.some(book => book.id === b.id);
            setIsSaved(isSaved);
          }
        }

        // Fetch related books of same genre
        return fetch(`${API_BASE}/books?genre=${encodeURIComponent(b.genre)}`);
      })
      .then(res => res.json())
      .then(data => {
        const relatedBooks = (data.books || [])
          .filter(b => b.id !== bookId)
          .slice(0, 4);
        setRelated(relatedBooks);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load book:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [bookId]);

  useEffect(() => {
    const stored = sessionStorage.getItem('ttu_user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleBorrow = () => {
    const stored = sessionStorage.getItem('ttu_user');
    if (!stored) { navigate('/'); return; }
    const u = JSON.parse(stored);
    setUser(u);

    // If student is not an approved member, open membership modal directly
    if (u.role !== 'librarian' && u.membership_status !== 'approved') {
      setIsMembershipModalOpen(true);
      return;
    }

    navigate(`/checkout/${book.id}`);
  };

  const handleSaveToggle = async () => {
    const stored = sessionStorage.getItem('ttu_user');
    if (!stored) {
      alert('Please log in to save books');
      return;
    }

    const user = JSON.parse(stored);
    try {
      const response = await fetch(`${API_BASE}/books/${book.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) throw new Error('Failed to save book');

      const data = await response.json();
      setIsSaved(data.saved);
      setBook(prev => ({ ...prev, totalSaved: data.totalSaved }));

      // Show feedback
      const msg = data.saved ? '✅ Book saved!' : '✅ Removed from saved';
      setBorrowMsg(msg);
      setTimeout(() => setBorrowMsg(''), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setBorrowMsg('❌ Failed to save book');
      setTimeout(() => setBorrowMsg(''), 3000);
    }
  };

  const status = book
    ? (book.availableCopies > 0 ? 'available' : 'unavailable')
    : null;

  // Loading
  if (loading) {
    return (
      <div className="bookdetail-page">
        <div className="bookdetail-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
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

  // Error
  if (error || !book) {
    return (
      <div className="bookdetail-page">
        <div className="bookdetail-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E74C3C" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p style={{ marginTop: 16, color: '#E74C3C', fontSize: 16, fontWeight: 600 }}>Book not found</p>
            <p style={{ marginTop: 4, color: '#43474D', fontSize: 14 }}>{error}</p>
            <Link to="/bookshelf" className="back-link-btn">← Back to Bookshelf</Link>
          </div>
        </div>
      </div>
    );
  }

  const available = status === 'available';

  return (
    <div className="bookdetail-page">
      <Sidebar activeNav={activeNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main */}
      <div className="bookdetail-main-content">
        {/* Header */}
        <header className="bookshelf-header">
          <div className="header-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {sidebarOpen ? (
                  <path d="M6 6L18 18M18 6L6 18" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/>
                ) : (
                  <>
                    <path d="M4 6H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M4 12H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M4 18H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/>
                  </>
                )}
              </svg>
            </button>
            <Link to="/bookshelf" className="back-link">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="#43474D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Bookshelf
            </Link>
          </div>
          <div className="header-right">
            <div className="header-avatar">
              <div className="avatar-circle">AS</div>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="bookdetail-body">
          {/* Left: Cover + Quick Info */}
          <div className="bookdetail-left">
            {(() => {
              const isThesisBook = book.isThesis || book.genre === 'Thesis' || book.category === 'Thesis';
              const ddc = getBookDdcClass(book);
              const badgeLabel = isThesisBook ? 'Thesis' : ddc.name;
              const badgeBg = isThesisBook ? genreColors['Thesis'] : (genreColors[ddc.name] || '#B0DDFE');
              const badgeColor = isThesisBook ? genreTextColors['Thesis'] : (genreTextColors[ddc.name] || '#35627E');

              return book.cover_url ? (
                <div className="bookdetail-cover" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
                  <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <span className="bookdetail-genre-badge" style={{
                    background: badgeBg,
                    color: badgeColor,
                    borderColor: ddc.borderColor
                  }}>
                    {badgeLabel}
                  </span>
                </div>
              ) : (
                <div className="bookdetail-cover" style={{ background: book.cover || '#485E78', position: 'relative' }}>
                  <BookCoverLarge title={book.title} color={book.cover} />
                  <span className="bookdetail-genre-badge" style={{
                    background: badgeBg,
                    color: badgeColor,
                    borderColor: ddc.borderColor
                  }}>
                    {badgeLabel}
                  </span>
                </div>
              );
            })()}

             <div className="bookdetail-quick-meta">
               {(book.isThesis || book.genre === 'Thesis' || book.category === 'Thesis') ? (
                 <>
                   <div className="meta-item">
                     <span className="meta-label">Major</span>
                     <span className="meta-value" style={{ color: '#0284c7', fontWeight: 600 }}>{book.major || book.class_no || 'Engineering'}</span>
                   </div>
                   <div className="meta-item">
                     <span className="meta-label">Student Roll</span>
                     <span className="meta-value" style={{ fontFamily: 'monospace', fontWeight: 700, color: '#059669' }}>{book.student_roll || '—'}</span>
                   </div>
                   <div className="meta-item">
                     <span className="meta-label">Year Done</span>
                     <span className="meta-value">{book.year || '—'}</span>
                   </div>
                   <div className="meta-item">
                     <span className="meta-label">Supervisor</span>
                     <span className="meta-value">{book.supervisor || 'Faculty Advisor'}</span>
                   </div>
                   <div className="meta-item">
                     <span className="meta-label">Total Pages</span>
                     <span className="meta-value">{book.total_pages || 10} pages</span>
                   </div>
                   <div className="meta-item">
                     <span className="meta-label">Preview</span>
                     <span className="meta-value" style={{ color: '#059669', fontWeight: 600 }}>10 Pages Available</span>
                   </div>
                 </>
               ) : (
                 <>
                   <div className="meta-item">
                      <span className="meta-label">Call No</span>
                      <span className="meta-value" style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0369a1' }}>{formatClassNoDual(book.class_no)}</span>
                    </div>
                   <div className="meta-item">
                      <span className="meta-label">Category</span>
                      <span className="meta-value" style={{ fontWeight: 600 }}>{getBookDdcClass(book).name}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">ISBN</span>
                      <span className="meta-value">{book.isbn || 'N/A'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Publisher</span>
                      <span className="meta-value">{book.publisher || 'Not Identified'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Published</span>
                      <span className="meta-value">{book.year || '—'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Pages</span>
                      <span className="meta-value">{book.total_pages || book.pages || '—'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Copies</span>
                      <span className="meta-value">
                        <span className="copies-available">{book.availableCopies ?? 1}</span>
                        <span className="copies-sep"> / </span>
                        <span className="copies-total">{book.totalCopies ?? 1}</span>
                        <span className="copies-label"> available</span>
                      </span>
                    </div>
                 </>
               )}
             </div>
          </div>

          {/* Right: Details */}
          <div className="bookdetail-right">
            <div className="bookdetail-title-row">
              <h1 className="bookdetail-title">{book.title}</h1>
              <span className={`bookdetail-status-badge ${(book.isThesis || book.genre === 'Thesis') ? 'status-available' : (available ? 'status-available' : 'status-unavailable')}`}>
                <span className={`status-dot ${(book.isThesis || available) ? 'dot-green' : 'dot-red'}`} />
                {(book.isThesis || book.genre === 'Thesis') ? '🎓 Thesis' : (available ? 'Available' : 'Unavailable')}
              </span>
            </div>
            <p className="bookdetail-author">by <strong>{book.author}</strong> {book.student_roll ? `(${book.student_roll})` : ''}</p>

            {/* International Standard Library Catalog */}
            <div className="bookdetail-section">
              <InternationalCatalogCard book={book} />
            </div>

            {/* Action Buttons */}
            <div className="bookdetail-actions">
              {(book.isThesis || book.genre === 'Thesis' || book.preview_pdf_url || book.pdf_url) && (
                <button
                  className="btn-read-thesis-action"
                  onClick={() => setShowThesisPdf(true)}
                  style={{
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>📖</span>
                  <span>Read Thesis Preview (First 10 Pages)</span>
                </button>
              )}

              {!(book.isThesis || book.genre === 'Thesis') && (
                available ? (
                  <button className="btn-borrow" onClick={handleBorrow} disabled={borrowing}>
                    {borrowing ? 'Processing...' : 'Request to Borrow 📥'}
                  </button>
                ) : (
                  <button className="btn-reserve" disabled>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <rect x="3" y="1" width="12" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M6 7L9 4L12 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      <line x1="9" y1="4.5" x2="9" y2="13" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    Reserve (Coming Soon)
                  </button>
                )
              )}

              <button className="btn-bookmark" onClick={handleSaveToggle}>
                <svg width="20" height="18" viewBox="0 0 20 19" fill={isSaved ? '#FF6B6B' : 'none'} stroke={isSaved ? '#FF6B6B' : '#43474D'} strokeWidth="1.5" strokeLinejoin="round">
                  <path d="M1 1V18.35L10 14L19 18.35V1H1Z" />
                </svg>
              </button>
            </div>

            {borrowMsg && (
              <p className={`borrow-message ${borrowMsg.startsWith('✅') ? 'msg-success' : 'msg-error'}`}>
                {borrowMsg}
              </p>
            )}

            {/* Related Books */}
            {related.length > 0 && (
              <div className="bookdetail-section">
                <h3 className="section-heading">More in {book.genre}</h3>
                <div className="related-grid">
                  {related.map(r => (
                    <Link to={`/book/${r.id}`} className="related-card" key={r.id}>
                      <div className="related-cover" style={{ background: r.cover || '#485E78', overflow: 'hidden', padding: r.cover_url ? 0 : undefined }}>
                        {r.cover_url ? (
                          <img src={r.cover_url} alt={r.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <MiniCover title={r.title} />
                        )}
                      </div>
                      <div className="related-info">
                        <span className="related-title">{r.title}</span>
                        <span className="related-author">{r.author}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="bookshelf-footer">
          <div className="footer-left">
            <span className="footer-brand">TTU Library</span>
            <span className="footer-copy">© 2026 TTU IT Department. Designed for focus.</span>
          </div>
          <div className="footer-right">
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Contact Librarian</a>
          </div>
        </footer>
      </div>

      {/* 10-Page Thesis PDF Viewer Modal */}
      {showThesisPdf && (
        <ThesisPdfViewer
          isModal={true}
          onClose={() => setShowThesisPdf(false)}
          pdfUrl={book.pdf_url}
          previewPdfUrl={book.preview_pdf_url}
          title={book.title}
          author={book.author}
          studentRoll={book.student_roll}
          major={book.major}
          year={book.year}
          totalPages={book.total_pages || 10}
          previewPagesCount={book.preview_pages_count || 10}
        />
      )}

      {/* Membership Modal */}
      {user && (
        <MembershipModal
          isOpen={isMembershipModalOpen}
          onClose={() => setIsMembershipModalOpen(false)}
          user={user}
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
            if (updatedUser.membership_status === 'approved') {
              navigate(`/checkout/${book.id}`);
            }
          }}
        />
      )}
    </div>
  );
}

/* ─── Book Cover SVG (Large) ─── */
function BookCoverLarge({ title, color }) {
  const words = title.split(' ');
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
  return (
    <svg className="bookdetail-cover-svg" viewBox="0 0 128 180" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`bd-grad-${color?.replace('#','')}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color || '#485E78'} />
          <stop offset="100%" stopColor={color ? 'rgba(0,0,0,0.3)' : '#2D3E50'} />
        </linearGradient>
      </defs>
      <rect width="128" height="180" fill={`url(#bd-grad-${color?.replace('#','')})`} />
      <text x="64" y="86" textAnchor="middle" fill="white" fontSize="12" fontFamily="Hanken Grotesk, sans-serif" fontWeight="600" opacity="0.9">
        {line1}
      </text>
      {line2 && (
        <text x="64" y="106" textAnchor="middle" fill="white" fontSize="12" fontFamily="Hanken Grotesk, sans-serif" fontWeight="600" opacity="0.9">
          {line2}
        </text>
      )}
    </svg>
  );
}

function MiniCover({ title }) {
  return (
    <svg width="60" height="80" viewBox="0 0 60 80" preserveAspectRatio="xMidYMid slice">
      <rect width="60" height="80" fill="rgba(255,255,255,0.15)" />
      <text x="30" y="44" textAnchor="middle" fill="white" fontSize="7" fontFamily="Hanken Grotesk, sans-serif" opacity="0.8">
        {title.slice(0, 18)}{title.length > 18 ? '...' : ''}
      </text>
    </svg>
  );
}

/* ─── Icons ─── */
function BookshelfIcon() { return (<svg width="22" height="16" viewBox="0 0 22 16" fill="none"><rect x="1" y="1" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="13" y="1" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="1" y="9" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="13" y="9" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/></svg>); }
function BooksIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="6" height="14" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><rect x="10" y="4" width="7" height="14" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><line x1="6" y1="6" x2="6" y2="12" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/><line x1="13.5" y1="8" x2="13.5" y2="15" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function BellIcon() { return (<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M6 4C6 3.44772 6.44772 3 7 3H9C9.55228 3 10 3.44772 10 4V4.5812C12.1682 5.03092 13.75 6.91008 13.75 9.16667V12.3206L15.2803 13.8509C15.4362 14.0068 15.504 14.2332 15.4493 14.4405C15.3946 14.6478 15.2275 14.7917 15.0243 14.7917H0.97566C0.772492 14.7917 0.605384 14.6478 0.550688 14.4405C0.496013 14.2332 0.563788 14.0068 0.71967 13.8509L2.25 12.3206V9.16667C2.25 6.91008 3.83185 5.03092 6 4.5812V4Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M6 17C6 17.5523 6.44772 18 7 18H9C9.55228 18 10 17.5523 10 17" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function AIIcon() { return (<svg width="22" height="19" viewBox="0 0 22 19" fill="none"><circle cx="11" cy="9.5" r="8.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M11 4V15M5 9.5H17" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11" cy="9.5" r="2.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function ProfileIcon() { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4.5" r="3.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M1.5 14.5C1.5 11.1863 4.41015 8.5 8 8.5C11.5899 8.5 14.5 11.1863 14.5 14.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function LoanIcon() { return (<svg width="19" height="21" viewBox="0 0 19 21" fill="none"><rect x="1" y="6" width="17" height="13" rx="2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M5 1.5V4M14 1.5V4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="9" x2="18" y2="9" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function SettingsIcon() { return (<svg width="20.1" height="20" viewBox="0 0 21 20" fill="none"><circle cx="10.5" cy="10" r="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M10.5 1.5V3.5M10.5 16.5V18.5M2 10H4M17 10H19M4.49 4.49L5.9 5.9M15.1 14.6L16.51 16.01M4.49 15.51L5.9 14.1M15.1 5.4L16.51 3.99" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function LogoutIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 13L16 9L12 5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 9H7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }

const navItems = [
  { id: 'bookshelf', label: 'Bookshelf', icon: BookshelfIcon },
  { id: 'mybooks', label: 'My Books', icon: BooksIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'ai', label: 'OrionPax AI', icon: AIIcon },
  { id: 'profile', label: 'Profile', icon: ProfileIcon },
  { id: 'loan', label: 'Loan', icon: LoanIcon },
];

const bottomNavItems = [
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'logout', label: 'Logout', icon: LogoutIcon },
];

export default BookDetailPage;
