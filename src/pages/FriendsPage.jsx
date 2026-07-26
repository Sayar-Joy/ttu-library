import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FriendsPage.css';
import Sidebar from '../components/Sidebar';

const API_BASE = '/api';

function FriendsPage() {
  const [activeNav, setActiveNav] = useState('friends');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' or 'requests'
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  // Get current user from session
  useEffect(() => {
    const stored = sessionStorage.getItem('ttu_user');
    if (stored) {
      const user = JSON.parse(stored);
      setCurrentUser(user);
      fetchFriends(user.id);
      fetchPendingRequests(user.id);
    } else {
      navigate('/');
    }
  }, []);

  // Fetch friends list from API
  const fetchFriends = async (userId) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/friendships/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setFriends(data.friends || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending friend requests (received)
  const fetchPendingRequests = async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/friendships/${userId}/requests`);
      const data = await response.json();
      
      if (data.success) {
        setPendingRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  // Search for users (to add as friends)
  const handleSearch = async () => {
    if (!searchQuery.trim() || !currentUser) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `${API_BASE}/users/search?q=${encodeURIComponent(searchQuery)}&userId=${currentUser.id}`
      );
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (addresseeId) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`${API_BASE}/friendships/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requesterId: currentUser.id, 
          addresseeId 
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Friend request sent!');
        // Update search results to show request sent
        setSearchResults(prev =>
          prev.map(u => u.id === addresseeId ? { ...u, friendship_status: 'request_sent' } : u)
        );
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error('Send request error:', error);
      alert('❌ Failed to send friend request');
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (friendshipId) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`${API_BASE}/friendships/${friendshipId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Friend request accepted!');
        // Remove from pending and refresh friends list
        setPendingRequests(prev => prev.filter(r => r.friendship_id !== friendshipId));
        fetchFriends(currentUser.id);
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error('Accept request error:', error);
      alert('❌ Failed to accept friend request');
    }
  };

  // Reject friend request
  const rejectFriendRequest = async (friendshipId) => {
    if (!currentUser) return;

    try {
      const response = await fetch(`${API_BASE}/friendships/${friendshipId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Friend request declined.');
        setPendingRequests(prev => prev.filter(r => r.friendship_id !== friendshipId));
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error('Reject request error:', error);
      alert('❌ Failed to decline friend request');
    }
  };

  // Remove friend
  const removeFriend = async (friendshipId) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;
    if (!currentUser) return;

    try {
      const response = await fetch(`${API_BASE}/friendships/${friendshipId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id })
      });

      const data = await response.json();
      if (data.success) {
        alert('✅ Friend removed');
        fetchFriends(currentUser.id);
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error('Remove friend error:', error);
      alert('❌ Failed to remove friend');
    }
  };

  // Handle search input change with debounce
  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        handleSearch();
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="friends-page">
        <div className="friends-main-content" style={{ marginLeft: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="loading-spinner" style={{ textAlign: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#E4E7EC" strokeWidth="3"/>
              <path d="M12 2a10 10 0 019.95 9" stroke="#366380" strokeWidth="3" strokeLinecap="round">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>
            <p style={{ marginTop: 16, color: '#43474D', fontSize: 14 }}>Loading friends...</p>
          </div>
        </div>
      </div>
    );
  }

  // Determine what to display
  const isSearchMode = searchQuery.trim().length > 0;

  return (
    <div className="friends-page">
      <Sidebar activeNav={activeNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="friends-main-content">
        {/* Header */}
        <header className="friends-header">
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
            <h2 className="page-title">Friends</h2>
          </div>
          <div className="header-right">
            <button className="header-icon-btn">
              <HelpIcon />
            </button>
            <button className="header-icon-btn" onClick={() => navigate(`/notifications/${currentUser?.id}`)}>
              <BellIcon2 />
            </button>
            <div className="header-avatar">
              <div className="avatar-circle">{currentUser?.avatar_url || currentUser?.name?.substring(0, 2) || 'U'}</div>
            </div>
          </div>
        </header>

        {/* Friends Body */}
        <div className="friends-body">
          <div className="friends-container">
            {/* Search Bar */}
            <div className="friends-search-section">
              <div className="search-bar">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search by name, email, or roll number..."
                  className="search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 4L12 12M12 4L4 12" stroke="#43474D" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Tabs - only show when NOT searching */}
            {!isSearchMode && (
              <div className="friends-tabs">
                <button
                  className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
                  onClick={() => setActiveTab('friends')}
                >
                  <FriendsTabIcon />
                  Friends
                  <span className="tab-count">{friends.length}</span>
                </button>
                <button
                  className={`friends-tab ${activeTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('requests')}
                >
                  <RequestsTabIcon />
                  Requests
                  {pendingRequests.length > 0 && (
                    <span className="tab-count badge">{pendingRequests.length}</span>
                  )}
                </button>
              </div>
            )}

            {/* Search Mode - Show search results */}
            {isSearchMode && (
              <>
                <div className="friends-count">
                  {searching ? 'Searching...' : `${searchResults.length} ${searchResults.length === 1 ? 'user' : 'users'} found`}
                </div>
                {searchResults.length > 0 ? (
                  <div className="friends-list">
                    {searchResults.map(item => (
                      <div key={item.id} className="friend-card">
                        <div className="friend-avatar-large">
                          {item.avatar_url || item.name?.substring(0, 2).toUpperCase() || '?'}
                        </div>
                        <div className="friend-info">
                          <h3 className="friend-name">{item.name}</h3>
                          <p className="friend-email">{item.email}</p>
                          {item.student_id && (
                            <p className="friend-id">Roll: {item.student_id}</p>
                          )}
                        </div>
                        <div className="friend-actions">
                          {item.friendship_status === 'none' && (
                            <button 
                              className="friend-action-btn primary" 
                              onClick={() => sendFriendRequest(item.id)}
                            >
                              Add Friend
                            </button>
                          )}
                          {item.friendship_status === 'friends' && (
                            <span className="friendship-status friends">✓ Friends</span>
                          )}
                          {item.friendship_status === 'request_sent' && (
                            <span className="friendship-status pending">Request Sent</span>
                          )}
                          {item.friendship_status === 'request_received' && (
                            <span className="friendship-status pending">Pending...</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : !searching ? (
                  <div className="no-results">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      <circle cx="32" cy="32" r="30" stroke="#E4E7EC" strokeWidth="2"/>
                      <circle cx="24" cy="26" r="4" fill="#C4C6CD"/>
                      <circle cx="40" cy="26" r="4" fill="#C4C6CD"/>
                      <path d="M22 42C22 38 26 34 32 34C38 34 42 38 42 42" stroke="#C4C6CD" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <h3 className="no-results-title">No users found</h3>
                    <p className="no-results-text">
                      No results for "{searchQuery}". Try searching by name, email, or roll number.
                    </p>
                    <button className="clear-filters-btn" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </button>
                  </div>
                ) : null}
              </>
            )}

            {/* Friends Tab */}
            {!isSearchMode && activeTab === 'friends' && (
              <>
                {friends.length > 0 ? (
                  <div className="friends-list">
                    {friends.map(item => (
                      <div key={item.friendship_id} className="friend-card">
                        <div className="friend-avatar-large">
                          {item.friend_avatar || item.friend_name?.substring(0, 2).toUpperCase() || '?'}
                        </div>
                        <div className="friend-info">
                          <h3 className="friend-name">{item.friend_name}</h3>
                          <p className="friend-email">{item.friend_email}</p>
                          {item.friend_identifier && (
                            <p className="friend-id">ID: {item.friend_identifier}</p>
                          )}
                          <div className="friend-stats">
                            <span className="friend-stat">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="6" stroke="#366380" strokeWidth="1.2"/>
                                <path d="M8 4V8L11 10" stroke="#366380" strokeWidth="1.2" strokeLinecap="round"/>
                              </svg>
                              Friends since {new Date(item.friends_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className="friend-actions">
                          <button 
                            className="friend-action-btn primary" 
                            onClick={() => navigate(`/friend-profile/${item.friend_id}`)}
                          >
                            View Profile
                          </button>
                          <button 
                            className="friend-action-btn secondary"
                            onClick={() => removeFriend(item.friendship_id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-results">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      <circle cx="32" cy="32" r="30" stroke="#E4E7EC" strokeWidth="2"/>
                      <circle cx="24" cy="26" r="4" fill="#C4C6CD"/>
                      <circle cx="40" cy="26" r="4" fill="#C4C6CD"/>
                      <path d="M22 42C22 38 26 34 32 34C38 34 42 38 42 42" stroke="#C4C6CD" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <h3 className="no-results-title">No friends yet</h3>
                    <p className="no-results-text">Search for users above to add friends</p>
                  </div>
                )}
              </>
            )}

            {/* Requests Tab */}
            {!isSearchMode && activeTab === 'requests' && (
              <>
                {pendingRequests.length > 0 ? (
                  <div className="friends-list">
                    {pendingRequests.map(req => (
                      <div key={req.friendship_id} className="friend-card request-card">
                        <div className="friend-avatar-large request-avatar">
                          {req.requester_avatar || req.requester_name?.substring(0, 2).toUpperCase() || '?'}
                        </div>
                        <div className="friend-info">
                          <h3 className="friend-name">{req.requester_name}</h3>
                          <p className="friend-email">{req.requester_email}</p>
                          {req.requester_identifier && (
                            <p className="friend-id">Roll: {req.requester_identifier}</p>
                          )}
                          <div className="friend-stats">
                            <span className="friend-stat">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <circle cx="8" cy="8" r="6" stroke="#92400E" strokeWidth="1.2"/>
                                <path d="M8 4V8L11 10" stroke="#92400E" strokeWidth="1.2" strokeLinecap="round"/>
                              </svg>
                              Sent {new Date(req.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                        <div className="friend-actions">
                          <button 
                            className="friend-action-btn accept" 
                            onClick={() => acceptFriendRequest(req.friendship_id)}
                          >
                            ✓ Accept
                          </button>
                          <button 
                            className="friend-action-btn decline"
                            onClick={() => rejectFriendRequest(req.friendship_id)}
                          >
                            ✕ Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-results">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      <circle cx="32" cy="32" r="30" stroke="#E4E7EC" strokeWidth="2"/>
                      <path d="M26 28H38M32 22V28" stroke="#C4C6CD" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="32" cy="38" r="3" fill="#C4C6CD"/>
                    </svg>
                    <h3 className="no-results-title">No pending requests</h3>
                    <p className="no-results-text">When someone sends you a friend request, it will appear here</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="friends-footer">
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

/* ─── SVG Icons ─── */
function SearchIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="#43474D" strokeWidth="1.5"/><path d="M13.5 13.5L18 18" stroke="#43474D" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function HelpIcon() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#485E78" strokeWidth="1.5"/><path d="M7.5 8C7.5 6.61929 8.61929 5.5 10 5.5C11.3807 5.5 12.5 6.61929 12.5 8C12.5 9.38071 11.3807 10.5 10 10.5V12" stroke="#485E78" strokeWidth="1.5" strokeLinecap="round"/><circle cx="10" cy="14.5" r="0.75" fill="#485E78"/></svg>); }
function BellIcon2() { return (<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 3.5C8 2.94772 8.44772 2.5 9 2.5H11C11.5523 2.5 12 2.94772 12 3.5V4.0812C14.1682 4.53092 15.75 6.41008 15.75 8.66667V11.8206L17.2803 13.3509C17.4362 13.5068 17.504 13.7332 17.4493 13.9405C17.3946 14.1478 17.2275 14.2917 17.0243 14.2917H2.97566C2.77249 14.2917 2.60538 14.1478 2.55069 13.9405C2.49601 13.7332 2.56379 13.5068 2.71967 13.3509L4.25 11.8206V8.66667C4.25 6.41008 5.83185 4.53092 8 4.0812V3.5Z" stroke="#485E78" strokeWidth="1.5"/><path d="M8 16.5C8 17.0523 8.44772 17.5 9 17.5H11C11.5523 17.5 12 17.0523 12 16.5" stroke="#485E78" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function FriendsTabIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M2 21v-2a5 5 0 015-5h4a5 5 0 015 5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M22 21v-1a4 4 0 00-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>); }
function RequestsTabIcon() { return (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/><path d="M4 21v-2a5 5 0 015-5h6a5 5 0 015 5v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M19 3v4M17 5h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>); }

export default FriendsPage;
