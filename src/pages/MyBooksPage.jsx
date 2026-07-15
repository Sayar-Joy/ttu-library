import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './MyBooksPage.css';

const API_BASE = 'http://localhost:3001/api';

function MyBooksPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('borrowing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('mybooks');

  const [borrowingBooks, setBorrowingBooks] = useState([]);
  const [favouriteBooks, setFavouriteBooks] = useState([]);
  const [finishedBooks, setFinishedBooks] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returningBook, setReturningBook] = useState(null);
  const [returnMessage, setReturnMessage] = useState('');

  const closeSidebar = () => setSidebarOpen(false);
  const handleNavClick = (id) => {
    setActiveNav(id);
    setSidebarOpen(false);
    if (id === 'bookshelf') navigate('/bookshelf');
    if (id === 'mybooks') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) { const u = JSON.parse(stored); navigate(`/mybooks/${u.id}`); }
    }
    if (id === 'profile') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) { const u = JSON.parse(stored); navigate(`/profile/${u.id}`); }
    }
    if (id === 'notifications') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) { const u = JSON.parse(stored); navigate(`/notifications/${u.id}`); }
    }
    if (id === 'logout') navigate('/');
  };

  useEffect(() => { if (!userId) return; fetchAllData(); }, [userId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [txRes, profileRes, booksRes] = await Promise.all([
        fetch(`${API_BASE}/transactions/${userId}`),
        fetch(`${API_BASE}/profile/${userId}`),
        fetch(`${API_BASE}/books`),
      ]);

      const txData = await txRes.json();
      const profileData = await profileRes.json();
      const booksData = await booksRes.json();

      // 🔍 DEBUG: Log the profile data to see what we're getting
      console.log('🔍 Profile Data:', profileData);
      console.log('🔍 Favorite Books:', profileData.profile?.favoriteBooks);
      console.log('🔍 Favourites:', profileData.profile?.favourites);
      console.log('🔍 Finished Books:', profileData.profile?.finishedBooks);

      if (!txData.success && !profileData.success) { setError('Failed to load data'); return; }

      const booksMap = {};
      (booksData.books || []).forEach(b => { booksMap[b.id] = b; });

      // Currently Borrowing
      const activeTransactions = (txData.transactions || []).filter(tx => ['active', 'overdue'].includes(tx.status));
      const demoToday = new Date('2026-06-28');
      const borrowed = activeTransactions.map(tx => {
        const book = tx.book || booksMap[tx.book] || {};
        let daysRemaining = null;
        if (tx.dueDate) daysRemaining = Math.ceil((new Date(tx.dueDate) - demoToday) / (1000 * 60 * 60 * 24));
        return {
          id: book.id || tx.book, title: book.title || 'Unknown', author: book.author || 'Unknown',
          genre: book.genre, cover: book.cover, year: book.year,
          transactionId: tx.id, dueDate: tx.dueDate, borrowDate: tx.borrowDate,
          daysRemaining, progress: tx.progress || 0, status: tx.status,
        };
      });
      setBorrowingBooks(borrowed);

      // Favourites
      setFavouriteBooks((profileData.profile?.favoriteBooks || []).filter(Boolean));

      // Finished
      setFinishedBooks((profileData.profile?.finishedBooks || []).filter(Boolean));

      setAllBooks(booksData.books || []);
      setLoading(false);
    } catch (err) { setError('Failed to connect to server'); setLoading(false); }
  };

  const handleReturn = async (transactionId) => {
    if (!transactionId) return;
    
    setReturningBook(transactionId);
    setReturnMessage('');

    try {
      const res = await fetch(`${API_BASE}/transactions/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId }),
      });

      const data = await res.json();

      if (data.success) {
        setReturnMessage('✅ Book returned successfully!');
        // Refresh the data
        await fetchAllData();
        // Clear message after 3 seconds
        setTimeout(() => setReturnMessage(''), 3000);
      } else {
        setReturnMessage('❌ ' + (data.message || 'Failed to return book'));
      }
    } catch (err) {
      setReturnMessage('❌ Failed to connect to server');
    } finally {
      setReturningBook(null);
    }
  };

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
  const statusColors = {
    active: { bg: '#dbeafe', text: '#1e40af', label: 'Active' },
    overdue: { bg: '#fee2e2', text: '#991b1b', label: 'Overdue' },
  };

  if (loading) {
    return (
      <div className="mybooks-page">
        <div className="mybooks-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="mybooks-loading">
            <div className="spinner" />
            <p>Loading your books...</p>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="mybooks-page">
        <div className="mybooks-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="mybooks-error">
            <p>{error}</p>
            <button onClick={() => navigate('/bookshelf')}>Back to Bookshelf</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mybooks-page">
      <Sidebar activeNav={activeNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className="mybooks-main-content">
        <header className="mybooks-header-bar">
          <div className="header-left">
            <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                {sidebarOpen ? (
                  <path d="M6 6L18 18M18 6L6 18" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/>
                ) : (<><path d="M4 6H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/><path d="M4 12H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/><path d="M4 18H20" stroke="#1B1C1D" strokeWidth="2" strokeLinecap="round"/></>)}
              </svg>
            </button>
            <div className="header-search"><SearchIconSmall /><input type="text" placeholder="Search your books..." className="search-input" /></div>
          </div>
          <div className="header-right">
            <button className="header-icon-btn"><HelpIcon /></button>
            <button className="header-icon-btn"><BellIcon2 /></button>
            <div className="header-avatar"><div className="avatar-circle">??</div></div>
          </div>
        </header>

        <div className="mybooks-body">
          <div className="mybooks-page-header">
            <h1>My Books</h1>
            <p className="mybooks-subtitle">Track your borrowing, favourites & finished reads</p>
          </div>

          {/* Category Tabs */}
          <div className="mybooks-tabs">
            <button className={`mybooks-tab ${activeTab === 'borrowing' ? 'active' : ''}`} onClick={() => setActiveTab('borrowing')}>
              <BorrowIcon /><span>Currently Borrowing</span><span className="tab-count">{borrowingBooks.length}</span>
            </button>
            <button className={`mybooks-tab ${activeTab === 'favourites' ? 'active' : ''}`} onClick={() => setActiveTab('favourites')}>
              <HeartIcon /><span>Favourites</span><span className="tab-count">{favouriteBooks.length}</span>
            </button>
            <button className={`mybooks-tab ${activeTab === 'finished' ? 'active' : ''}`} onClick={() => setActiveTab('finished')}>
              <CheckIcon /><span>Finished Reading</span><span className="tab-count">{finishedBooks.length}</span>
            </button>
          </div>

          {/* Return Message */}
          {returnMessage && (
            <div style={{ 
              padding: '12px 20px', 
              marginBottom: '16px', 
              backgroundColor: returnMessage.startsWith('✅') ? '#d1fae5' : '#fee2e2',
              color: returnMessage.startsWith('✅') ? '#065f46' : '#991b1b',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500
            }}>
              {returnMessage}
            </div>
          )}

          {/* Tab Content */}
          <div className="mybooks-tab-content">
            {/* Currently Borrowing */}
            {activeTab === 'borrowing' && (
              <>
                {borrowingBooks.length === 0 ? (
                  <div className="mybooks-empty">
                    <div className="empty-icon"><BorrowIconLarge /></div>
                    <h3>No borrowed books</h3>
                    <p>Books you borrow will show up here. Head to the Bookshelf to get started!</p>
                    <button className="browse-btn" onClick={() => navigate('/bookshelf')}>Browse Bookshelf</button>
                  </div>
                ) : (
                  <div className="mybooks-borrowing-list">
                    {borrowingBooks.map(book => (
                      <div key={book.transactionId || book.id} className="borrow-card">
                        <div className="borrow-card-cover">
                          <div className="borrow-cover-bg" style={{ backgroundColor: book.cover || '#485E78' }} />
                          <BookCoverSVG title={book.title} color={book.cover} />
                        </div>
                        <div className="borrow-card-body">
                          <div className="borrow-card-top">
                            <div className="borrow-card-info">
                              <h3>{book.title}</h3>
                              <p className="borrow-author">{book.author}</p>
                              {book.genre && <span className="borrow-genre-badge" style={{ background: genreColors[book.genre] || '#B0DDFE', color: genreTextColors[book.genre] || '#35627E' }}>{book.genre}</span>}
                            </div>
                            <div className="borrow-card-status">
                              <span className="borrow-status-badge" style={{ background: (statusColors[book.status] || statusColors.active).bg, color: (statusColors[book.status] || statusColors.active).text }}>{(statusColors[book.status] || statusColors.active).label}</span>
                            </div>
                          </div>
                          <div className="borrow-progress-section">
                            <div className="borrow-progress-header"><span className="progress-label">Progress</span><span className="progress-percent">{book.progress || 0}%</span></div>
                            <div className="borrow-progress-track"><div className="borrow-progress-fill" style={{ width: `${book.progress || 0}%` }} /></div>
                          </div>
                          {book.dueDate && (
                            <div className={`borrow-due-info ${book.daysRemaining !== null && book.daysRemaining <= 3 ? 'due-soon' : ''}`}>
                              <CalendarIcon />
                              <span>Due: {new Date(book.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              {book.daysRemaining !== null && <span className={`days-left ${book.daysRemaining <= 3 ? 'urgent' : ''}`}>({book.daysRemaining} {book.daysRemaining === 1 ? 'day' : 'days'} left)</span>}
                            </div>
                          )}
                          <button 
                            className="borrow-return-btn"
                            onClick={() => handleReturn(book.transactionId)}
                            disabled={returningBook === book.transactionId}
                          >
                            {returningBook === book.transactionId ? 'Returning...' : 'Return Book'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Favourites */}
            {activeTab === 'favourites' && (
              <>
                {favouriteBooks.length === 0 ? (
                  <div className="mybooks-empty">
                    <div className="empty-icon"><HeartIconLarge /></div>
                    <h3>No favourites yet</h3>
                    <p>Tap the heart icon on any book to save it here for quick access.</p>
                    <button className="browse-btn" onClick={() => navigate('/bookshelf')}>Discover Books</button>
                  </div>
                ) : (
                  <div className="mybooks-grid">
                    {favouriteBooks.map(book => (
                      <div key={book.id} className="mybook-card">
                        <div className="mybook-card-cover-wrapper">
                          <div className="mybook-card-cover-bg" style={{ backgroundColor: book.cover || '#485E78' }} />
                          <span className="mybook-genre-badge-sm" style={{ background: genreColors[book.genre] || '#B0DDFE', color: genreTextColors[book.genre] || '#35627E' }}>{book.genre}</span>
                          <BookCoverSVG title={book.title} color={book.cover} />
                          <div className="mybook-fav-indicator"><HeartFilledIcon /></div>
                        </div>
                        <div className="mybook-card-info"><h4 className="mybook-card-title">{book.title}</h4><p className="mybook-card-author">{book.author}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Finished Reading */}
            {activeTab === 'finished' && (
              <>
                {finishedBooks.length === 0 ? (
                  <div className="mybooks-empty">
                    <div className="empty-icon"><CheckIconLarge /></div>
                    <h3>Nothing finished yet</h3>
                    <p>Books you complete will appear here. Keep reading!</p>
                  </div>
                ) : (
                  <>
                    <div className="finished-summary">
                      <div className="finished-count-badge"><span className="finished-number">{finishedBooks.length}</span><span className="finished-label">books completed</span></div>
                    </div>
                    <div className="mybooks-grid">
                      {finishedBooks.map(book => (
                        <div key={book.id} className="mybook-card completed">
                          <div className="mybook-card-cover-wrapper">
                            <div className="mybook-card-cover-bg" style={{ backgroundColor: book.cover || '#485E78' }} />
                            <span className="mybook-card-check">✓</span>
                            <BookCoverSVG title={book.title} color={book.cover} />
                          </div>
                          <div className="mybook-card-info"><h4 className="mybook-card-title">{book.title}</h4><p className="mybook-card-author">{book.author}</p><span className="mybook-card-genre-label">{book.genre}</span></div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        <footer className="mybooks-footer">
          <div className="footer-left"><span className="footer-brand">TTU Library</span><span className="footer-copy">© 2026 TTU IT Department. Designed for focus.</span></div>
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
  const words = (title || '').split(' ');
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
  const safeId = (color || '485E78').replace('#', '');
  return (
    <svg className="book-cover-svg" viewBox="0 0 128 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`grad-mb-${safeId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color || '#485E78'} />
          <stop offset="100%" stopColor={color ? 'rgba(0,0,0,0.3)' : '#2D3E50'} />
        </linearGradient>
      </defs>
      <rect width="128" height="160" fill={`url(#grad-mb-${safeId})`} />
      <text x="64" y="78" textAnchor="middle" fill="white" fontSize="10" fontFamily="Hanken Grotesk, sans-serif" opacity="0.9">{line1}</text>
      {line2 && <text x="64" y="96" textAnchor="middle" fill="white" fontSize="10" fontFamily="Hanken Grotesk, sans-serif" opacity="0.9">{line2}</text>}
    </svg>
  );
}

/* ─── SVG Icons ─── */
function BookshelfIcon() { return (<svg width="22" height="16" viewBox="0 0 22 16" fill="none"><rect x="1" y="1" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="13" y="1" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="1" y="9" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/><rect x="13" y="9" width="8" height="6" rx="1" stroke="white" strokeWidth="1.5"/></svg>); }
function BooksIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="6" height="14" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><rect x="10" y="4" width="7" height="14" rx="1" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><line x1="6" y1="6" x2="6" y2="12" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/><line x1="13.5" y1="8" x2="13.5" y2="15" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function BellIcon() { return (<svg width="16" height="20" viewBox="0 0 16 20" fill="none"><path d="M6 4C6 3.44772 6.44772 3 7 3H9C9.55228 3 10 3.44772 10 4V4.5812C12.1682 5.03092 13.75 6.91008 13.75 9.16667V12.3206L15.2803 13.8509C15.4362 14.0068 15.504 14.2332 15.4493 14.4405C15.3946 14.6478 15.2275 14.7917 15.0243 14.7917H0.97566C0.772492 14.7917 0.605384 14.6478 0.550688 14.4405C0.496013 14.2332 0.563788 14.0068 0.71967 13.8509L2.25 12.3206V9.16667C2.25 6.91008 3.83185 5.03092 6 4.5812V4Z" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M6 17C6 17.5523 6.44772 18 7 18H9C9.55228 18 10 17.5523 10 17" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function AIIcon() { return (<svg width="22" height="19" viewBox="0 0 22 19" fill="none"><circle cx="11" cy="9.5" r="8.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M11 4V15M5 9.5H17" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><circle cx="11" cy="9.5" r="2.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function ProfileIcon() { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="4.5" r="3.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M1.5 14.5C1.5 11.1863 4.41015 8.5 8 8.5C11.5899 8.5 14.5 11.1863 14.5 14.5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function LoanIcon() { return (<svg width="19" height="21" viewBox="0 0 19 21" fill="none"><rect x="1" y="6" width="17" height="13" rx="2" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M5 1.5V4M14 1.5V4" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="9" x2="18" y2="9" stroke="rgba(255,255,255,0.8)" strokeWidth="1"/></svg>); }
function SettingsIcon() { return (<svg width="20.1" height="20" viewBox="0 0 21 20" fill="none"><circle cx="10.5" cy="10" r="3" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/><path d="M10.5 1.5V3.5M10.5 16.5V18.5M2 10H4M17 10H19M4.49 4.49L5.9 5.9M15.1 14.6L16.51 16.01M4.49 15.51L5.9 14.1M15.1 5.4L16.51 3.99" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function LogoutIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M7 2H3C2.44772 2 2 2.44772 2 3V15C2 15.5523 2.44772 16 3 16H7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/><path d="M12 13L16 9L12 5" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 9H7" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function SearchIconSmall() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#43474D" strokeWidth="1.5"/><path d="M12 12L16.5 16.5" stroke="#43474D" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function HelpIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#485E78" strokeWidth="1.5"/><path d="M7.5 8C7.5 6.61929 8.61929 5.5 10 5.5C11.3807 5.5 12.5 6.61929 12.5 8C12.5 9.38071 11.3807 10.5 10 10.5V12" stroke="#485E78" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="14.5" r="0.75" fill="#485E78"/></svg>); }
function BellIcon2() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 3.5C8 2.94772 8.44772 2.5 9 2.5H11C11.5523 2.5 12 2.94772 12 3.5V4.0812C14.1682 4.53092 15.75 6.41008 15.75 8.66667V11.8206L17.2803 13.3509C17.4362 14.0068 17.504 14.2332 17.4493 14.4405C17.3946 14.6478 17.2275 14.7917 17.0243 14.7917H2.97566C2.77249 14.7917 2.60538 14.6478 2.55069 14.4405C2.49601 14.2332 2.56379 14.0068 2.71967 13.3509L4.25 11.8206V8.66667C4.25 6.41008 5.83185 4.53092 8 4.0812V3.5Z" stroke="#485E78" strokeWidth="1.5"/><path d="M8 16.5C8 17.0523 8.44772 17.5 9 17.5H11C11.5523 17.5 12 17.0523 12 16.5" stroke="#485E78" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function BorrowIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 1.5V4M12 1.5V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="2" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1.2"/></svg>); }
function HeartIcon() { return (<svg width="18" height="16" viewBox="0 0 18 16" fill="none"><path d="M9 15L1.5 7.5C0.5 6.5 0.5 4.5 1.5 3.5C2.5 2.5 4.5 2.5 5.5 3.5L9 7L12.5 3.5C13.5 2.5 15.5 2.5 16.5 3.5C17.5 4.5 17.5 6.5 16.5 7.5L9 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>); }
function CheckIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M5 9L8 12L13 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>); }
function HeartFilledIcon() { return (<svg width="14" height="12" viewBox="0 0 14 12" fill="white"><path d="M7 12L1 6C0 5 0 3 1 2C2 1 3.7 1 4.7 2L7 4.3L9.3 2C10.3 1 12 1 13 2C14 3 14 5 13 6L7 12Z" fill="white"/></svg>); }
function CalendarIcon() { return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="2.5" width="11" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><line x1="1.5" y1="5.5" x2="12.5" y2="5.5" stroke="currentColor" strokeWidth="1.2"/><line x1="4.5" y1="1" x2="4.5" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="9.5" y1="1" x2="9.5" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>); }
function BorrowIconLarge() { return (<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="6" y="8" width="36" height="32" rx="4" stroke="#9CA3AF" strokeWidth="2"/><path d="M14 4V10M34 4V10" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/><line x1="6" y1="18" x2="42" y2="18" stroke="#9CA3AF" strokeWidth="2"/></svg>); }
function HeartIconLarge() { return (<svg width="48" height="44" viewBox="0 0 48 44" fill="none"><path d="M24 42L4 22C1 18.7 1 12.7 4 9.7C7 6.7 12.3 6.7 15.3 9.7L24 18.3L32.7 9.7C35.7 6.7 41 6.7 44 9.7C47 12.7 47 18.7 44 22L24 42Z" stroke="#9CA3AF" strokeWidth="2" strokeLinejoin="round"/></svg>); }
function CheckIconLarge() { return (<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke="#9CA3AF" strokeWidth="2"/><path d="M14 24L21 31L34 17" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>); }

export default MyBooksPage;