import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './MyBooksPage.css';

const API_BASE = '/api';

function MyBooksPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('borrowing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('mybooks');

  const [borrowingBooks, setBorrowingBooks] = useState([]);
  const [favouriteBooks, setFavouriteBooks] = useState([]);
  const [finishedBooks, setFinishedBooks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Return Request Modal State
  const [returnModalBook, setReturnModalBook] = useState(null);
  const [returnCondition, setReturnCondition] = useState('good');
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnMessage, setReturnMessage] = useState('');

  // Renewal Request Modal State
  const [renewModalBook, setRenewModalBook] = useState(null);
  const [renewalDays, setRenewalDays] = useState(7);
  const [renewalNotes, setRenewalNotes] = useState('');
  const [submittingRenewal, setSubmittingRenewal] = useState(false);

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
    if (id === 'friends') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) { const u = JSON.parse(stored); navigate(`/friends/${u.id}`); }
    }
    if (id === 'ai') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) { const u = JSON.parse(stored); navigate(`/ai/${u.id}`); }
      else { navigate('/ai'); }
    }
    if (id === 'logout') navigate('/');
  };

  useEffect(() => { if (!userId) return; fetchAllData(); }, [userId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [txRes, profileRes, booksRes, reqRes] = await Promise.all([
        fetch(`${API_BASE}/transactions/${userId}`),
        fetch(`${API_BASE}/profile/${userId}`),
        fetch(`${API_BASE}/books`),
        fetch(`${API_BASE}/transactions/requests/${userId}`).catch(() => ({ json: () => ({ requests: [] }) }))
      ]);

      const txData = await txRes.json();
      const profileData = await profileRes.json();
      const booksData = await booksRes.json();
      const reqData = await reqRes.json();

      if (!txData.success && !profileData.success) { setError('Failed to load data'); return; }

      const booksMap = {};
      (booksData.books || []).forEach(b => { booksMap[b.id] = b; });

      // Currently Borrowing, Return Requested & Renewal Requested
      const activeTransactions = (txData.transactions || []).filter(tx => 
        ['active', 'overdue', 'borrowed', 'return_requested', 'renewal_requested'].includes(tx.status)
      );
      
      const now = new Date();
      const borrowed = activeTransactions.map(tx => {
        const book = tx.book || booksMap[tx.book] || {};
        let daysRemaining = null;
        if (tx.dueDate || tx.due_date) {
          daysRemaining = Math.ceil((new Date(tx.dueDate || tx.due_date) - now) / (1000 * 60 * 60 * 24));
        }
        return {
          id: book.id || tx.book,
          title: book.title || 'Unknown',
          author: book.author || 'Unknown',
          genre: book.genre || book.category,
          cover: book.cover || book.cover_url,
          cover_url: book.cover_url || book.cover,
          year: book.year || book.publication_year,
          transactionId: tx.id,
          accession_no: tx.accession_no,
          dueDate: tx.dueDate || tx.due_date,
          borrowDate: tx.borrowDate || tx.borrow_date,
          daysRemaining,
          progress: tx.progress_percentage || tx.progress || 0,
          status: tx.status,
          raw_status: tx.raw_status || tx.status,
          renewal_count: tx.renewal_count || 0,
          renewal_duration_days: tx.renewal_duration_days || 7,
          renewal_requested_at: tx.renewal_requested_at,
          renewal_request_notes: tx.renewal_request_notes
        };
      });
      setBorrowingBooks(borrowed);

      // Favourites
      setFavouriteBooks((profileData.profile?.favoriteBooks || []).filter(Boolean));

      // Finished
      setFinishedBooks((profileData.profile?.finishedBooks || []).filter(Boolean));

      // Requests
      setRequests(reqData.requests || []);

      setLoading(false);
    } catch (err) { 
      setError('Failed to connect to server'); 
      setLoading(false); 
    }
  };

  const handleOpenReturnModal = (book) => {
    setReturnModalBook(book);
    setReturnCondition('good');
    setReturnNotes('');
    setReturnMessage('');
  };

  const handleOpenRenewModal = (book) => {
    setRenewModalBook(book);
    setRenewalDays(7);
    setRenewalNotes('');
    setReturnMessage('');
  };

  const handleSubmitReturnRequest = async (e) => {
    e.preventDefault();
    if (!returnModalBook) return;

    setSubmittingReturn(true);
    setReturnMessage('');

    try {
      const res = await fetch(`${API_BASE}/transactions/request-return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: returnModalBook.transactionId,
          returnCondition,
          notes: returnNotes.trim()
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setReturnMessage('✅ Return request submitted! Please drop off the physical copy at the circulation desk.');
        setReturnModalBook(null);
        await fetchAllData();
        setTimeout(() => setReturnMessage(''), 6000);
      } else {
        alert(data.message || 'Failed to submit return request');
      }
    } catch (err) {
      alert('Failed to connect to server. Please try again.');
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleSubmitRenewalRequest = async (e) => {
    e.preventDefault();
    if (!renewModalBook) return;

    setSubmittingRenewal(true);
    setReturnMessage('');

    try {
      const res = await fetch(`${API_BASE}/transactions/request-renewal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: renewModalBook.transactionId,
          renewalDays: parseInt(renewalDays, 10) || 7,
          notes: renewalNotes.trim()
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setReturnMessage(`✅ Renewal request for +${renewalDays} days submitted! Awaiting librarian approval.`);
        setRenewModalBook(null);
        await fetchAllData();
        setTimeout(() => setReturnMessage(''), 6000);
      } else {
        alert(data.message || 'Failed to submit renewal request');
      }
    } catch (err) {
      alert('Failed to connect to server. Please try again.');
    } finally {
      setSubmittingRenewal(false);
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
  const statusColors = {
    active: { bg: '#dbeafe', text: '#1e40af', label: 'Active Loan' },
    borrowed: { bg: '#dbeafe', text: '#1e40af', label: 'Active Loan' },
    overdue: { bg: '#fee2e2', text: '#991b1b', label: 'Overdue' },
    return_requested: { bg: '#fef3c7', text: '#92400e', label: '⏳ Return Pending Verification' },
    renewal_requested: { bg: '#e0e7ff', text: '#3730a3', label: '⏳ Renewal Pending Approval' },
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
            <div className="header-avatar"><div className="avatar-circle">ST</div></div>
          </div>
        </header>

        <div className="mybooks-body">
          <div className="mybooks-page-header">
            <h1>My Books & Circulation</h1>
            <p className="mybooks-subtitle">Manage your active loans, track borrow requests, and submit return requests.</p>
          </div>

          {/* Category Tabs */}
          <div className="mybooks-tabs">
            <button className={`mybooks-tab ${activeTab === 'borrowing' ? 'active' : ''}`} onClick={() => setActiveTab('borrowing')}>
              <BorrowIcon /><span>Active Loans</span><span className="tab-count">{borrowingBooks.length}</span>
            </button>
            <button className={`mybooks-tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
              <RequestIcon /><span>My Requests</span><span className="tab-count">{requests.length}</span>
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
              padding: '14px 20px', 
              marginBottom: '20px', 
              backgroundColor: returnMessage.startsWith('✅') ? '#d1fae5' : '#fee2e2',
              color: returnMessage.startsWith('✅') ? '#065f46' : '#991b1b',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              border: returnMessage.startsWith('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca'
            }}>
              {returnMessage}
            </div>
          )}

          {/* Tab Content */}
          <div className="mybooks-tab-content">
            {/* Active Loans */}
            {activeTab === 'borrowing' && (
              <>
                {borrowingBooks.length === 0 ? (
                  <div className="mybooks-empty">
                    <div className="empty-icon"><BorrowIconLarge /></div>
                    <h3>No active borrowed books</h3>
                    <p>Books you borrow will show up here. Browse the library catalog to request a book!</p>
                    <button className="browse-btn" onClick={() => navigate('/bookshelf')}>Browse Bookshelf</button>
                  </div>
                ) : (
                  <div className="mybooks-borrowing-list">
                    {borrowingBooks.map(book => (
                      <div key={book.transactionId || book.id} className="borrow-card">
                        <div className="borrow-card-cover">
                          {book.cover_url || book.cover ? (
                            <img src={book.cover_url || book.cover} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div className="borrow-cover-bg" style={{ backgroundColor: '#485E78' }}>
                              <BookCoverSVG title={book.title} />
                            </div>
                          )}
                        </div>
                        <div className="borrow-card-body">
                          <div className="borrow-card-top">
                            <div className="borrow-card-info">
                              <h3>{book.title}</h3>
                              <p className="borrow-author">{book.author}</p>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
                                {book.genre && <span className="borrow-genre-badge" style={{ background: genreColors[book.genre] || '#B0DDFE', color: genreTextColors[book.genre] || '#35627E' }}>{book.genre}</span>}
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>Copy: {book.accession_no}</span>
                                {book.renewal_count > 0 && (
                                  <span style={{ fontSize: 11, background: '#e0e7ff', color: '#4338ca', padding: '1px 7px', borderRadius: 4, fontWeight: 600 }}>
                                    Renewed {book.renewal_count}x
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="borrow-card-status">
                              <span className="borrow-status-badge" style={{ background: (statusColors[book.status] || statusColors.active).bg, color: (statusColors[book.status] || statusColors.active).text }}>
                                {(statusColors[book.status] || statusColors.active).label}
                              </span>
                            </div>
                          </div>

                          {book.dueDate && (
                            <div className={`borrow-due-info ${book.daysRemaining !== null && book.daysRemaining <= 3 ? 'due-soon' : ''}`}>
                              <CalendarIcon />
                              <span>Due: {new Date(book.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              {book.daysRemaining !== null && (
                                <span className={`days-left ${book.daysRemaining <= 3 ? 'urgent' : ''}`}>
                                  ({book.daysRemaining < 0 ? `${Math.abs(book.daysRemaining)} days overdue` : `${book.daysRemaining} days left`})
                                </span>
                              )}
                            </div>
                          )}

                          <div style={{ marginTop: '12px' }}>
                            {book.status === 'return_requested' ? (
                              <div style={{ padding: '8px 12px', background: '#fef3c7', borderRadius: '8px', color: '#92400e', fontSize: '13px' }}>
                                ⏳ Return submitted — Hand in book at circulation desk
                              </div>
                            ) : book.status === 'renewal_requested' ? (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ padding: '8px 12px', background: '#e0e7ff', borderRadius: '8px', color: '#3730a3', fontSize: '13px', flex: 1 }}>
                                  ⏳ Renewal submitted (+{book.renewal_duration_days || 7} days) — Awaiting approval
                                </div>
                                <button 
                                  className="borrow-return-btn"
                                  style={{ padding: '8px 14px', fontSize: '12.5px' }}
                                  onClick={() => handleOpenReturnModal(book)}
                                >
                                  Return Instead 🔄
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button 
                                  className="borrow-renew-btn"
                                  onClick={() => handleOpenRenewModal(book)}
                                >
                                  Request Renewal ⏳
                                </button>
                                <button 
                                  className="borrow-return-btn"
                                  onClick={() => handleOpenReturnModal(book)}
                                >
                                  Request Return 🔄
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* My Requests Tab */}
            {activeTab === 'requests' && (
              <>
                {requests.length === 0 ? (
                  <div className="mybooks-empty">
                    <div className="empty-icon">🪪</div>
                    <h3>No requests history</h3>
                    <p>When you submit borrow, renewal, or return requests, you can track their approval status here.</p>
                  </div>
                ) : (
                  <div className="mybooks-requests-list">
                    {requests.map(req => (
                      <div key={req.id} className="request-card">
                        <div className="request-card-left">
                          <div className="request-type-badge">
                            {req.status === 'borrow_requested' ? '📥 Borrow Request' : 
                             req.status === 'renewal_requested' ? `⏳ Renewal Request (+${req.renewal_duration_days || 7}d)` :
                             req.status === 'return_requested' ? '🔄 Return Request' : 
                             req.status === 'borrowed' ? (req.renewal_count > 0 ? '✓ Renewal Approved' : '✓ Borrow Approved') : 
                             req.status === 'returned' ? '✓ Return Completed' : '✕ Rejected'}
                          </div>
                          <h4>{req.book?.title || 'Book Title'}</h4>
                          <p style={{ margin: '2px 0 6px', fontSize: 13, color: '#64748b' }}>by {req.book?.author || '—'}</p>
                          {req.borrow_request_notes && (
                            <p style={{ fontSize: 12.5, color: '#475569', margin: '4px 0' }}>
                              <strong>Your Note:</strong> {req.borrow_request_notes}
                            </p>
                          )}
                          {req.renewal_request_notes && (
                            <p style={{ fontSize: 12.5, color: '#475569', margin: '4px 0' }}>
                              <strong>Renewal Reason:</strong> {req.renewal_request_notes}
                            </p>
                          )}
                          {req.return_request_notes && (
                            <p style={{ fontSize: 12.5, color: '#475569', margin: '4px 0' }}>
                              <strong>Return Note:</strong> {req.return_request_notes}
                            </p>
                          )}
                          {req.librarian_notes && (
                            <p style={{ fontSize: 12.5, color: req.status === 'rejected' ? '#b91c1c' : '#047857', margin: '4px 0' }}>
                              <strong>Librarian Note:</strong> {req.librarian_notes}
                            </p>
                          )}
                        </div>
                        <div className="request-card-right">
                          <span className={`request-status-pill ${req.status}`}>
                            {req.status === 'borrow_requested' ? '⏳ Under Review' : 
                             req.status === 'renewal_requested' ? '⏳ Under Review' :
                             req.status === 'return_requested' ? '⏳ Awaiting Drop-off' : 
                             req.status === 'borrowed' ? 'Active' : 
                             req.status === 'returned' ? 'Returned' : 'Rejected'}
                          </span>
                          <span style={{ fontSize: 11.5, color: '#94a3b8' }}>
                            {req.renewal_requested_at ? new Date(req.renewal_requested_at).toLocaleDateString() : 
                             req.borrow_requested_at ? new Date(req.borrow_requested_at).toLocaleDateString() : 
                             (req.created_at ? new Date(req.created_at).toLocaleDateString() : '—')}
                          </span>
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
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div className="mybook-card-cover-bg" style={{ backgroundColor: '#485E78' }}>
                              <BookCoverSVG title={book.title} />
                            </div>
                          )}
                          <span className="mybook-genre-badge-sm" style={{ background: genreColors[book.genre] || '#B0DDFE', color: genreTextColors[book.genre] || '#35627E' }}>{book.genre}</span>
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
                  <div className="mybooks-grid">
                    {finishedBooks.map(book => (
                      <div key={book.id} className="mybook-card">
                        <div className="mybook-card-cover-wrapper">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div className="mybook-card-cover-bg" style={{ backgroundColor: '#485E78' }}>
                              <BookCoverSVG title={book.title} />
                            </div>
                          )}
                        </div>
                        <div className="mybook-card-info"><h4 className="mybook-card-title">{book.title}</h4><p className="mybook-card-author">{book.author}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Return Request Modal */}
      {returnModalBook && (
        <div className="return-modal-overlay" onClick={() => setReturnModalBook(null)}>
          <div className="return-modal" onClick={e => e.stopPropagation()}>
            <div className="return-modal-header">
              <h3>Request Book Return</h3>
              <button className="return-modal-close" onClick={() => setReturnModalBook(null)}>×</button>
            </div>
            
            <form onSubmit={handleSubmitReturnRequest} className="return-modal-body">
              <div className="return-book-preview">
                <strong>{returnModalBook.title}</strong>
                <p>Accession: {returnModalBook.accession_no}</p>
                {returnModalBook.daysRemaining < 0 && (
                  <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: 600, marginTop: 4 }}>
                    ⚠️ Overdue by {Math.abs(returnModalBook.daysRemaining)} days (Estimated fine: {Math.abs(returnModalBook.daysRemaining) * 50} kyats)
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label>Physical Book Condition</label>
                <select
                  value={returnCondition}
                  onChange={e => setReturnCondition(e.target.value)}
                  className="form-control"
                >
                  <option value="good">Good Condition (No damage)</option>
                  <option value="minor_wear">Minor Wear & Tear</option>
                  <option value="damaged">Needs Repair / Damaged</option>
                </select>
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label>Return Drop-off Note (Optional)</label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="e.g. Handed to librarian at 1st floor desk"
                  value={returnNotes}
                  onChange={e => setReturnNotes(e.target.value)}
                />
              </div>

              <div className="return-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setReturnModalBook(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit-request" disabled={submittingReturn}>
                  {submittingReturn ? 'Submitting…' : 'Submit Return Request 📥'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renewal Request Modal */}
      {renewModalBook && (
        <div className="return-modal-overlay" onClick={() => setRenewModalBook(null)}>
          <div className="return-modal" onClick={e => e.stopPropagation()}>
            <div className="return-modal-header">
              <h3>Request Loan Renewal ⏳</h3>
              <button className="return-modal-close" onClick={() => setRenewModalBook(null)}>×</button>
            </div>
            
            <form onSubmit={handleSubmitRenewalRequest} className="return-modal-body">
              <div className="return-book-preview">
                <strong>{renewModalBook.title}</strong>
                <p>Accession: {renewModalBook.accession_no} &bull; Current Due: {renewModalBook.dueDate ? new Date(renewModalBook.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                {renewModalBook.renewal_count > 0 && (
                  <div style={{ color: '#4f46e5', fontSize: '12px', fontWeight: 600, marginTop: 4 }}>
                    ℹ️ Previously renewed {renewModalBook.renewal_count} time(s) (Max 3 renewals allowed)
                  </div>
                )}
                {renewModalBook.daysRemaining < 0 && (
                  <div style={{ color: '#b91c1c', fontSize: '12px', fontWeight: 600, marginTop: 4 }}>
                    ⚠️ Currently overdue by {Math.abs(renewModalBook.daysRemaining)} days. Renewal will extend from today.
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Select Extension Period
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {[
                    { days: 7, label: '+7 Days', sub: '1 Week' },
                    { days: 14, label: '+14 Days', sub: '2 Weeks' },
                    { days: 21, label: '+21 Days', sub: '3 Weeks' },
                  ].map(opt => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setRenewalDays(opt.days)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: renewalDays === opt.days ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                        background: renewalDays === opt.days ? '#eef2ff' : '#ffffff',
                        color: renewalDays === opt.days ? '#4338ca' : '#475569',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontWeight: 600,
                        fontSize: '13px'
                      }}
                    >
                      <div>{opt.label}</div>
                      <div style={{ fontSize: '11px', fontWeight: 400, opacity: 0.8 }}>{opt.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 14 }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                  Reason for Extension (Optional)
                </label>
                <textarea
                  rows={2}
                  className="form-control"
                  placeholder="e.g. Preparing for exam / Writing research paper"
                  value={renewalNotes}
                  onChange={e => setRenewalNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13.5px', fontFamily: 'inherit' }}
                />
              </div>

              <div className="return-modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setRenewModalBook(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit-request" style={{ background: '#4f46e5' }} disabled={submittingRenewal}>
                  {submittingRenewal ? 'Submitting…' : `Submit Renewal (+${renewalDays}d) ⏳`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
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
function BorrowIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2V12M9 12L5 8M9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 14V15C2 15.5523 2.44772 16 3 16H15C15.5523 16 16 15.5523 16 15V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function RequestIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 6H12M6 9H12M6 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function HeartIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 15.25S1.5 10.5 1.5 5.5A4 4 0 019 3.35 4 4 0 0116.5 5.5c0 5-7.5 9.75-7.5 9.75z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>); }
function CheckIcon() { return (<svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5.5 9L7.5 11.5L12.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>); }
function BorrowIconLarge() { return (<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke="#CBD5E1" strokeWidth="2"/><path d="M24 14V30M24 30L16 22M24 30L32 22" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 34V35C12 35.5523 12.4477 36 13 36H35C35.5523 36 36 35.5523 36 35V34" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/></svg>); }
function HeartIconLarge() { return (<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke="#CBD5E1" strokeWidth="2"/><path d="M24 34S11 25.5 11 16.5A7 7 0 0124 12.8 7 7 0 0137 16.5C37 25.5 24 34 24 34Z" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>); }
function CheckIconLarge() { return (<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke="#CBD5E1" strokeWidth="2"/><path d="M16 24L21.5 29.5L32 18.5" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>); }
function HeartFilledIcon() { return (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 14S1.5 9.5 1.5 5A3.5 3.5 0 018 2.8 3.5 3.5 0 0114.5 5C14.5 9.5 8 14 8 14Z" fill="#E74C3C"/></svg>); }
function CalendarIcon() { return (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M1 5.5H13" stroke="currentColor" strokeWidth="1.2"/><path d="M4 0.5V3M10 0.5V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>); }
function BookCoverSVG({ title }) { return (<svg width="100%" height="100%" viewBox="0 0 100 140" fill="none"><rect width="100" height="140" fill="#485E78"/><text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontFamily="sans-serif">{title ? title.slice(0, 15) : 'Book'}</text></svg>); }

export default MyBooksPage;
