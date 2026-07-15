import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './BookshelfPage.css';
import { useNotifications } from '../hooks/useNotifications';
import Sidebar from '../components/Sidebar';

function BookshelfPage() {
  const [activeNav, setActiveNav] = useState('bookshelf');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedAvailability, setSelectedAvailability] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userId, setUserId] = useState(null);
  const booksPerPage = 16;
  const navigate = useNavigate();

  // 🔔 Initialize notification system
  const { unreadCount } = useNotifications(userId, {
    enabled: !!userId, // Only enable when we have a userId
    onNotification: (notification) => {
      // Show browser alert when new notification arrives
      alert(`📬 ${notification.title}\n\n${notification.message}`);
      console.log('🔔 New notification:', notification);
    }
  });

  const closeSidebar = () => setSidebarOpen(false);
  const handleNavClick = (id) => {
    setActiveNav(id);
    setSidebarOpen(false);
    if (id === 'profile' || id === 'mybooks' || id === 'notifications' || id === 'friends') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        const u = JSON.parse(stored);
        navigate(`/${id}/${u.id}`);
      }
      return;
    }
    if (id === 'logout') navigate('/');
  };

  // Get logged-in user for recommendations
  useEffect(() => {
    const storedUser = sessionStorage.getItem('ttu_user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUserId(u.id);
    }
  }, []);

  // Fetch all books and recommendations on mount
  useEffect(() => {
    setLoading(true);

    const fetchBooks = fetch('/api/books')
      .then(res => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      });

    // If we have a userId, also fetch recommendations
    const promises = [fetchBooks];

    Promise.all(promises)
      .then(([booksData]) => {
        setBooks(booksData.books || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load bookshelf:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Fetch recommendations separately once we have userId
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/dashboard/${userId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then(data => {
        setRecommended(data.recommended || []);
      })
      .catch(err => {
        console.error('Failed to load recommendations:', err);
      });
  }, [userId]);

  // Filter and sort
  const filteredBooks = books
    .filter(book => {
      if (selectedGenre && book.genre !== selectedGenre) return false;
      if (selectedAvailability === 'available' && book.availableCopies <= 0) return false;
      if (selectedAvailability === 'coming-soon' && book.availableCopies <= 0) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.year - a.year;
      if (sortBy === 'oldest') return a.year - b.year;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') return a.author.localeCompare(b.author);
      return 0;
    });

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * booksPerPage,
    currentPage * booksPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedGenre, selectedAvailability, sortBy]);

  const genres = [...new Set(books.map(b => b.genre))].sort();
  const authors = [...new Set(books.map(b => b.author))].sort().slice(0, 8);

  const categories = ['Fiction', 'Non-Fiction', 'Classic', 'Technology', 'Science', 'Design',
    'History', 'Science Fiction', 'Self-Help', 'Psychology', 'Dystopian', 'Memoir',
    'Business', 'Productivity', 'Philosophy'];

  const navItems = [
    { id: 'bookshelf', label: 'Bookshelf', icon: BookshelfIcon },
    { id: 'mybooks', label: 'My Books', icon: BooksIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'ai', label: 'OrionPax AI', icon: AIIcon },
    { id: 'profile', label: 'Profile', icon: ProfileIcon },
    { id: 'friends', label: 'Friends', icon: FriendsIcon },
  ];

  const bottomNavItems = [
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'logout', label: 'Logout', icon: LogoutIcon },
  ];

  const sortOptions = [
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'title', label: 'Title A-Z' },
    { id: 'author', label: 'Author A-Z' },
  ];

  const currentSortLabel = sortOptions.find(o => o.id === sortBy)?.label || 'Newest First';

  // Generate a color for each genre
  const genreColors = {
    'Fiction': '#B0DDFE',
    'Classic': 'rgba(143, 111, 70, 0.9)',
    'Science': '#B0DDFE',
    'Design': '#E8D5C4',
    'History': '#C4B5FD',
    'Science Fiction': '#FDE68A',
    'Self-Help': '#A7F3D0',
    'Psychology': '#FECDD3',
    'Dystopian': '#D1D5DB',
    'Memoir': '#BAE6FD',
    'Business': '#DDD6FE',
    'Productivity': '#D9F99D',
    'Philosophy': '#FED7AA',
    'Technology': '#B0DDFE',
  };

  const genreTextColors = {
    'Fiction': '#35627E',
    'Classic': '#FFFBFF',
    'Science': '#35627E',
    'Design': '#8B6914',
    'History': '#5B21B6',
    'Science Fiction': '#92400E',
    'Self-Help': '#065F46',
    'Psychology': '#9B1C1C',
    'Dystopian': '#374151',
    'Memoir': '#0369A1',
    'Business': '#5B21B6',
    'Productivity': '#4D7C0F',
    'Philosophy': '#C2410C',
    'Technology': '#35627E',
  };

  // Pagination helpers
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // --- Loading State ---
  if (loading) {
    return (
      <div className="bookshelf-page">
        <div className="bookshelf-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="loading-spinner" style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E4E7EC" strokeWidth="3"/>
              <path d="M12 2a10 10 0 019.95 9" stroke="#366380" strokeWidth="3" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>
            <p style={{ marginTop: 16, color: '#43474D', fontSize: 14 }}>Loading bookshelf...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="bookshelf-page">
        <div className="bookshelf-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E74C3C" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p style={{ marginTop: 16, color: '#E74C3C', fontSize: 16, fontWeight: 600 }}>Failed to load bookshelf</p>
            <p style={{ marginTop: 4, color: '#43474D', fontSize: 14 }}>{error}</p>
            <button onClick={() => window.location.reload()} className="retry-btn">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bookshelf-page">
      <Sidebar activeNav={activeNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area (scrollable) */}
      <div className="bookshelf-main-content">
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
            <div className="header-search">
              <SearchIconSmall />
              <input type="text" placeholder="Quick Search" className="search-input" />
            </div>
          </div>
          <div className="header-right">
            <button className="header-icon-btn">
              <HelpIcon />
            </button>
            <button 
              className="header-icon-btn" 
              style={{ position: 'relative' }}
              onClick={() => userId && navigate(`/notifications/${userId}`)}
              title="Notifications"
            >
              <BellIcon2 />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#E74C3C',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: '600',
                  border: '2px solid white'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="header-avatar">
              <div className="avatar-circle">AS</div>
            </div>
          </div>
        </header>

        {/* Bookshelf Body — filters sidebar + book grid */}
        <div className="bookshelf-body">
          {/* Book Grid Content */}
          <section className="book-grid-section">
            {/* ─── Recommended for You (at the top) ─── */}
            {recommended.length > 0 && (
              <div className="recommended-section">
                <div className="recommended-header">
                  <div>
                    <h2 className="recommended-title">Recommended</h2>
                    <span className="recommended-subtitle">Based on your reading preferences</span>
                  </div>
                  <button className="see-all-link" onClick={() => {}}>
                    See All
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
                <div className="recommended-grid">
                  {recommended.map(book => (
                    <Link to={`/book/${book.id}`} className="book-card recommended-book-card" key={book.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="book-card-cover-wrapper">
                        <div className="book-card-cover-bg" style={{ background: book.cover || '#485E78' }} />
                        <BookCoverSVG title={book.title} color={book.cover} />
                        <div className="recommended-badge">★ {(4.5 + Math.random() * 0.3).toFixed(1)}</div>
                      </div>
                      <div className="book-card-info">
                        <h4 className="book-card-title">{book.title}</h4>
                        <p className="book-card-author">{book.author}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Categories Pills (Horizontal) ─── */}
            <div className="categories-section">
              <h3 className="filter-label" style={{ marginBottom: '16px' }}>Categories</h3>
              <div className="categories-pills">
                <button
                  className={`category-pill ${selectedGenre === null ? 'active' : ''}`}
                  onClick={() => setSelectedGenre(null)}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`category-pill ${selectedGenre === cat ? 'active' : ''}`}
                    onClick={() => setSelectedGenre(selectedGenre === cat ? null : cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="book-grid-header">
              <h2 className="section-title">Discover Library</h2>
              <div className="sort-container">
                <span className="sort-label">Sort by: <span className="sort-value">{currentSortLabel}</span></span>
                <button className="sort-btn" onClick={() => setShowSortMenu(!showSortMenu)}>
                  <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                    <path d="M1 1L9 9L17 1" stroke="#43474D" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                {showSortMenu && (
                  <div className="sort-dropdown">
                    {sortOptions.map(opt => (
                      <button
                        key={opt.id}
                        className={`sort-option ${sortBy === opt.id ? 'sort-option-active' : ''}`}
                        onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Book Cards Grid — 3 columns */}
            {paginatedBooks.length > 0 ? (
              <div className="books-grid">
                {paginatedBooks.map(book => (
                  <Link to={`/book/${book.id}`} className="book-card" key={book.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="book-card-cover-wrapper">
                      <div className="book-card-cover-bg" style={{ background: book.cover || '#485E78' }} />
                      <span className="book-genre-badge" style={{
                        background: genreColors[book.genre] || '#B0DDFE',
                        color: genreTextColors[book.genre] || '#35627E',
                      }}>
                        {book.genre}
                      </span>
                      <BookCoverSVG title={book.title} color={book.cover} />
                    </div>
                    <div className="book-card-info">
                      <h4 className="book-card-title">{book.title}</h4>
                      <p className="book-card-author">{book.author}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="no-results">
                <p>No books match your filters.</p>
                <button className="clear-filters-btn" onClick={() => { setSelectedGenre(null); setSelectedAvailability(null); }}>
                  Clear Filters
                </button>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="page-arrow"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                >
                  <svg width="7.4" height="12" viewBox="0 0 8 12" fill="none">
                    <path d="M7 1L1 6L7 11" stroke={currentPage === 1 ? '#C4C6CD' : '#43474D'} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
                {getPageNumbers().map((page, i) =>
                  page === '...' ? (
                    <span key={`dots-${i}`} className="page-dots">...</span>
                  ) : (
                    <button
                      key={page}
                      className={`page-btn ${currentPage === page ? 'page-active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  className="page-arrow"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                >
                  <svg width="7.4" height="12" viewBox="0 0 8 12" fill="none" style={{ transform: 'rotate(180deg)' }}>
                    <path d="M7 1L1 6L7 11" stroke={currentPage === totalPages ? '#C4C6CD' : '#43474D'} strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}
          </section>
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
    </div>
  );
}

/* ─── Book Cover SVG ─── */
function BookCoverSVG({ title, color }) {
  const words = title.split(' ');
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
  return (
    <svg className="book-cover-svg" viewBox="0 0 128 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`grad-${color?.replace('#','')}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color || '#485E78'} />
          <stop offset="100%" stopColor={color ? 'rgba(0,0,0,0.3)' : '#2D3E50'} />
        </linearGradient>
      </defs>
      <rect width="128" height="160" fill={`url(#grad-${color?.replace('#','')})`} />
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
function BookshelfIcon() { return (<svg width="22" height="16" viewBox="0 0 22 16" fill="none"><rect x="1" y="1" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="13" y="1" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="1" y="9" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="13" y="9" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/></svg>); }
function BooksIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="6" height="14" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><rect x="10" y="4" width="7" height="14" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><line x1="6" y1="6" x2="6" y2="12" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/><line x1="13.5" y1="8" x2="13.5" y2="15" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function BellIcon() { return (<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M6 4C6 3.44772 6.44772 3 7 3H9C9.55228 3 10 3.44772 10 4V4.5812C12.1682 5.03092 13.75 6.91008 13.75 9.16667V12.3206L15.2803 13.8509C15.4362 14.0068 15.504 14.2332 15.4493 14.4405C15.3946 14.6478 15.2275 14.7917 15.0243 14.7917H0.97566C0.772492 14.7917 0.605384 14.6478 0.550688 14.4405C0.496013 14.2332 0.563788 14.0068 0.71967 13.8509L2.25 12.3206V9.16667C2.25 6.91008 3.83185 5.03092 6 4.5812V4Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M6 17C6 17.5523 6.44772 18 7 18H9C9.55228 18 10 17.5523 10 17" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function AIIcon() { return (<svg width="22" height="19" viewBox="0 0 22 19" fill="none"><circle cx="11" cy="9.5" r="8.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M11 4V15M5 9.5H17" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11" cy="9.5" r="2.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function ProfileIcon() { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4.5" r="3.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M1.5 14.5C1.5 11.1863 4.41015 8.5 8 8.5C11.5899 8.5 14.5 11.1863 14.5 14.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function FriendsIcon() { return (<svg width="24" height="18" viewBox="0 0 24 18" fill="none"><circle cx="9" cy="5" r="4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><circle cx="18" cy="5" r="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M1 16C1 12.6863 3.68629 10 7 10H11C14.3137 10 17 12.6863 17 16" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><path d="M17 16C17 13.7909 18.7909 12 21 12H21.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function SettingsIcon() { return (<svg width="20.1" height="20" viewBox="0 0 21 20" fill="none"><circle cx="10.5" cy="10" r="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M10.5 1.5V3.5M10.5 16.5V18.5M2 10H4M17 10H19M4.49 4.49L5.9 5.9M15.1 14.6L16.51 16.01M4.49 15.51L5.9 14.1M15.1 5.4L16.51 3.99" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function LogoutIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 13L16 9L12 5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 9H7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function SearchIconSmall() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#43474D" strokeWidth="1.5"/><path d="M12 12L16.5 16.5" stroke="#43474D" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function HelpIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#485E78" strokeWidth="1.5"/><path d="M7.5 8C7.5 6.61929 8.61929 5.5 10 5.5C11.3807 5.5 12.5 6.61929 12.5 8C12.5 9.38071 11.3807 10.5 10 10.5V12" stroke="#485E78" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="14.5" r="0.75" fill="#485E78"/></svg>); }
function BellIcon2() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 3.5C8 2.94772 8.44772 2.5 9 2.5H11C11.5523 2.5 12 2.94772 12 3.5V4.0812C14.1682 4.53092 15.75 6.41008 15.75 8.66667V11.8206L17.2803 13.3509C17.4362 14.0068 17.504 14.2332 17.4493 14.4405C17.3946 14.6478 17.2275 14.7917 17.0243 14.7917H2.97566C2.77249 14.7917 2.60538 14.6478 2.55069 14.4405C2.49601 14.2332 2.56379 14.0068 2.71967 13.3509L4.25 11.8206V8.66667C4.25 6.41008 5.83185 4.53092 8 4.0812V3.5Z" stroke="#485E78" strokeWidth="1.5"/><path d="M8 16.5C8 17.0523 8.44772 17.5 9 17.5H11C11.5523 17.5 12 17.0523 12 16.5" stroke="#485E78" strokeWidth="1.5" strokeLinecap="round"/></svg>); }

export default BookshelfPage;