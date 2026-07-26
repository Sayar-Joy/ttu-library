import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './FriendProfilePage.css';

const API_BASE = '/api';

function FriendProfilePage() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('friends');
  const [activeTab, setActiveTab] = useState('favourites');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('ttu_user');
    if (stored) {
      setCurrentUser(JSON.parse(stored));
    } else {
      navigate('/');
    }
  }, []);

  useEffect(() => {
    if (friendId) fetchFriendProfile();
  }, [friendId]);

  const fetchFriendProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/friends/${friendId}/public-profile`);
      const data = await res.json();

      if (!data.success) {
        setError(data.message || 'Failed to load profile');
        return;
      }

      setProfile(data.profile);
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  // Extract year from roll number (e.g., "2ECT-24" → "2024", "1CST-23" → "2023")
  const getYearFromRoll = (rollNumber) => {
    if (!rollNumber) return null;
    const match = rollNumber.match(/(\d{2})$/);
    if (match) {
      const yearSuffix = parseInt(match[1]);
      const fullYear = yearSuffix >= 50 ? 1900 + yearSuffix : 2000 + yearSuffix;
      return `Class of ${fullYear}`;
    }
    // Try to extract year from student_id patterns
    const yearMatch = rollNumber.match(/20\d{2}/);
    if (yearMatch) return `Class of ${yearMatch[0]}`;
    return null;
  };

  const getCurrentBooks = () => profile?.borrowedBooks || [];
  const getFavouriteBooks = () => profile?.favouriteBooks || [];
  const getFinishedBooks = () => profile?.finishedBooks || [];

  const getTabBooks = () => {
    switch (activeTab) {
      case 'favourites': return getFavouriteBooks();
      case 'borrowed': return getCurrentBooks();
      case 'finished': return getFinishedBooks();
      default: return [];
    }
  };

  const getTabEmptyMessage = () => {
    switch (activeTab) {
      case 'favourites': return { title: 'No favourite books yet', text: 'This friend hasn\'t saved any books to their favourites.' };
      case 'borrowed': return { title: 'No borrowed books', text: 'This friend doesn\'t have any active borrows right now.' };
      case 'finished': return { title: 'No finished books yet', text: 'This friend hasn\'t finished reading any books yet.' };
      default: return { title: 'No books', text: '' };
    }
  };

  const genreColors = {
    'Fiction': '#B0DDFE', 'Classic': 'rgba(143, 111, 70, 0.9)', 'Science': '#B0DDFE',
    'Design': '#E8D5C4', 'History': '#C4B5FD', 'Science Fiction': '#FDE68A',
    'Self-Help': '#A7F3D0', 'Psychology': '#FECDD3', 'Dystopian': '#D1D5DB',
    'Memoir': '#BAE6FD', 'Business': '#DDD6FE', 'Productivity': '#D9F99D',
    'Philosophy': '#FED7AA', 'Technology': '#B0DDFE',
  };
  const genreTextColors = {
    'Fiction': '#35627E', 'Classic': '#FFFBFF', 'Science': '#35627E',
    'Design': '#8B6914', 'History': '#5B21B6', 'Science Fiction': '#92400E',
    'Self-Help': '#065F46', 'Psychology': '#9B1C1C', 'Dystopian': '#374151',
    'Memoir': '#0369A1', 'Business': '#5B21B6', 'Productivity': '#4D7C0F',
    'Philosophy': '#C2410C', 'Technology': '#35627E',
  };

  if (loading) {
    return (
      <div className="fp-page">
        <div className="fp-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="fp-loading">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E4E7EC" strokeWidth="3"/>
              <path d="M12 2a10 10 0 019.95 9" stroke="#366380" strokeWidth="3" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fp-page">
        <div className="fp-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="fp-error">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="22" stroke="#E74C3C" strokeWidth="2"/>
              <path d="M24 16v8M24 32h.02" stroke="#E74C3C" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <h3>Couldn't load profile</h3>
            <p>{error}</p>
            <button onClick={() => navigate(-1)} className="fp-back-btn">Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const tabBooks = getTabBooks();
  const emptyMsg = getTabEmptyMessage();
  const yearInfo = getYearFromRoll(profile.roll_number || profile.student_id);

  return (
    <div className="fp-page">
      <Sidebar activeNav={activeNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="fp-main-content">
        {/* Header */}
        <header className="fp-header">
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
            <button className="fp-back-nav" onClick={() => navigate(-1)}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="#43474D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          </div>
          <div className="header-right">
            <button className="header-icon-btn" onClick={() => navigate(`/notifications/${currentUser?.id}`)}>
              <BellIcon2 />
            </button>
            <div className="header-avatar">
              <div className="avatar-circle">{currentUser?.avatar_url || currentUser?.name?.substring(0, 2) || 'U'}</div>
            </div>
          </div>
        </header>

        {/* Profile Content */}
        <div className="fp-body">
          <div className="fp-container">
            {/* Profile Hero Card */}
            <div className="fp-hero-card">
              <div className="fp-hero-bg"></div>
              <div className="fp-hero-content">
                <div className="fp-avatar-wrapper">
                  <div className="fp-avatar-lg">
                    {profile.avatar_url || profile.name?.substring(0, 2).toUpperCase() || '?'}
                  </div>
                  <div className="fp-online-dot"></div>
                </div>
                <div className="fp-hero-info">
                  <h1 className="fp-name">{profile.name}</h1>
                  {yearInfo && <span className="fp-year-badge">{yearInfo}</span>}
                </div>
                <div className="fp-hero-stats">
                  <div className="fp-stat">
                    <span className="fp-stat-value">{profile.totalBorrowed || 0}</span>
                    <span className="fp-stat-label">Borrowed</span>
                  </div>
                  <div className="fp-stat-divider"></div>
                  <div className="fp-stat">
                    <span className="fp-stat-value">{profile.finishedCount || 0}</span>
                    <span className="fp-stat-label">Finished</span>
                  </div>
                  <div className="fp-stat-divider"></div>
                  <div className="fp-stat">
                    <span className="fp-stat-value">{(profile.favouriteBooks || []).length}</span>
                    <span className="fp-stat-label">Favourites</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="fp-tabs">
              <button
                className={`fp-tab ${activeTab === 'favourites' ? 'active' : ''}`}
                onClick={() => setActiveTab('favourites')}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M9 2L11.1 6.3L16 7L12.5 10.4L13.2 15.3L9 13.1L4.8 15.3L5.5 10.4L2 7L6.9 6.3L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                </svg>
                Favourites
                <span className="fp-tab-count">{(profile.favouriteBooks || []).length}</span>
              </button>
              <button
                className={`fp-tab ${activeTab === 'borrowed' ? 'active' : ''}`}
                onClick={() => setActiveTab('borrowed')}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="3" y="2" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="9" y="4" width="6" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                Borrowed
                <span className="fp-tab-count">{(profile.borrowedBooks || []).length}</span>
              </button>
              <button
                className={`fp-tab ${activeTab === 'finished' ? 'active' : ''}`}
                onClick={() => setActiveTab('finished')}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M6 9L8 11L12 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Finished
                <span className="fp-tab-count">{(profile.finishedBooks || []).length}</span>
              </button>
            </div>

            {/* Book Grid */}
            {tabBooks.length > 0 ? (
              <div className="fp-books-grid">
                {tabBooks.map(book => (
                  <Link to={`/book/${book.id}`} className="fp-book-card" key={book.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="fp-book-cover-wrapper">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <>
                          <div className="fp-book-cover-bg" style={{ background: book.cover || '#485E78' }} />
                          <BookCoverSVG title={book.title} color={book.cover} />
                        </>
                      )}
                      <span className="fp-genre-badge" style={{
                        background: genreColors[book.genre] || '#B0DDFE',
                        color: genreTextColors[book.genre] || '#35627E',
                      }}>
                        {book.genre}
                      </span>
                    </div>
                    <div className="fp-book-info">
                      <h4 className="fp-book-title">{book.title}</h4>
                      <p className="fp-book-author">{book.author}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="fp-empty">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle cx="32" cy="32" r="30" stroke="#E4E7EC" strokeWidth="2"/>
                  <rect x="20" y="18" width="10" height="24" rx="2" stroke="#C4C6CD" strokeWidth="2"/>
                  <rect x="34" y="22" width="10" height="24" rx="2" stroke="#C4C6CD" strokeWidth="2"/>
                </svg>
                <h3 className="fp-empty-title">{emptyMsg.title}</h3>
                <p className="fp-empty-text">{emptyMsg.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="fp-footer">
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
    </div>
  );
}

/* ─── Book Cover SVG ─── */
function BookCoverSVG({ title, color }) {
  const words = title.split(' ');
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
  return (
    <svg className="fp-book-cover-svg" viewBox="0 0 128 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`fp-grad-${color?.replace('#','')}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color || '#485E78'} />
          <stop offset="100%" stopColor={color ? 'rgba(0,0,0,0.3)' : '#2D3E50'} />
        </linearGradient>
      </defs>
      <rect width="128" height="160" fill={`url(#fp-grad-${color?.replace('#','')})`} />
      <text x="64" y="78" textAnchor="middle" fill="white" fontSize="10" fontFamily="Hanken Grotesk, sans-serif" opacity="0.9">
        {line1}
      </text>
      {line2 && (
        <text x="64" y="96" textAnchor="middle" fill="white" fontSize="10" fontFamily="Hanken Grotesk, sans-serif" opacity="0.9">
          {line2}
        </text>
      )}
    </svg>
  );
}

/* ─── SVG Icons ─── */
function BellIcon2() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 3.5C8 2.94772 8.44772 2.5 9 2.5H11C11.5523 2.5 12 2.94772 12 3.5V4.0812C14.1682 4.53092 15.75 6.41008 15.75 8.66667V11.8206L17.2803 13.3509C17.4362 13.5068 17.504 13.7332 17.4493 13.9405C17.3946 14.1478 17.2275 14.2917 17.0243 14.2917H2.97566C2.77249 14.2917 2.60538 14.1478 2.55069 13.9405C2.49601 13.7332 2.56379 13.5068 2.71967 13.3509L4.25 11.8206V8.66667C4.25 6.41008 5.83185 4.53092 8 4.0812V3.5Z" stroke="#485E78" strokeWidth="1.5"/><path d="M8 16.5C8 17.0523 8.44772 17.5 9 17.5H11C11.5523 17.5 12 17.0523 12 16.5" stroke="#485E78" strokeWidth="1.5" strokeLinecap="round"/></svg>); }

export default FriendProfilePage;
