import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AddThesisModal from '../components/AddThesisModal';
import ThesisPdfViewer from '../components/ThesisPdfViewer';
import './AdminDashboard.css';

const API = '/api/admin';

// ─── Helper: to English Ordinal ─────────────────────────────
function toEnglishOrdinal(num) {
  const ordinals = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"];
  const n = parseInt(num, 10);
  if (isNaN(n) || n <= 0) return "";
  if (n < ordinals.length) return ordinals[n] + " edition";
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  const suffix = (v >= 11 && v <= 13) ? "th" : (suffixes[n % 10] || "th");
  return n + suffix + " edition";
}

// ─── Helper: get auth token from session ────────────────────
function getAuthHeaders() {
  const stored = sessionStorage.getItem('ttu_session');
  const token = stored ? JSON.parse(stored)?.access_token : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { ...getAuthHeaders(), ...opts.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [showAddThesisModal, setShowAddThesisModal] = useState(false);
  const [previewThesisItem, setPreviewThesisItem] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Overview stats
  const [stats, setStats] = useState({ 
    students: 0, 
    books: 0, 
    theses: 0,
    copies: 0, 
    activeBorrows: 0, 
    unpaidFines: 0, 
    pendingMemberships: 0,
    pendingBorrowRequests: 0,
    pendingReturnRequests: 0
  });

  useEffect(() => {
    const stored = sessionStorage.getItem('ttu_user');
    if (!stored) { navigate('/'); return; }
    const u = JSON.parse(stored);
    if (u.role !== 'librarian') { navigate('/bookshelf'); return; }
    setUser(u);
  }, [navigate]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Load overview stats
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const [usersRes, invRes, memRes, borrowReqRes, returnReqRes, thesesStatsRes] = await Promise.all([
          apiFetch(`${API}/users?limit=1`),
          apiFetch(`${API}/inventory?limit=1`),
          apiFetch(`${API}/memberships?status=pending&limit=1`).catch(() => ({ pending_count: 0 })),
          apiFetch(`${API}/requests/borrow?status=borrow_requested&limit=1`).catch(() => ({ pending_count: 0 })),
          apiFetch(`${API}/requests/return?status=return_requested&limit=1`).catch(() => ({ pending_count: 0 })),
          apiFetch(`${API}/theses-stats`).catch(() => ({ stats: { totalTheses: 0 } })),
        ]);
        const healthRes = await fetch('/api/health').then(r => r.json()).catch(() => ({}));

        setStats({
          students: usersRes.total || 0,
          books: healthRes.books || 0,
          theses: thesesStatsRes?.stats?.totalTheses || 0,
          copies: invRes.total || 0,
          activeBorrows: healthRes.transactions || 0,
          pendingMemberships: memRes.pending_count || 0,
          pendingBorrowRequests: borrowReqRes.pending_count || 0,
          pendingReturnRequests: returnReqRes.pending_count || 0,
          unpaidFines: 0,
        });
      } catch { /* silent */ }
    })();
  }, [user, activeTab, refreshTrigger]);

  const handleLogout = () => {
    sessionStorage.removeItem('ttu_user');
    sessionStorage.removeItem('ttu_session');
    navigate('/');
  };

  if (!user) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'theses', label: 'Theses', icon: '🎓', badge: stats.theses },
    { id: 'memberships', label: 'Memberships', icon: '🪪', badge: stats.pendingMemberships },
    { id: 'borrow_requests', label: 'Borrow Requests', icon: '📥', badge: stats.pendingBorrowRequests },
    { id: 'returns', label: 'Return Desk', icon: '🔄', badge: stats.pendingReturnRequests },
    { id: 'users', label: 'Students', icon: '👥' },
    { id: 'catalog', label: 'Catalog', icon: '📚' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'fines', label: 'Fines', icon: '💰' },
  ];

  const tabTitles = {
    overview: 'Dashboard Overview',
    theses: 'Graduation Theses & Research Papers',
    memberships: 'Library Membership Requests',
    borrow_requests: 'Student Borrow Requests',
    returns: 'Circulation & Return Desk',
    users: 'Student Management',
    catalog: 'Book Catalog',
    inventory: 'Physical Inventory',
    fines: 'Fine Management',
  };

  const tabDescriptions = {
    overview: 'Quick glance at your library\'s vital statistics',
    theses: 'Upload and manage student graduation theses with full 10-page preview engine',
    memberships: 'Review, verify, and approve student membership applications to allow book borrowing',
    borrow_requests: 'Review and approve student book borrowing applications and assign physical copies',
    returns: 'Verify student return requests, inspect physical copies, and process overdue fines',
    users: 'View and manage student accounts and membership statuses',
    catalog: 'Manage the bibliographic catalog',
    inventory: 'Track every physical copy on the shelves',
    fines: 'View and manage overdue fines',
  };

  return (
    <div className="admin-layout">
      {/* Sidebar overlay for mobile */}
      <div className={`admin-sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-brand">
            <div className="admin-sidebar-logo">📖</div>
            <div className="admin-sidebar-brand-text">
              <h1>TTU Library</h1>
              <p>Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-nav-section-label">Main</div>
          {tabs.slice(0, 2).map(t => (
            <button key={t.id} className={`admin-nav-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}>
              <span className="admin-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
              {t.badge > 0 && <span className="admin-nav-count-badge">{t.badge}</span>}
            </button>
          ))}

          <div className="admin-nav-section-label">Circulation & Requests</div>
          {tabs.slice(2, 5).map(t => (
            <button key={t.id} className={`admin-nav-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}>
              <span className="admin-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
              {t.badge > 0 && <span className="admin-nav-count-badge">{t.badge}</span>}
            </button>
          ))}

          <div className="admin-nav-section-label">Management & Catalog</div>
          {tabs.slice(5).map(t => (
            <button key={t.id} className={`admin-nav-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}>
              <span className="admin-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{user.avatar_url ? <img src={user.avatar_url} alt="Admin" style={{ width: '100%', height: '100%', borderRadius: '50%' }} /> : (user.name ? user.name.slice(0, 2).toUpperCase() : 'AD')}</div>
            <div className="admin-user-info">
              <div className="admin-user-name">{user.name}</div>
              <div className="admin-user-role">Librarian</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <button className="admin-hamburger" onClick={() => setSidebarOpen(true)}>☰</button>
            <h2>{tabTitles[activeTab]}</h2>
            <p>{tabDescriptions[activeTab]}</p>
          </div>
          <div className="admin-header-right">
            <button
              className="admin-btn-primary"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', marginRight: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={() => setShowAddThesisModal(true)}
            >
              <span>🎓</span>
              <span>+ Add Thesis</span>
            </button>
            <button
              className="admin-btn-primary"
              style={{ marginRight: '10px' }}
              onClick={() => setShowUnifiedModal(true)}
            >
              + Add Book / Copy
            </button>
            <button className="admin-logout-btn" onClick={handleLogout}>
              ↩ Logout
            </button>
          </div>
        </header>

        <div className="admin-content">
          {activeTab === 'overview' && <OverviewTab stats={stats} setActiveTab={setActiveTab} setShowUnifiedModal={setShowUnifiedModal} setShowAddThesisModal={setShowAddThesisModal} />}
          {activeTab === 'theses' && <ThesesTab showToast={showToast} refreshTrigger={refreshTrigger} setShowAddThesisModal={setShowAddThesisModal} setPreviewThesisItem={setPreviewThesisItem} />}
          {activeTab === 'memberships' && <MembershipsTab showToast={showToast} refreshTrigger={refreshTrigger} />}
          {activeTab === 'borrow_requests' && <BorrowRequestsTab showToast={showToast} refreshTrigger={refreshTrigger} />}
          {activeTab === 'returns' && <ReturnsTab showToast={showToast} refreshTrigger={refreshTrigger} />}
          {activeTab === 'users' && <UsersTab showToast={showToast} refreshTrigger={refreshTrigger} />}
          {activeTab === 'catalog' && <CatalogTab showToast={showToast} refreshTrigger={refreshTrigger} setShowUnifiedModal={setShowUnifiedModal} />}
          {activeTab === 'inventory' && <InventoryTab showToast={showToast} refreshTrigger={refreshTrigger} setShowUnifiedModal={setShowUnifiedModal} />}
          {activeTab === 'fines' && <FinesTab showToast={showToast} refreshTrigger={refreshTrigger} />}
        </div>
      </main>

      {showUnifiedModal && (
        <UnifiedAddModal
          onClose={() => setShowUnifiedModal(false)}
          onSuccess={() => setRefreshTrigger(r => r + 1)}
          showToast={showToast}
        />
      )}

      {showAddThesisModal && (
        <AddThesisModal
          onClose={() => setShowAddThesisModal(false)}
          onSuccess={() => setRefreshTrigger(r => r + 1)}
          showToast={showToast}
        />
      )}

      {previewThesisItem && (
        <ThesisPdfViewer
          isModal={true}
          onClose={() => setPreviewThesisItem(null)}
          pdfUrl={previewThesisItem.pdf_url}
          previewPdfUrl={previewThesisItem.preview_pdf_url}
          title={previewThesisItem.title}
          author={previewThesisItem.author}
          studentRoll={previewThesisItem.student_roll}
          major={previewThesisItem.major}
          year={previewThesisItem.year}
          totalPages={previewThesisItem.total_pages}
          previewPagesCount={previewThesisItem.preview_pages_count}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`admin-toast ${toast.type}`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
          <button className="admin-toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════
function OverviewTab({ stats, setActiveTab, setShowUnifiedModal, setShowAddThesisModal }) {
  return (
    <>
      <div className="admin-stats-grid">
        <div className="admin-stat-card" onClick={() => setActiveTab('theses')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-icon green" style={{ background: '#ecfdf5', color: '#059669' }}>🎓</div>
          <div className="admin-stat-text">
            <h3>{stats.theses || 0}</h3>
            <p>Graduation Theses</p>
          </div>
        </div>
        <div className="admin-stat-card" onClick={() => setActiveTab('memberships')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-icon amber">🪪</div>
          <div className="admin-stat-text">
            <h3 style={{ color: stats.pendingMemberships > 0 ? '#fbbf24' : 'inherit' }}>{stats.pendingMemberships}</h3>
            <p>Pending Memberships</p>
          </div>
        </div>
        <div className="admin-stat-card" onClick={() => setActiveTab('users')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-icon purple">👥</div>
          <div className="admin-stat-text">
            <h3>{stats.students}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="admin-stat-card" onClick={() => setActiveTab('catalog')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-icon blue">📚</div>
          <div className="admin-stat-text">
            <h3>{stats.books}</h3>
            <p>Book Titles</p>
          </div>
        </div>
        <div className="admin-stat-card" onClick={() => setActiveTab('inventory')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-icon green">📦</div>
          <div className="admin-stat-text">
            <h3>{stats.copies}</h3>
            <p>Physical Copies</p>
          </div>
        </div>
        <div className="admin-stat-card" onClick={() => setActiveTab('returns')} style={{ cursor: 'pointer' }}>
          <div className="admin-stat-icon amber">🔄</div>
          <div className="admin-stat-text">
            <h3>{stats.activeBorrows}</h3>
            <p>Active Transactions</p>
          </div>
        </div>
      </div>

      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3>🚀 Quick Actions</h3>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {stats.pendingMemberships > 0 && (
            <button className="admin-btn-primary" style={{ background: '#d97706' }} onClick={() => setActiveTab('memberships')}>
              🪪 Review Memberships ({stats.pendingMemberships} pending)
            </button>
          )}
          <button className="admin-btn-primary" style={{ background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setShowAddThesisModal(true)}>
            <span>🎓</span>
            <span>+ Add Thesis</span>
          </button>
          <button className="admin-btn-primary" onClick={() => setShowUnifiedModal(true)}>+ Add Book / Copy</button>
          <button className="admin-btn-secondary" onClick={() => setActiveTab('theses')}>🎓 View Theses</button>
          <button className="admin-btn-secondary" onClick={() => setActiveTab('memberships')}>🪪 All Memberships</button>
          <button className="admin-btn-secondary" onClick={() => setActiveTab('returns')}>🔄 Process Return</button>
          <button className="admin-btn-secondary" onClick={() => setActiveTab('fines')}>💰 Manage Fines</button>
          <button className="admin-btn-secondary" onClick={() => setActiveTab('users')}>👥 View Students</button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// USERS TAB
// ═══════════════════════════════════════════════════════════════
function UsersTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`${API}/users?search=${encodeURIComponent(search)}&page=${page}&limit=15`);
      setUsers(data.users || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  }, [search, page, showToast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const viewUser = async (userId) => {
    setSelectedUser(userId);
    setDetailLoading(true);
    try {
      const data = await apiFetch(`${API}/users/${userId}`);
      setUserDetail(data);
    } catch (err) {
      showToast(err.message, 'error');
    }
    setDetailLoading(false);
  };

  if (selectedUser && userDetail) {
    return (
      <UserDetailView
        data={userDetail}
        onBack={() => { setSelectedUser(null); setUserDetail(null); }}
        loading={detailLoading}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>👥 Students ({users.length})</h3>
        <div className="admin-panel-actions">
          <div className="admin-search-input">
            <span>🔍</span>
            <input
              placeholder="Search by name, ID, or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /><p>Loading students…</p></div>
      ) : users.length === 0 ? (
        <div className="admin-empty"><div className="admin-empty-icon">👥</div><p>No students found</p></div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Student ID</th>
                  <th>Email</th>
                  <th>Membership</th>
                  <th>Active Borrows</th>
                  <th>Joined</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="clickable" onClick={() => viewUser(u.id)}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="admin-user-avatar" style={{ width: 28, height: 28, fontSize: 10, borderRadius: 6 }}>
                        {u.avatar_url && u.avatar_url.length > 2 ? (
                          <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 6, objectFit: 'cover' }} />
                        ) : (
                          u.avatar_url || '??'
                        )}
                      </div>
                      {u.name}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.student_id || u.roll_number || '—'}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`admin-badge ${u.membership_status || 'none'}`}>
                        {u.membership_status === 'approved' ? '✓ Approved' : u.membership_status === 'pending' ? '⏳ Pending' : u.membership_status === 'rejected' ? '✕ Rejected' : 'Not Applied'}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge ${u.active_borrow_count > 0 ? 'borrowed' : 'no_fine'}`}>
                        {u.active_borrow_count}
                      </span>
                    </td>
                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td><button className="admin-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>View →</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="admin-pagination">
              <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`admin-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="admin-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── User Detail View ─────────────────────────────────────────
function UserDetailView({ data, onBack, showToast }) {
  const { user, active_borrows = [], unpaid_fines = [], total_unpaid_fine_amount = 0 } = data;
  const [currentUser, setCurrentUser] = useState(user);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleMarkPaid = async (txId) => {
    try {
      await apiFetch(`${API}/fines/${txId}/pay`, { method: 'PATCH' });
      showToast('Fine marked as paid!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleApproveMembership = async () => {
    setProcessing(true);
    try {
      const res = await apiFetch(`${API}/memberships/${currentUser.id}/approve`, { method: 'PATCH' });
      showToast(res.message || 'Membership approved!');
      setCurrentUser(prev => ({ ...prev, membership_status: 'approved', membership_approved_at: new Date().toISOString(), membership_rejected_reason: null }));
    } catch (err) {
      showToast(err.message, 'error');
    }
    setProcessing(false);
  };

  const handleRejectMembership = async () => {
    setProcessing(true);
    try {
      const res = await apiFetch(`${API}/memberships/${currentUser.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason || 'Application details could not be verified.' })
      });
      showToast(res.message || 'Membership rejected.');
      setCurrentUser(prev => ({ ...prev, membership_status: 'rejected', membership_rejected_reason: rejectReason }));
      setRejectModalOpen(false);
      setRejectReason('');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setProcessing(false);
  };

  return (
    <>
      <button className="admin-back-btn" onClick={onBack}>← Back to Students</button>

      <div className="admin-user-detail">
        {/* Profile */}
        <div className="admin-user-detail-card">
          <h4>👤 Student Profile</h4>
          <div className="admin-detail-field"><span className="admin-detail-label">Name</span><span className="admin-detail-value">{currentUser.name}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Roll / Student ID</span><span className="admin-detail-value" style={{ fontFamily: 'monospace' }}>{currentUser.student_id || currentUser.roll_number || '—'}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Email</span><span className="admin-detail-value">{currentUser.email}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Joined</span><span className="admin-detail-value">{currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString() : '—'}</span></div>
        </div>

        {/* Membership Info */}
        <div className="admin-user-detail-card">
          <h4>🪪 Library Membership</h4>
          <div className="admin-detail-field">
            <span className="admin-detail-label">Status</span>
            <span className="admin-detail-value">
              <span className={`admin-badge ${currentUser.membership_status || 'none'}`}>
                {currentUser.membership_status === 'approved' ? '✓ Approved' : currentUser.membership_status === 'pending' ? '⏳ Pending Review' : currentUser.membership_status === 'rejected' ? '✕ Rejected' : 'Not Applied'}
              </span>
            </span>
          </div>
          <div className="admin-detail-field"><span className="admin-detail-label">Major & Year</span><span className="admin-detail-value">{currentUser.major || '—'} {currentUser.year ? `(Year ${currentUser.year})` : ''}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Phone</span><span className="admin-detail-value">{currentUser.phone || '—'}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">NRC / ID</span><span className="admin-detail-value">{currentUser.nrc || '—'}</span></div>
          {currentUser.membership_rejected_reason && (
            <div className="admin-detail-field"><span className="admin-detail-label">Reason</span><span className="admin-detail-value danger">{currentUser.membership_rejected_reason}</span></div>
          )}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {currentUser.membership_status !== 'approved' && (
              <button className="admin-btn-success" onClick={handleApproveMembership} disabled={processing}>Approve Member ✓</button>
            )}
            {currentUser.membership_status !== 'rejected' && (
              <button className="admin-btn-secondary" style={{ color: '#f87171' }} onClick={() => setRejectModalOpen(true)} disabled={processing}>Reject ✕</button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="admin-user-detail-card">
          <h4>📊 Summary</h4>
          <div className="admin-detail-field"><span className="admin-detail-label">Active Borrows</span><span className="admin-detail-value highlight">{active_borrows.length}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Overdue Books</span><span className="admin-detail-value danger">{active_borrows.filter(b => b.is_overdue).length}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Unpaid Fines</span><span className="admin-detail-value danger">{unpaid_fines.length}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Total Fine Amount</span><span className="admin-detail-value danger">{total_unpaid_fine_amount} kyats</span></div>
        </div>

        {/* Active Borrows */}
        <div className="admin-user-detail-card full-width">
          <h4>📖 Currently Borrowed Books</h4>
          {active_borrows.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No active borrows</p>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Book</th><th>Accession No</th><th>Borrow Date</th><th>Due Date</th><th>Status</th><th>Fine</th></tr></thead>
                <tbody>
                  {active_borrows.map(b => (
                    <tr key={b.transaction_id}>
                      <td>{b.book?.title || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.accession_no}</td>
                      <td>{new Date(b.borrow_date).toLocaleDateString()}</td>
                      <td>{new Date(b.due_date).toLocaleDateString()}</td>
                      <td><span className={`admin-badge ${b.is_overdue ? 'overdue' : 'available'}`}>{b.is_overdue ? 'Overdue' : `${b.days_remaining}d left`}</span></td>
                      <td>{b.current_fine > 0 ? <span style={{ color: '#fcd34d', fontWeight: 600 }}>{b.current_fine} kyats</span> : <span style={{ color: 'rgba(255,255,255,0.3)' }}>—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Unpaid Fines */}
        {unpaid_fines.length > 0 && (
          <div className="admin-user-detail-card full-width">
            <h4>💰 Unpaid Fines</h4>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Book</th><th>Due Date</th><th>Returned</th><th>Fine</th><th>Action</th></tr></thead>
                <tbody>
                  {unpaid_fines.map(f => (
                    <tr key={f.transaction_id}>
                      <td>{f.book_title}</td>
                      <td>{new Date(f.due_date).toLocaleDateString()}</td>
                      <td>{f.return_date ? new Date(f.return_date).toLocaleDateString() : '—'}</td>
                      <td><span style={{ color: '#fcd34d', fontWeight: 600 }}>{f.fine_amount} kyats</span></td>
                      <td><button className="admin-btn-success" onClick={() => handleMarkPaid(f.transaction_id)}>Mark Paid ✓</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="admin-modal-overlay" onClick={() => setRejectModalOpen(false)}>
          <div className="admin-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Reject Membership Application</h3>
              <button className="admin-modal-close" onClick={() => setRejectModalOpen(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 14 }}>
                Provide a reason so the student knows what to correct:
              </p>
              <div className="admin-form-group">
                <label>Rejection Reason</label>
                <textarea
                  className="admin-form-input"
                  rows={3}
                  placeholder="e.g. Roll number does not match academic records."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setRejectModalOpen(false)}>Cancel</button>
              <button className="admin-btn-secondary" style={{ background: '#ef4444', color: '#fff', border: 'none' }} onClick={handleRejectMembership} disabled={processing}>
                {processing ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MEMBERSHIPS TAB (Librarian Membership Verification Desk)
// ═══════════════════════════════════════════════════════════════
function MembershipsTab({ showToast, refreshTrigger }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);

  // Reject modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMemberships = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(
        `${API}/memberships?status=${statusFilter}&search=${encodeURIComponent(search)}&page=${page}&limit=15`
      );
      setApplications(data.applications || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPendingCount(data.pending_count || 0);
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  }, [statusFilter, search, page, showToast]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships, refreshTrigger]);

  const handleApprove = async (userId, userName) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API}/memberships/${userId}/approve`, { method: 'PATCH' });
      showToast(res.message || `Approved membership for ${userName}!`);
      fetchMemberships();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API}/memberships/${selectedUser.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason || 'Application details could not be verified by the library staff.' })
      });
      showToast(res.message || `Rejected membership for ${selectedUser.name}.`);
      setRejectModalOpen(false);
      setSelectedUser(null);
      setRejectReason('');
      fetchMemberships();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setActionLoading(false);
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3>🪪 Library Membership Applications</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`admin-btn-secondary ${statusFilter === 'pending' ? 'active' : ''}`}
              style={{
                fontSize: 12,
                padding: '4px 12px',
                background: statusFilter === 'pending' ? 'rgba(245, 158, 11, 0.2)' : undefined,
                color: statusFilter === 'pending' ? '#fbbf24' : undefined,
                borderColor: statusFilter === 'pending' ? '#f59e0b' : undefined,
              }}
              onClick={() => { setStatusFilter('pending'); setPage(1); }}
            >
              Pending ({pendingCount})
            </button>
            <button
              className={`admin-btn-secondary ${statusFilter === 'approved' ? 'active' : ''}`}
              style={{
                fontSize: 12,
                padding: '4px 12px',
                background: statusFilter === 'approved' ? 'rgba(16, 185, 129, 0.2)' : undefined,
                color: statusFilter === 'approved' ? '#34d399' : undefined,
                borderColor: statusFilter === 'approved' ? '#10b981' : undefined,
              }}
              onClick={() => { setStatusFilter('approved'); setPage(1); }}
            >
              Approved
            </button>
            <button
              className={`admin-btn-secondary ${statusFilter === 'rejected' ? 'active' : ''}`}
              style={{
                fontSize: 12,
                padding: '4px 12px',
                background: statusFilter === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : undefined,
                color: statusFilter === 'rejected' ? '#f87171' : undefined,
                borderColor: statusFilter === 'rejected' ? '#ef4444' : undefined,
              }}
              onClick={() => { setStatusFilter('rejected'); setPage(1); }}
            >
              Rejected
            </button>
            <button
              className={`admin-btn-secondary ${statusFilter === 'all' ? 'active' : ''}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => { setStatusFilter('all'); setPage(1); }}
            >
              All ({totalCount})
            </button>
          </div>
        </div>

        <div className="admin-panel-actions">
          <div className="admin-search-input">
            <span>🔍</span>
            <input
              placeholder="Search by student name, roll number, email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /><p>Loading membership applications…</p></div>
      ) : applications.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🪪</div>
          <p>No membership applications found in this view.</p>
          {statusFilter === 'pending' && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>All caught up! No pending student requests.</span>}
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll / Student ID</th>
                  <th>Major & Year</th>
                  <th>Phone & NRC</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="admin-user-avatar" style={{ width: 32, height: 32, fontSize: 11, borderRadius: 8 }}>
                          {app.avatar_url && app.avatar_url.length > 2 ? (
                            <img src={app.avatar_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 8, objectFit: 'cover' }} />
                          ) : (
                            app.avatar_url || (app.name ? app.name.slice(0, 2).toUpperCase() : 'ST')
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#fff' }}>{app.name}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{app.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 600, color: '#c7d2fe' }}>
                      {app.roll_number || app.student_id || '—'}
                    </td>
                    <td>
                      <div style={{ fontSize: 13, color: '#fff' }}>{app.major || '—'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{app.year ? `Year ${app.year}` : ''}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12, color: '#cbd5e1' }}>{app.phone || '—'}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{app.nrc || ''}</div>
                    </td>
                    <td style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                      {app.membership_applied_at ? new Date(app.membership_applied_at).toLocaleDateString() : (app.created_at ? new Date(app.created_at).toLocaleDateString() : '—')}
                    </td>
                    <td>
                      <span className={`admin-badge ${app.membership_status || 'none'}`}>
                        {app.membership_status === 'approved' ? '✓ Approved' : app.membership_status === 'pending' ? '⏳ Pending' : app.membership_status === 'rejected' ? '✕ Rejected' : 'Not Applied'}
                      </span>
                      {app.membership_status === 'rejected' && app.membership_rejected_reason && (
                        <div style={{ fontSize: 10.5, color: '#fca5a5', marginTop: 3, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={app.membership_rejected_reason}>
                          Note: {app.membership_rejected_reason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {app.membership_status !== 'approved' && (
                          <button
                            className="admin-btn-success"
                            style={{ padding: '5px 12px', fontSize: 12 }}
                            onClick={() => handleApprove(app.id, app.name)}
                            disabled={actionLoading}
                            title="Approve membership to grant borrowing permissions"
                          >
                            Approve ✓
                          </button>
                        )}
                        {app.membership_status !== 'rejected' && (
                          <button
                            className="admin-btn-secondary"
                            style={{ padding: '5px 10px', fontSize: 12, color: '#f87171' }}
                            onClick={() => { setSelectedUser(app); setRejectReason(''); setRejectModalOpen(true); }}
                            disabled={actionLoading}
                            title="Reject application with reason"
                          >
                            Reject ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`admin-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="admin-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setRejectModalOpen(false)}>
          <div className="admin-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Reject Membership for {selectedUser.name}</h3>
              <button className="admin-modal-close" onClick={() => setRejectModalOpen(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, marginBottom: 14 }}>
                Enter the reason for rejecting this student's membership application. The student will see this note when they log in.
              </p>
              <div className="admin-form-group">
                <label>Rejection Reason</label>
                <textarea
                  className="admin-form-input"
                  rows={3}
                  placeholder="e.g. Roll number not found in student directory. Please verify and resubmit."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setRejectModalOpen(false)}>Cancel</button>
              <button
                className="admin-btn-secondary"
                style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                onClick={handleReject}
                disabled={actionLoading}
              >
                {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CATALOG TAB (Add Books)
// ═══════════════════════════════════════════════════════════════
function CatalogTab({ showToast, refreshTrigger, setShowUnifiedModal }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/books?search=${encodeURIComponent(search)}`).then(r => r.json());
      setBooks(data.books || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchBooks(); }, [fetchBooks, refreshTrigger]);

  return (
    <>
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3>📚 Book Catalog ({books.length})</h3>
          <div className="admin-panel-actions">
            <div className="admin-search-input">
              <span>🔍</span>
              <input placeholder="Search by title, author…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="admin-btn-primary" onClick={() => setShowUnifiedModal(true)}>+ Add Book / Copy</button>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading catalog…</p></div>
        ) : books.length === 0 ? (
          <div className="admin-empty"><div className="admin-empty-icon">📚</div><p>No books found</p></div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>ISBN</th><th>Pages</th><th>Copies</th><th>Available</th></tr></thead>
              <tbody>
                {books.map(b => (
                  <tr key={b.id}>
                    <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.title}</td>
                    <td>{b.author}</td>
                    <td><span className="admin-badge borrowed" style={{ fontSize: 10 }}>{b.category || b.genre || '—'}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{b.isbn || '—'}</td>
                    <td>{b.total_pages || '—'}</td>
                    <td><span className="admin-badge borrowed">{b.totalCopies}</span></td>
                    <td><span className={`admin-badge ${b.availableCopies > 0 ? 'available' : 'lost'}`}>{b.availableCopies}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// THESES TAB (Graduation Theses & Research Papers)
// ═══════════════════════════════════════════════════════════════
function ThesesTab({ showToast, refreshTrigger, setShowAddThesisModal, setPreviewThesisItem }) {
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [deletingId, setDeletingId] = useState(null);

  const fetchTheses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append('search', search.trim());
      if (selectedMajor !== 'all') params.append('major', selectedMajor);
      if (selectedYear !== 'all') params.append('year', selectedYear);

      const data = await apiFetch(`${API}/theses?${params.toString()}`);
      setTheses(data.theses || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch theses', 'error');
    }
    setLoading(false);
  }, [search, selectedMajor, selectedYear, showToast]);

  useEffect(() => {
    fetchTheses();
  }, [fetchTheses, refreshTrigger]);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete the thesis "${title}"?`)) return;
    setDeletingId(id);
    try {
      await apiFetch(`${API}/theses/${id}`, { method: 'DELETE' });
      showToast('Thesis deleted successfully', 'success');
      fetchTheses();
    } catch (err) {
      showToast(err.message || 'Failed to delete thesis', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const majors = [
    'all',
    'Information Technology',
    'Electronic Communication',
    'Electrical Power',
    'Civil Engineering',
    'Mechanical Engineering',
    'Mechatronics Engineering',
    'Architecture',
    'Chemical Engineering',
  ];

  const currentYear = new Date().getFullYear();
  const years = ['all', ...Array.from({ length: 12 }, (_, i) => currentYear - i)];

  return (
    <>
      {/* Top Filter Bar */}
      <div className="admin-panel" style={{ marginBottom: 20 }}>
        <div className="admin-panel-header" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🎓</span>
              <span>Graduation Theses & Research</span>
              <span className="admin-badge available" style={{ fontSize: 11 }}>{theses.length} Total</span>
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b' }}>
              Upload and catalog student graduation theses with full 10-page preview engine
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="admin-search-input">
              <span>🔍</span>
              <input
                placeholder="Search title, roll, author…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <select
              value={selectedMajor}
              onChange={e => setSelectedMajor(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc', color: '#1e293b' }}
            >
              <option value="all">All Majors / Departments</option>
              {majors.filter(m => m !== 'all').map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={e => setSelectedYear(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, background: '#f8fafc', color: '#1e293b' }}
            >
              <option value="all">All Academic Years</option>
              {years.filter(y => y !== 'all').map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <button
              className="admin-btn-primary"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setShowAddThesisModal(true)}
            >
              <span>🎓</span>
              <span>+ Add Thesis</span>
            </button>
          </div>
        </div>
      </div>

      {/* Theses List */}
      <div className="admin-panel">
        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Loading theses records…</p>
          </div>
        ) : theses.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">🎓</div>
            <p>No graduation theses found matching your filters</p>
            <button
              className="admin-btn-primary"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)', marginTop: 12 }}
              onClick={() => setShowAddThesisModal(true)}
            >
              + Upload First Thesis
            </button>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thesis Title</th>
                  <th>Major / Dept</th>
                  <th>Student Author</th>
                  <th>Roll No</th>
                  <th>Year</th>
                  <th>Supervisor</th>
                  <th>Pages</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {theses.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36,
                          height: 48,
                          borderRadius: 4,
                          overflow: 'hidden',
                          background: t.cover_url ? 'transparent' : 'linear-gradient(135deg, #1e3a5f, #0f172a)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                          fontSize: 16,
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                        }}>
                          {t.cover_url ? (
                            <img src={t.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : '🎓'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.title}>
                            {t.title}
                          </div>
                          {t.accession_no && (
                            <span style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>
                              Acc: {t.accession_no}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="admin-badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 600, fontSize: 11 }}>
                        {t.major}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.author}</td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0284c7', background: '#f0f9ff', padding: '3px 8px', borderRadius: 6, fontSize: 12, border: '1px solid #bae6fd' }}>
                        {t.student_roll}
                      </span>
                    </td>
                    <td>
                      <span className="admin-badge" style={{ background: '#fef3c7', color: '#b45309', fontWeight: 600, fontSize: 11 }}>
                        {t.year}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#475569' }}>{t.supervisor || '—'}</td>
                    <td>
                      <span className="admin-badge available" style={{ fontSize: 11 }}>
                        {t.total_pages || 10}p ({Math.min(10, t.preview_pages_count || 10)}p preview)
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(t.preview_pdf_url || t.pdf_url) ? (
                          <button
                            className="admin-btn-action"
                            style={{ background: '#0284c7', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            onClick={() => setPreviewThesisItem(t)}
                            title="Preview first 10 pages"
                          >
                            👁️ 10p View
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>No PDF</span>
                        )}
                        <button
                          className="admin-btn-action"
                          style={{ background: '#fee2e2', color: '#ef4444' }}
                          onClick={() => handleDelete(t.id, t.title)}
                          disabled={deletingId === t.id}
                          title="Delete thesis"
                        >
                          {deletingId === t.id ? '...' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}


// ═══════════════════════════════════════════════════════════════
// INVENTORY TAB (Physical Copies)
// ═══════════════════════════════════════════════════════════════
function InventoryTab({ showToast, refreshTrigger, setShowUnifiedModal }) {
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showStatusModal, setShowStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const data = await apiFetch(`${API}/inventory?${params}`);
      setCopies(data.inventory || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  }, [statusFilter, search, page, showToast]);

  useEffect(() => { fetchInventory(); }, [fetchInventory, refreshTrigger]);

  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    setSaving(true);
    try {
      const data = await apiFetch(`${API}/physical-copies/${showStatusModal}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      showToast(data.message || 'Status updated!');
      setShowStatusModal(null);
      setNewStatus('');
      fetchInventory();
    } catch (err) { showToast(err.message, 'error'); }
    setSaving(false);
  };

  return (
    <>
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3>📦 Physical Copies</h3>
          <div className="admin-panel-actions">
            <div className="admin-search-input">
              <span>🔍</span>
              <input placeholder="Search by title or author…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="admin-filter-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="borrowed">Borrowed</option>
              <option value="lost">Lost</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <button className="admin-btn-primary" onClick={() => setShowUnifiedModal(true)}>+ Add Book / Copy</button>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading inventory…</p></div>
        ) : copies.length === 0 ? (
          <div className="admin-empty"><div className="admin-empty-icon">📦</div><p>No copies found</p></div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead><tr><th>Accession No</th><th>Book Title</th><th>Author</th><th>Status</th><th>Acquired</th><th>Action</th></tr></thead>
                <tbody>
                  {copies.map(c => (
                    <tr key={c.accession_no}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{c.accession_no}</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.book_title}</td>
                      <td>{c.book_author}</td>
                      <td><span className={`admin-badge ${c.status}`}>{c.status}</span></td>
                      <td>{c.date_acquired || '—'}</td>
                      <td>
                        <button className="admin-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => { setShowStatusModal(c.accession_no); setNewStatus(c.status); }}>
                          Change Status
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="admin-pagination">
                <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`admin-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                ))}
                <button className="admin-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Change Status Modal */}
      {showStatusModal && (
        <div className="admin-modal-overlay" onClick={() => setShowStatusModal(null)}>
          <div className="admin-modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Change Status</h3>
              <button className="admin-modal-close" onClick={() => setShowStatusModal(null)}>×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16 }}>
                Accession: <strong style={{ color: '#e5e7eb' }}>{showStatusModal}</strong>
              </p>
              <div className="admin-form-group">
                <label>New Status</label>
                <select className="admin-form-input" value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="available">Available</option>
                  <option value="borrowed">Borrowed</option>
                  <option value="lost">Lost</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setShowStatusModal(null)}>Cancel</button>
              <button className="admin-btn-primary" onClick={handleUpdateStatus} disabled={saving}>{saving ? 'Updating…' : 'Update Status'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// BORROW REQUESTS TAB (Review & Approve student borrow applications)
// ═══════════════════════════════════════════════════════════════
function BorrowRequestsTab({ showToast, refreshTrigger }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('borrow_requested');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);

  // Approval & Rejection Modal State
  const [approvingTx, setApprovingTx] = useState(null);
  const [assignAccession, setAssignAccession] = useState('');
  const [assignDuration, setAssignDuration] = useState(7);
  const [librarianNotes, setLibrarianNotes] = useState('');

  const [rejectingTx, setRejectingTx] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBorrowRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(
        `${API}/requests/borrow?status=${statusFilter}&search=${encodeURIComponent(search)}&page=${page}&limit=15`
      );
      setRequests(data.requests || []);
      setTotalCount(data.total || 0);
      setTotalPages(data.total_pages || 1);
      setPendingCount(data.pending_count || 0);
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  }, [statusFilter, search, page, showToast]);

  useEffect(() => {
    fetchBorrowRequests();
  }, [fetchBorrowRequests, refreshTrigger]);

  const handleOpenApproveModal = (req) => {
    setApprovingTx(req);
    setAssignAccession(req.accession_no || '');
    setAssignDuration(req.borrow_duration_days || 7);
    setLibrarianNotes('');
  };

  const handleConfirmApprove = async () => {
    if (!approvingTx) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API}/requests/borrow/${approvingTx.id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({
          accessionNo: assignAccession.trim() || approvingTx.accession_no,
          durationDays: parseInt(assignDuration, 10) || 7,
          librarianNotes: librarianNotes.trim()
        })
      });
      showToast(res.message || 'Borrow request approved!');
      setApprovingTx(null);
      fetchBorrowRequests();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setActionLoading(false);
  };

  const handleOpenRejectModal = (req) => {
    setRejectingTx(req);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingTx) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API}/requests/borrow/${rejectingTx.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({
          reason: rejectReason.trim() || 'Physical copy is unavailable or reserved for in-library reading.'
        })
      });
      showToast(res.message || 'Borrow request rejected.');
      setRejectingTx(null);
      fetchBorrowRequests();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setActionLoading(false);
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel-header" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h3>📥 Student Borrow Requests</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={`admin-btn-secondary ${statusFilter === 'borrow_requested' ? 'active' : ''}`}
              style={{
                fontSize: 12,
                padding: '4px 12px',
                background: statusFilter === 'borrow_requested' ? 'rgba(245, 158, 11, 0.2)' : undefined,
                color: statusFilter === 'borrow_requested' ? '#fbbf24' : undefined,
                borderColor: statusFilter === 'borrow_requested' ? '#f59e0b' : undefined,
              }}
              onClick={() => { setStatusFilter('borrow_requested'); setPage(1); }}
            >
              Pending ({pendingCount})
            </button>
            <button
              className={`admin-btn-secondary ${statusFilter === 'borrowed' ? 'active' : ''}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => { setStatusFilter('borrowed'); setPage(1); }}
            >
              Approved & Active
            </button>
            <button
              className={`admin-btn-secondary ${statusFilter === 'rejected' ? 'active' : ''}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => { setStatusFilter('rejected'); setPage(1); }}
            >
              Rejected
            </button>
            <button
              className={`admin-btn-secondary ${statusFilter === 'all' ? 'active' : ''}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => { setStatusFilter('all'); setPage(1); }}
            >
              All Requests
            </button>
          </div>
        </div>

        <div className="admin-panel-actions">
          <div className="admin-search-input">
            <span>🔍</span>
            <input
              placeholder="Search student, book, accession…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading">
          <div className="admin-spinner" />
          <p>Loading borrow requests…</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">📥</div>
          <p>No borrow requests found in this category</p>
        </div>
      ) : (
        <>
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student Borrower</th>
                  <th>Book Title</th>
                  <th>Assigned Copy</th>
                  <th>Requested Duration</th>
                  <th>Purpose / Notes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{req.student?.name || '—'}</div>
                      <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 2 }}>
                        {req.student?.roll_number || req.student?.student_id || 'No Roll'} • {req.student?.major || 'Major —'} {req.student?.year ? `(Yr ${req.student.year})` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{req.student?.email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, maxWidth: 220 }}>{req.book?.title || '—'}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{req.book?.author}</div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>
                        {req.accession_no || 'Auto-assign'}
                      </span>
                    </td>
                    <td>
                      <div>{req.borrow_duration_days || 7} Days</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {req.borrow_requested_at ? new Date(req.borrow_requested_at).toLocaleDateString() : '—'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5, color: '#d1d5db', maxWidth: 180 }}>
                        {req.borrow_request_notes ? `"${req.borrow_request_notes}"` : <span style={{ color: '#6b7280' }}>None</span>}
                      </div>
                      {req.librarian_notes && (
                        <div style={{ fontSize: 11, color: req.status === 'rejected' ? '#f87171' : '#34d399', marginTop: 3 }}>
                          Note: {req.librarian_notes}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge ${req.status}`}>
                        {req.status === 'borrow_requested' ? 'Pending Approval' : req.status === 'borrowed' ? 'Approved / Active' : req.status}
                      </span>
                    </td>
                    <td>
                      {req.status === 'borrow_requested' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="admin-btn-success"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => handleOpenApproveModal(req)}
                          >
                            Approve ✓
                          </button>
                          <button
                            className="admin-btn-danger"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => handleOpenRejectModal(req)}
                          >
                            Reject ✕
                          </button>
                        </div>
                      ) : req.status === 'borrowed' ? (
                        <span style={{ fontSize: 12, color: '#34d399', fontWeight: 600 }}>Active Loan</span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>Closed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="admin-pagination">
              <button className="admin-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                <button key={p} className={`admin-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
              <button className="admin-page-btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          )}
        </>
      )}

      {/* Approve Modal */}
      {approvingTx && (
        <div className="admin-modal-overlay" onClick={() => setApprovingTx(null)}>
          <div className="admin-modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Approve Borrow Request</h3>
              <button className="admin-modal-close" onClick={() => setApprovingTx(null)}>×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13.5, marginBottom: 14 }}>
                Approve loan of <strong>"{approvingTx.book?.title}"</strong> for <strong>{approvingTx.student?.name}</strong>.
              </p>

              <div className="admin-form-group">
                <label>Physical Copy Accession No</label>
                <input
                  className="admin-form-input"
                  value={assignAccession}
                  onChange={e => setAssignAccession(e.target.value)}
                  placeholder="e.g. ACC-0001"
                />
              </div>

              <div className="admin-form-group">
                <label>Loan Duration (Days)</label>
                <select
                  className="admin-form-input"
                  value={assignDuration}
                  onChange={e => setAssignDuration(e.target.value)}
                >
                  <option value={7}>7 Days (Standard)</option>
                  <option value={14}>14 Days (Research)</option>
                  <option value={21}>21 Days (Thesis / Special)</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label>Librarian Pickup Note (Optional)</label>
                <input
                  className="admin-form-input"
                  value={librarianNotes}
                  onChange={e => setLibrarianNotes(e.target.value)}
                  placeholder="e.g. Ready for pickup at Counter A"
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setApprovingTx(null)}>Cancel</button>
              <button className="admin-btn-success" onClick={handleConfirmApprove} disabled={actionLoading}>
                {actionLoading ? 'Approving…' : 'Confirm & Issue Loan ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingTx && (
        <div className="admin-modal-overlay" onClick={() => setRejectingTx(null)}>
          <div className="admin-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Reject Borrow Request</h3>
              <button className="admin-modal-close" onClick={() => setRejectingTx(null)}>×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13.5, marginBottom: 14 }}>
                Reject request for <strong>"{rejectingTx.book?.title}"</strong> by <strong>{rejectingTx.student?.name}</strong>.
              </p>
              <div className="admin-form-group">
                <label>Rejection Reason</label>
                <textarea
                  className="admin-form-input"
                  rows={3}
                  placeholder="e.g. Physical copy is in maintenance / already reserved"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setRejectingTx(null)}>Cancel</button>
              <button className="admin-btn-danger" onClick={handleConfirmReject} disabled={actionLoading}>
                {actionLoading ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RETURNS TAB (Verify student return requests & quick return desk)
// ═══════════════════════════════════════════════════════════════
function ReturnsTab({ showToast, refreshTrigger }) {
  const [returnRequests, setReturnRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('return_requested');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingCount, setPendingCount] = useState(0);

  // Rejection modal
  const [rejectingTx, setRejectingTx] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Manual Quick Return desk
  const [accessionNo, setAccessionNo] = useState('');
  const [processingManual, setProcessingManual] = useState(false);
  const [manualResult, setManualResult] = useState(null);

  const fetchReturnRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(
        `${API}/requests/return?status=${statusFilter}&search=${encodeURIComponent(search)}&page=${page}&limit=15`
      );
      setReturnRequests(data.requests || []);
      setTotalPages(data.total_pages || 1);
      setPendingCount(data.pending_count || 0);
    } catch (err) {
      showToast(err.message, 'error');
    }
    setLoading(false);
  }, [statusFilter, search, page, showToast]);

  useEffect(() => {
    fetchReturnRequests();
  }, [fetchReturnRequests, refreshTrigger]);

  const handleApproveReturn = async (req) => {
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API}/requests/return/${req.id}/approve`, {
        method: 'PATCH',
        body: JSON.stringify({ conditionRemark: 'Inspected and accepted at desk' })
      });
      showToast(res.message || `Return verified for ${req.book?.title}!`);
      fetchReturnRequests();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setActionLoading(false);
  };

  const handleConfirmRejectReturn = async () => {
    if (!rejectingTx) return;
    setActionLoading(true);
    try {
      const res = await apiFetch(`${API}/requests/return/${rejectingTx.id}/reject`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: rejectReason.trim() || 'Physical book was not received at circulation desk.' })
      });
      showToast(res.message || 'Return request rejected.');
      setRejectingTx(null);
      fetchReturnRequests();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setActionLoading(false);
  };

  const handleManualReturn = async () => {
    if (!accessionNo.trim()) { showToast('Enter an accession number', 'error'); return; }
    setProcessingManual(true);
    setManualResult(null);
    try {
      const data = await apiFetch(`${API}/returns/${encodeURIComponent(accessionNo.trim())}`, { method: 'POST' });
      setManualResult(data);
      showToast(data.message || 'Return processed!');
      setAccessionNo('');
      fetchReturnRequests();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setProcessingManual(false);
  };

  return (
    <>
      {/* 1. Student Return Requests Desk */}
      <div className="admin-panel">
        <div className="admin-panel-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h3>🔄 Student Return Submissions</h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`admin-btn-secondary ${statusFilter === 'return_requested' ? 'active' : ''}`}
                style={{
                  fontSize: 12,
                  padding: '4px 12px',
                  background: statusFilter === 'return_requested' ? 'rgba(245, 158, 11, 0.2)' : undefined,
                  color: statusFilter === 'return_requested' ? '#fbbf24' : undefined,
                  borderColor: statusFilter === 'return_requested' ? '#f59e0b' : undefined,
                }}
                onClick={() => { setStatusFilter('return_requested'); setPage(1); }}
              >
                Pending Verification ({pendingCount})
              </button>
              <button
                className={`admin-btn-secondary ${statusFilter === 'returned' ? 'active' : ''}`}
                style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => { setStatusFilter('returned'); setPage(1); }}
              >
                Completed Returns
              </button>
              <button
                className={`admin-btn-secondary ${statusFilter === 'all' ? 'active' : ''}`}
                style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => { setStatusFilter('all'); setPage(1); }}
              >
                All History
              </button>
            </div>
          </div>

          <div className="admin-panel-actions">
            <div className="admin-search-input">
              <span>🔍</span>
              <input
                placeholder="Search student or book…"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><p>Loading return submissions…</p></div>
        ) : returnRequests.length === 0 ? (
          <div className="admin-empty"><div className="admin-empty-icon">✅</div><p>No pending return requests</p></div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Book & Accession</th>
                  <th>Student Condition Note</th>
                  <th>Due Date</th>
                  <th>Overdue / Fines</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {returnRequests.map(req => (
                  <tr key={req.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{req.student?.name || '—'}</div>
                      <div style={{ fontSize: 11.5, color: '#9ca3af' }}>{req.student?.roll_number || req.student?.student_id || '—'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{req.book?.title || '—'}</div>
                      <span style={{ fontFamily: 'monospace', fontSize: 11.5, color: '#60a5fa' }}>{req.accession_no}</span>
                    </td>
                    <td>
                      <span className={`admin-badge ${req.return_condition === 'good' ? 'available' : req.return_condition === 'damaged' ? 'lost' : 'pending'}`}>
                        {req.return_condition === 'good' ? 'Good Condition' : req.return_condition === 'minor_wear' ? 'Minor Wear' : 'Damaged / Repaired'}
                      </span>
                      {req.return_request_notes && (
                        <div style={{ fontSize: 11.5, color: '#9ca3af', marginTop: 3 }}>
                          "{req.return_request_notes}"
                        </div>
                      )}
                    </td>
                    <td>
                      <div>{req.due_date ? new Date(req.due_date).toLocaleDateString() : '—'}</div>
                      <div style={{ fontSize: 11, color: req.is_overdue ? '#f87171' : '#34d399' }}>
                        {req.is_overdue ? `${Math.abs(req.days_remaining)} days overdue` : 'On time ✓'}
                      </div>
                    </td>
                    <td>
                      {req.current_fine > 0 ? (
                        <span style={{ color: '#fcd34d', fontWeight: 600 }}>{req.current_fine} kyats</span>
                      ) : (
                        <span style={{ color: '#34d399' }}>No Fine</span>
                      )}
                    </td>
                    <td>
                      {req.status === 'return_requested' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="admin-btn-success"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => handleApproveReturn(req)}
                            disabled={actionLoading}
                          >
                            Verify & Accept ✓
                          </button>
                          <button
                            className="admin-btn-danger"
                            style={{ padding: '5px 10px', fontSize: 12 }}
                            onClick={() => { setRejectingTx(req); setRejectReason(''); }}
                            disabled={actionLoading}
                          >
                            Reject ✕
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#34d399' }}>Returned ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 2. Manual Accession Return Desk */}
      <div className="admin-panel" style={{ marginTop: 24 }}>
        <div className="admin-panel-header">
          <h3>⚡ Manual Accession Quick Return (Walk-in Desk)</h3>
        </div>
        <div style={{ padding: '24px 22px' }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, marginBottom: 18 }}>
            Type or scan an <strong style={{ color: '#d1d5db' }}>accession number</strong> to instantly check-in a book at the desk.
          </p>
          <div className="admin-return-desk">
            <div className="admin-return-input-group">
              <input
                placeholder="Enter accession number (e.g. ACC-0001)"
                value={accessionNo}
                onChange={e => setAccessionNo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualReturn()}
              />
              <button className="admin-btn-primary" onClick={handleManualReturn} disabled={processingManual}
                style={{ padding: '14px 28px', fontSize: 14 }}>
                {processingManual ? 'Processing…' : '📥 Check-in Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Return Result Card */}
      {manualResult && (
        <div className="admin-panel admin-return-result">
          <div className="admin-panel-header">
            <h3>{manualResult.transaction?.fine_amount > 0 ? '⚠️ Overdue Return Processed' : '✅ Checked In Successfully'}</h3>
          </div>
          <div style={{ padding: '20px 22px' }}>
            <div className="admin-return-card">
              <div className="admin-return-field">
                <label>Book</label>
                <p>{manualResult.book?.title || '—'}</p>
              </div>
              <div className="admin-return-field">
                <label>Borrower</label>
                <p>{manualResult.borrower?.name || '—'}</p>
              </div>
              <div className="admin-return-field">
                <label>Fine Amount</label>
                <p className={manualResult.transaction?.fine_amount > 0 ? 'fine-amount' : 'no-fine'}>
                  {manualResult.transaction?.fine_amount > 0 ? `${manualResult.transaction.fine_amount} kyats` : 'No fine'}
                </p>
              </div>
              <div className="admin-return-field">
                <label>Status</label>
                <p><span className="admin-badge available">Available in Shelf</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Return Modal */}
      {rejectingTx && (
        <div className="admin-modal-overlay" onClick={() => setRejectingTx(null)}>
          <div className="admin-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>Reject Return Request</h3>
              <button className="admin-modal-close" onClick={() => setRejectingTx(null)}>×</button>
            </div>
            <div className="admin-modal-body">
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13.5, marginBottom: 14 }}>
                Reject return submission for <strong>"{rejectingTx.book?.title}"</strong> ({rejectingTx.accession_no}).
              </p>
              <div className="admin-form-group">
                <label>Reason for rejection</label>
                <textarea
                  className="admin-form-input"
                  rows={3}
                  placeholder="e.g. Physical book was not received at circulation desk / wrong copy returned"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setRejectingTx(null)}>Cancel</button>
              <button className="admin-btn-danger" onClick={handleConfirmRejectReturn} disabled={actionLoading}>
                {actionLoading ? 'Rejecting…' : 'Reject Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// FINES TAB
// ═══════════════════════════════════════════════════════════════
function FinesTab({ showToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, with_fines

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`${API}/users?limit=100`);
      const allUsers = data.users || [];

      // For each user with active borrows, fetch details to get fine info
      const usersWithFines = [];
      for (const u of allUsers) {
        try {
          const detail = await apiFetch(`${API}/users/${u.id}`);
          if (detail.unpaid_fines?.length > 0 || filter === 'all') {
            usersWithFines.push({
              ...u,
              unpaid_fines: detail.unpaid_fines || [],
              total_unpaid: detail.total_unpaid_fine_amount || 0,
            });
          }
        } catch { /* skip */ }
      }

      if (filter === 'with_fines') {
        setUsers(usersWithFines.filter(u => u.total_unpaid > 0));
      } else {
        setUsers(usersWithFines);
      }
    } catch (err) { showToast(err.message, 'error'); }
    setLoading(false);
  }, [showToast, filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleMarkPaid = async (txId) => {
    try {
      await apiFetch(`${API}/fines/${txId}/pay`, { method: 'PATCH' });
      showToast('Fine marked as paid!');
      fetchUsers();
    } catch (err) { showToast(err.message, 'error'); }
  };

  // Flatten all fines into a single list
  const allFines = users.flatMap(u =>
    (u.unpaid_fines || []).map(f => ({ ...f, student_name: u.name, student_id: u.student_id }))
  );

  return (
    <div className="admin-panel">
      <div className="admin-panel-header">
        <h3>💰 Unpaid Fines ({allFines.length})</h3>
        <div className="admin-panel-actions">
          <select className="admin-filter-select" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="with_fines">With Unpaid Fines</option>
            <option value="all">All Students</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="admin-spinner" /><p>Loading fines…</p></div>
      ) : allFines.length === 0 ? (
        <div className="admin-empty"><div className="admin-empty-icon">✅</div><p>No unpaid fines — all clear!</p></div>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead><tr><th>Student</th><th>Student ID</th><th>Book</th><th>Due Date</th><th>Returned</th><th>Fine</th><th>Action</th></tr></thead>
            <tbody>
              {allFines.map(f => (
                <tr key={f.transaction_id}>
                  <td>{f.student_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{f.student_id || '—'}</td>
                  <td>{f.book_title}</td>
                  <td>{new Date(f.due_date).toLocaleDateString()}</td>
                  <td>{f.return_date ? new Date(f.return_date).toLocaleDateString() : '—'}</td>
                  <td><span style={{ color: '#fcd34d', fontWeight: 600 }}>{f.fine_amount} kyats</span></td>
                  <td><button className="admin-btn-success" onClick={() => handleMarkPaid(f.transaction_id)}>Mark Paid ✓</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UNIFIED ADD BOOK / COPY MODAL
// ═══════════════════════════════════════════════════════════════
function UnifiedAddModal({ onClose, onSuccess, showToast }) {
  const [mode, setMode] = useState('new_book'); // 'new_book' or 'existing_book'
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  // Book form state
  const [bookForm, setBookForm] = useState({ title: '', author: '', isbn: '', publisher: '', edition: '', publication_year: '', class_no: '', cover_url: '', category: '', review: '', total_pages: '', size: '', place_of_publication: '', is_translated: false, original_title: '', original_author: '', translator: '' });

  // Copy form state
  const [copyForm, setCopyForm] = useState({ accession_no: '', date_acquired: new Date().toISOString().split('T')[0], is_date_unknown: false, price: '', how_obtained: '', remark: '' });

  // Existing book selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (mode !== 'existing_book') return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/books?search=${encodeURIComponent(searchQuery)}&limit=10`);
        const data = await res.json();
        setSearchResults(data.books || []);
      } catch { /* silent */ }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const handleSave = async () => {
    if (!copyForm.accession_no.trim()) { showToast('Accession No is required', 'error'); return; }

    setSaving(true);
    try {
      let bookIdToUse = null;

      if (mode === 'new_book') {
        if (!bookForm.title.trim() || !bookForm.author.trim()) {
          showToast('Title and Author are required', 'error');
          setSaving(false);
          return;
        }

        // 1. Create Book
        const payload = { ...bookForm };
        if (payload.edition) {
          payload.edition = toEnglishOrdinal(payload.edition) || payload.edition;
        }
        const bookData = await apiFetch('/api/admin/books', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        bookIdToUse = bookData.book.id;
      } else {
        if (!selectedBook) {
          showToast('Please select a book first', 'error');
          setSaving(false);
          return;
        }
        bookIdToUse = selectedBook.id;
      }

      // 2. Create Copy
      await apiFetch('/api/admin/physical-copies', {
        method: 'POST',
        body: JSON.stringify({
          ...copyForm,
          date_acquired: copyForm.is_date_unknown ? null : copyForm.date_acquired,
          book_id: bookIdToUse
        }),
      });

      showToast(`Successfully added ${mode === 'new_book' ? 'book and ' : ''}copy!`);
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    }
    setSaving(false);
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('cover', file);

      const stored = sessionStorage.getItem('ttu_session');
      const token = stored ? JSON.parse(stored)?.access_token : null;

      const res = await fetch(`/api/upload/book-cover`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload failed');

      setBookForm({ ...bookForm, cover_url: data.data.publicUrl });
      showToast('Cover uploaded successfully!');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setUploadingCover(false);
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="admin-modal-header">
          <h3>📚 Add Book / Copy</h3>
          <button className="admin-modal-close" onClick={onClose}>×</button>
        </div>

        <div className="admin-modal-body">
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              className={mode === 'new_book' ? 'admin-btn-primary' : 'admin-btn-secondary'}
              onClick={() => setMode('new_book')}
              style={{ flex: 1, padding: '10px' }}
            >
              Add New Book + Copy
            </button>
            <button
              className={mode === 'existing_book' ? 'admin-btn-primary' : 'admin-btn-secondary'}
              onClick={() => setMode('existing_book')}
              style={{ flex: 1, padding: '10px' }}
            >
              Add Copy to Existing Book
            </button>
          </div>

          {mode === 'new_book' ? (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', borderRadius: 12, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: 15 }}>📖 Book Details</h4>

              {/* ── Book Form Fields ── */}
              <div className="admin-form-group">
                <label>Title *</label>
                <input className="admin-form-input" placeholder="e.g. လင်္ကာဒီပချစ်သူ" value={bookForm.title} onChange={e => setBookForm({ ...bookForm, title: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label>Author *</label>
                <input className="admin-form-input" placeholder="e.g. ချစ်ဦးညို " value={bookForm.author} onChange={e => setBookForm({ ...bookForm, author: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>ISBN</label>
                  <input className="admin-form-input" placeholder="e.g. 978-0-74-327356-5" value={bookForm.isbn} onChange={e => setBookForm({ ...bookForm, isbn: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Class No.</label>
                  <input className="admin-form-input" placeholder="e.g. ၈၉၅.၈" value={bookForm.class_no} onChange={e => setBookForm({ ...bookForm, class_no: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Publisher</label>
                  <input className="admin-form-input" placeholder="e.g. စိတ်ကူးချိုချို" value={bookForm.publisher} onChange={e => setBookForm({ ...bookForm, publisher: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>
                    Edition
                    {bookForm.edition && !isNaN(parseInt(bookForm.edition, 10)) && (
                      <span style={{ fontSize: '0.85rem', color: '#a5b4fc', marginLeft: '8px', fontWeight: 'normal' }}>
                        ({toEnglishOrdinal(bookForm.edition)})
                      </span>
                    )}
                  </label>
                  <input type="number" min="1" className="admin-form-input" placeholder="e.g. 1" value={bookForm.edition} onChange={e => setBookForm({ ...bookForm, edition: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Publication Year</label>
                  <input className="admin-form-input" type="number" placeholder="e.g. ၂၀၀၈" value={bookForm.publication_year} onChange={e => setBookForm({ ...bookForm, publication_year: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Cover URL</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="admin-form-input" placeholder="https://…" value={bookForm.cover_url} onChange={e => setBookForm({ ...bookForm, cover_url: e.target.value })} style={{ flex: 1 }} />
                    <label className="admin-btn-secondary" style={{ cursor: 'pointer', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {uploadingCover ? '⏳' : '📁'} Upload
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} disabled={uploadingCover} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="admin-form-group">
                <label>Category</label>
                <input className="admin-form-input" placeholder="e.g. Fiction / Thriller" value={bookForm.category} onChange={e => setBookForm({ ...bookForm, category: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label>Place of Publication</label>
                <input className="admin-form-input" placeholder="e.g. ရန်ကုန်" value={bookForm.place_of_publication} onChange={e => setBookForm({ ...bookForm, place_of_publication: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Total Pages</label>
                  <input className="admin-form-input" type="number" placeholder="e.g. 320" value={bookForm.total_pages} onChange={e => setBookForm({ ...bookForm, total_pages: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Size(အလျားသာထည့်ရန် / cm)</label>
                  <input className="admin-form-input" type="number" placeholder="e.g. 21" value={bookForm.size} onChange={e => setBookForm({ ...bookForm, size: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Review</label>
                <textarea className="admin-form-input" placeholder="Brief review or description…" value={bookForm.review} onChange={e => setBookForm({ ...bookForm, review: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
              </div>

              {/* ── Translation Section ── */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#d1d5db', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={bookForm.is_translated}
                    onChange={e => setBookForm({ ...bookForm, is_translated: e.target.checked, ...(!e.target.checked ? { original_title: '', original_author: '', translator: '' } : {}) })}
                    style={{ width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                  🌐 This book is a translation
                </label>
              </div>

              {bookForm.is_translated && (
                <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: 16, marginTop: 12 }}>
                  <div className="admin-form-group">
                    <label>Original Title</label>
                    <input className="admin-form-input" placeholder="e.g. O Alquimista" value={bookForm.original_title} onChange={e => setBookForm({ ...bookForm, original_title: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label>Original Author</label>
                    <input className="admin-form-input" placeholder="Author name in original language" value={bookForm.original_author} onChange={e => setBookForm({ ...bookForm, original_author: e.target.value })} />
                  </div>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label>Translator</label>
                    <input className="admin-form-input" placeholder="e.g. Alan R. Clarke" value={bookForm.translator} onChange={e => setBookForm({ ...bookForm, translator: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', borderRadius: 12, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: 15 }}>🔍 Select Existing Book</h4>
              <div className="admin-search-input" style={{ width: '100%', marginBottom: 12 }}>
                <span>🔍</span>
                <input
                  placeholder="Search book by title or author..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setSelectedBook(null); }}
                />
              </div>
              {selectedBook ? (
                <div style={{ padding: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#fff', display: 'block' }}>{selectedBook.title}</strong>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>by {selectedBook.author}</span>
                  </div>
                  <button className="admin-btn-secondary" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setSelectedBook(null)}>Change</button>
                </div>
              ) : (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {searching ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: 8 }}>Searching...</p> : null}
                  {!searching && searchResults.length === 0 && searchQuery.trim() && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', padding: 8 }}>No books found.</p>}
                  {searchResults.map(b => (
                    <div
                      key={b.id}
                      style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                      onClick={() => setSelectedBook(b)}
                      className="admin-nav-item"
                    >
                      <strong style={{ color: '#e5e7eb', fontSize: 14 }}>{b.title}</strong>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>by {b.author}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 20px', borderRadius: 12 }}>
            <h4 style={{ margin: '0 0 16px 0', color: '#fff', fontSize: 15 }}>📦 Copy Details</h4>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Accession No *</label>
                <input className="admin-form-input" placeholder="e.g. မ-၀၁၀၈၅" value={copyForm.accession_no} onChange={e => setCopyForm({ ...copyForm, accession_no: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label>Date Acquired</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input className="admin-form-input" type="date" value={copyForm.date_acquired} onChange={e => setCopyForm({ ...copyForm, date_acquired: e.target.value })} disabled={copyForm.is_date_unknown} style={{ opacity: copyForm.is_date_unknown ? 0.5 : 1 }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#d1d5db' }}>
                    <input type="checkbox" checked={copyForm.is_date_unknown} onChange={e => setCopyForm({ ...copyForm, is_date_unknown: e.target.checked })} style={{ accentColor: '#6366f1', width: 16, height: 16, cursor: 'pointer', margin: 0 }} />
                    Unknown date (for old books)
                  </label>
                </div>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Price</label>
                <input className="admin-form-input" type="number" placeholder="e.g. 15000" value={copyForm.price} onChange={e => setCopyForm({ ...copyForm, price: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label>How Obtained</label>
                <input className="admin-form-input" placeholder="e.g. Purchased, Donated" value={copyForm.how_obtained} onChange={e => setCopyForm({ ...copyForm, how_obtained: e.target.value })} />
              </div>
            </div>

            <div className="admin-form-group" style={{ marginBottom: 0 }}>
              <label>Remark</label>
              <input className="admin-form-input" placeholder="Optional notes…" value={copyForm.remark} onChange={e => setCopyForm({ ...copyForm, remark: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="admin-modal-footer">
          <button className="admin-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="admin-btn-primary" onClick={handleSave} disabled={saving || (mode === 'existing_book' && !selectedBook)}>
            {saving ? 'Saving...' : (mode === 'new_book' ? 'Save Book & Copy' : 'Save Copy')}
          </button>
        </div>
      </div>
    </div>
  );
}
