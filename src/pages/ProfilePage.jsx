import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MembershipModal from '../components/MembershipModal';
import './ProfilePage.css';

const API_BASE = '/api';

function ProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('profile');
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);

  useEffect(() => {
    if (!userId || userId === 'undefined') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u?.id) {
            navigate(`/profile/${u.id}`, { replace: true });
            return;
          }
        } catch { /* ignore */ }
      }
      navigate('/');
      return;
    }
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const profileRes = await fetch(`${API_BASE}/profile/${userId}`);
      const profileData = await profileRes.json();

      if (!profileData.success) {
        setError(profileData.message || 'Failed to load profile');
        return;
      }

      setProfile(profileData.profile);
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

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
      if (stored) {
        const u = JSON.parse(stored);
        navigate(`/profile/${u.id}`);
      }
    }
    if (id === 'notifications') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        const u = JSON.parse(stored);
        navigate(`/notifications/${u.id}`);
      }
    }
    if (id === 'friends') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        const u = JSON.parse(stored);
        navigate(`/friends/${u.id}`);
      }
    }
    if (id === 'ai') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        const u = JSON.parse(stored);
        navigate(`/ai/${u.id}`);
      } else {
        navigate('/ai');
      }
    }
    if (id === 'logout') navigate('/');
  };

  const navItems = [
    { id: 'bookshelf', label: 'Bookshelf', icon: BookshelfIcon },
    { id: 'mybooks', label: 'My Books', icon: BooksIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'ai', label: 'AI Librarian', icon: AIIcon },
    { id: 'profile', label: 'Profile', icon: ProfileIcon },
    { id: 'loan', label: 'Loan', icon: LoanIcon },
  ];

  const bottomNavItems = [
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    { id: 'logout', label: 'Logout', icon: LogoutIcon },
  ];

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="profile-loading">
            <div className="spinner" />
            <p>Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="profile-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="profile-error">
            <p>{error}</p>
            <button onClick={() => navigate('/bookshelf')}>Back to Bookshelf</button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="profile-page">
      <Sidebar activeNav={activeNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="profile-main-content">
        {/* Header */}
        <header className="profile-header-bar">
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
            <button className="header-icon-btn">
              <BellIcon2 />
            </button>
            <div className="header-avatar">
              <div className="avatar-circle" style={{ overflow: 'hidden' }}>
                {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')) ? (
                  <img src={profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profile.avatar || (profile.name ? profile.name.slice(0, 2).toUpperCase() : '??')
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Profile Body */}
        <div className="profile-body">
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-header-left">
              <div className="profile-avatar-lg" style={{ overflow: 'hidden' }}>
                {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('data:')) ? (
                  <img src={profile.avatar} alt={profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  profile.avatar || (profile.name ? profile.name.slice(0, 2).toUpperCase() : '??')
                )}
              </div>
              <div className="profile-header-info">
                <h1>{profile.name}</h1>
                <span className="profile-identifier">{profile.identifier}</span>
              </div>
            </div>
            <div className="profile-header-stats">
              <div className="profile-stat">
                <span className="stat-value">{profile.booksBorrowed || 0}</span>
                <span className="stat-label">Borrowed</span>
              </div>
              <div className="profile-stat">
                <span className="stat-value">{profile.finishedCount || 0}</span>
                <span className="stat-label">Finished</span>
              </div>
              <div className="profile-stat">
                <span className="stat-value">{(profile.favourites || []).filter(Boolean).length}</span>
                <span className="stat-label">Favourites</span>
              </div>
              <div className="profile-stat">
                <span className="stat-value">{profile.booksReserved || 0}</span>
                <span className="stat-label">Reserved</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="profile-content">
            {/* Left Column - Account Info & Credits */}
            <div className="profile-sidebar-info">
              <div className="profile-card">
                <h3>Account Info</h3>
                <div className="profile-card-row">
                  <span className="info-label">Email</span>
                  <span className="info-value">{profile.email}</span>
                </div>
                <div className="profile-card-row">
                  <span className="info-label">Joined</span>
                  <span className="info-value">{profile.joined || 'N/A'}</span>
                </div>
                <div className="profile-card-row">
                  <span className="info-label">Active Borrowing</span>
                  <span className="info-value">{profile.activeBorrowCount || 0} books</span>
                </div>
                <div className="profile-card-row">
                  <span className="info-label">Active Reserves</span>
                  <span className="info-value">{profile.activeReserveCount || 0} books</span>
                </div>
              </div>

              {/* Library Membership Card */}
              <div className="profile-card" style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0 }}>Library Membership</h3>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: profile.membership_status === 'approved'
                      ? '#d1fae5'
                      : profile.membership_status === 'pending'
                      ? '#fef3c7'
                      : profile.membership_status === 'rejected'
                      ? '#fee2e2'
                      : '#f3f4f6',
                    color: profile.membership_status === 'approved'
                      ? '#065f46'
                      : profile.membership_status === 'pending'
                      ? '#92400e'
                      : profile.membership_status === 'rejected'
                      ? '#991b1b'
                      : '#4b5563',
                  }}>
                    {profile.membership_status === 'approved'
                      ? '✓ Approved'
                      : profile.membership_status === 'pending'
                      ? '⏳ Pending'
                      : profile.membership_status === 'rejected'
                      ? '✕ Rejected'
                      : 'Not Applied'}
                  </span>
                </div>

                <div className="profile-card-row">
                  <span className="info-label">Roll Number</span>
                  <span className="info-value" style={{ fontFamily: 'monospace' }}>{profile.roll_number || profile.student_id || '—'}</span>
                </div>
                <div className="profile-card-row">
                  <span className="info-label">Major</span>
                  <span className="info-value">{profile.major || '—'}</span>
                </div>
                <div className="profile-card-row">
                  <span className="info-label">Year</span>
                  <span className="info-value">{profile.year || '—'}</span>
                </div>
                <div className="profile-card-row">
                  <span className="info-label">Phone</span>
                  <span className="info-value">{profile.phone || '—'}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMembershipModalOpen(true)}
                  style={{
                    marginTop: '14px',
                    width: '100%',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: profile.membership_status === 'approved' ? '#f3f4f6' : '#4f46e5',
                    color: profile.membership_status === 'approved' ? '#1f2937' : '#fff',
                    border: profile.membership_status === 'approved' ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  {profile.membership_status === 'approved'
                    ? 'View Digital Library Card'
                    : profile.membership_status === 'pending'
                    ? 'View Application Status'
                    : profile.membership_status === 'rejected'
                    ? 'Fix & Resubmit Form'
                    : 'Apply for Membership'}
                </button>
              </div>
            </div>

            {/* Right Column — Borrowing Summary */}
            <div className="profile-main">
              <div className="profile-card">
                <h3>Borrowing Summary</h3>
                <p style={{color: '#6B7280', fontSize: '14px', marginTop: '8px'}}>
                  Maximum borrow period: 7 days. Late returns are charged 50 kyats per day.
                </p>
                <div className="profile-card-row" style={{marginTop: '16px'}}>
                  <span className="info-label">Active Borrows</span>
                  <span className="info-value">{profile.activeBorrowCount || 0}</span>
                </div>
                <div className="profile-card-row">
                  <span className="info-label">Books Due</span>
                  <span className="info-value">{profile.booksDue || 0}</span>
                </div>
                <div className="profile-card-row">
                  <span className="info-label">Total Borrowed</span>
                  <span className="info-value">{profile.booksBorrowed || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="profile-footer">
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

      {/* Membership Modal */}
      {profile && (
        <MembershipModal
          isOpen={isMembershipModalOpen}
          onClose={() => setIsMembershipModalOpen(false)}
          user={profile}
          onSuccess={(updatedUser) => {
            fetchProfile();
          }}
        />
      )}
    </div>
  );
}

/* ─── Credit Icon ─── */
function CreditIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="#366380" strokeWidth="2"/>
      <path d="M10 12C10 10.8954 10.8954 10 12 10H20C21.1046 10 22 10.8954 22 12V20C22 21.1046 21.1046 22 20 22H12C10.8954 22 10 21.1046 10 20V12Z" stroke="#366380" strokeWidth="1.5"/>
      <circle cx="16" cy="16" r="3" fill="#366380"/>
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

export default ProfilePage;
