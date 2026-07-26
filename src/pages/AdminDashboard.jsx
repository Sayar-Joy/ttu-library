import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API = '/api/admin';

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

  // Overview stats
  const [stats, setStats] = useState({ students: 0, books: 0, copies: 0, activeBorrows: 0, unpaidFines: 0 });

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
        const [usersRes, invRes] = await Promise.all([
          apiFetch(`${API}/users?limit=1`),
          apiFetch(`${API}/inventory?limit=1`),
        ]);
        // We also need books count & active borrows from the health endpoint
        const healthRes = await fetch('/api/health').then(r => r.json());

        setStats({
          students: usersRes.total || 0,
          books: healthRes.books || 0,
          copies: invRes.total || 0,
          activeBorrows: healthRes.transactions || 0,
          unpaidFines: 0,
        });
      } catch { /* silent */ }
    })();
  }, [user, activeTab]);

  const handleLogout = () => {
    sessionStorage.removeItem('ttu_user');
    sessionStorage.removeItem('ttu_session');
    navigate('/');
  };

  if (!user) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Students', icon: '👥' },
    { id: 'catalog', label: 'Catalog', icon: '📚' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'returns', label: 'Return Desk', icon: '🔄' },
    { id: 'fines', label: 'Fines', icon: '💰' },
  ];

  const tabTitles = {
    overview: 'Dashboard Overview',
    users: 'Student Management',
    catalog: 'Book Catalog',
    inventory: 'Physical Inventory',
    returns: 'Return Desk',
    fines: 'Fine Management',
  };

  const tabDescriptions = {
    overview: 'Quick glance at your library\'s vital statistics',
    users: 'View and manage student accounts',
    catalog: 'Manage the bibliographic catalog',
    inventory: 'Track every physical copy on the shelves',
    returns: 'Process book returns at the circulation desk',
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
          {tabs.slice(0, 1).map(t => (
            <button key={t.id} className={`admin-nav-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}>
              <span className="admin-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}

          <div className="admin-nav-section-label">Management</div>
          {tabs.slice(1, 4).map(t => (
            <button key={t.id} className={`admin-nav-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}>
              <span className="admin-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}

          <div className="admin-nav-section-label">Circulation</div>
          {tabs.slice(4).map(t => (
            <button key={t.id} className={`admin-nav-item ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}>
              <span className="admin-nav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-card">
            <div className="admin-user-avatar">{user.avatar_url || 'HL'}</div>
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
            <button className="admin-logout-btn" onClick={handleLogout}>
              ↩ Logout
            </button>
          </div>
        </header>

        <div className="admin-content">
          {activeTab === 'overview' && <OverviewTab stats={stats} setActiveTab={setActiveTab} />}
          {activeTab === 'users' && <UsersTab showToast={showToast} />}
          {activeTab === 'catalog' && <CatalogTab showToast={showToast} />}
          {activeTab === 'inventory' && <InventoryTab showToast={showToast} />}
          {activeTab === 'returns' && <ReturnsTab showToast={showToast} />}
          {activeTab === 'fines' && <FinesTab showToast={showToast} />}
        </div>
      </main>

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
function OverviewTab({ stats, setActiveTab }) {
  return (
    <>
      <div className="admin-stats-grid">
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
          <button className="admin-btn-primary" onClick={() => setActiveTab('catalog')}>+ Add Book</button>
          <button className="admin-btn-primary" onClick={() => setActiveTab('inventory')}>+ Add Copy</button>
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
                        {u.avatar_url || '??'}
                      </div>
                      {u.name}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{u.student_id || '—'}</td>
                    <td>{u.email}</td>
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

  const handleMarkPaid = async (txId) => {
    try {
      await apiFetch(`${API}/fines/${txId}/pay`, { method: 'PATCH' });
      showToast('Fine marked as paid!');
      // Refresh — call parent
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <>
      <button className="admin-back-btn" onClick={onBack}>← Back to Students</button>

      <div className="admin-user-detail">
        {/* Profile */}
        <div className="admin-user-detail-card">
          <h4>👤 Student Profile</h4>
          <div className="admin-detail-field"><span className="admin-detail-label">Name</span><span className="admin-detail-value">{user.name}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Student ID</span><span className="admin-detail-value" style={{ fontFamily: 'monospace' }}>{user.student_id || '—'}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Email</span><span className="admin-detail-value">{user.email}</span></div>
          <div className="admin-detail-field"><span className="admin-detail-label">Joined</span><span className="admin-detail-value">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>
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
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// CATALOG TAB (Add Books)
// ═══════════════════════════════════════════════════════════════
function CatalogTab({ showToast }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', author: '', isbn: '', publisher: '', edition: '', publication_year: '', class_no: '', cover_url: '', category: '', review: '', total_pages: '', size: '', place_of_publication: '', is_translated: false, original_title: '', original_author: '', translator: '' });
  const [uploadingCover, setUploadingCover] = useState(false);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/books?search=${encodeURIComponent(search)}`).then(r => r.json());
      setBooks(data.books || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleAdd = async () => {
    if (!form.title.trim() || !form.author.trim()) { showToast('Title and Author are required', 'error'); return; }
    setSaving(true);
    try {
      const data = await apiFetch(`${API}/books`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      showToast(data.message || 'Book added!');
      setShowModal(false);
      setForm({ title: '', author: '', isbn: '', publisher: '', edition: '', publication_year: '', class_no: '', cover_url: '', category: '', review: '', total_pages: '', size: '', place_of_publication: '', is_translated: false, original_title: '', original_author: '', translator: '' });
      fetchBooks();
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
      
      setForm({ ...form, cover_url: data.data.publicUrl });
      showToast('Cover uploaded successfully!');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setUploadingCover(false);
  };

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
            <button className="admin-btn-primary" onClick={() => setShowModal(true)}>+ Add Book</button>
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

      {/* Add Book Modal */}
      {showModal && (
        <div className="admin-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>📚 Add New Book</h3>
              <button className="admin-modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-group">
                <label>Title *</label>
                <input className="admin-form-input" placeholder="e.g. The Great Gatsby" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label>Author *</label>
                <input className="admin-form-input" placeholder="e.g. F. Scott Fitzgerald" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>ISBN</label>
                  <input className="admin-form-input" placeholder="e.g. 978-0-74-327356-5" value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Class No.</label>
                  <input className="admin-form-input" placeholder="e.g. FIC-001" value={form.class_no} onChange={e => setForm({ ...form, class_no: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Publisher</label>
                  <input className="admin-form-input" placeholder="e.g. Scribner" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Edition</label>
                  <input className="admin-form-input" placeholder="e.g. 1st" value={form.edition} onChange={e => setForm({ ...form, edition: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Publication Year</label>
                  <input className="admin-form-input" type="number" placeholder="e.g. 2024" value={form.publication_year} onChange={e => setForm({ ...form, publication_year: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Cover URL</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="admin-form-input" placeholder="https://…" value={form.cover_url} onChange={e => setForm({ ...form, cover_url: e.target.value })} style={{ flex: 1 }} />
                    <label className="admin-btn-secondary" style={{ cursor: 'pointer', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {uploadingCover ? '⏳' : '📁'} Upload
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} disabled={uploadingCover} />
                    </label>
                  </div>
                </div>
              </div>
              <div className="admin-form-group">
                <label>Category</label>
                <input className="admin-form-input" placeholder="e.g. Fiction / Thriller" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label>Place of Publication</label>
                <input className="admin-form-input" placeholder="e.g. New York, USA" value={form.place_of_publication} onChange={e => setForm({ ...form, place_of_publication: e.target.value })} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Total Pages</label>
                  <input className="admin-form-input" type="number" placeholder="e.g. 320" value={form.total_pages} onChange={e => setForm({ ...form, total_pages: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Size</label>
                  <input className="admin-form-input" placeholder="e.g. 21 × 14 cm" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Review</label>
                <textarea className="admin-form-input" placeholder="Brief review or description…" value={form.review} onChange={e => setForm({ ...form, review: e.target.value })} rows={3} style={{ resize: 'vertical' }} />
              </div>

              {/* ── Translation Section ── */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#d1d5db', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={form.is_translated}
                    onChange={e => setForm({ ...form, is_translated: e.target.checked, ...(!e.target.checked ? { original_title: '', original_author: '', translator: '' } : {}) })}
                    style={{ width: 18, height: 18, accentColor: '#6366f1', cursor: 'pointer' }}
                  />
                  🌐 This book is a translation
                </label>
              </div>

              {form.is_translated && (
                <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 10, padding: 16, marginTop: 12 }}>
                  <div className="admin-form-group">
                    <label>Original Title</label>
                    <input className="admin-form-input" placeholder="e.g. O Alquimista" value={form.original_title} onChange={e => setForm({ ...form, original_title: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label>Original Author</label>
                    <input className="admin-form-input" placeholder="Author name in original language" value={form.original_author} onChange={e => setForm({ ...form, original_author: e.target.value })} />
                  </div>
                  <div className="admin-form-group" style={{ marginBottom: 0 }}>
                    <label>Translator</label>
                    <input className="admin-form-input" placeholder="e.g. Alan R. Clarke" value={form.translator} onChange={e => setForm({ ...form, translator: e.target.value })} />
                  </div>
                </div>
              )}
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="admin-btn-primary" onClick={handleAdd} disabled={saving}>{saving ? 'Saving…' : 'Add Book'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// INVENTORY TAB (Physical Copies)
// ═══════════════════════════════════════════════════════════════
function InventoryTab({ showToast }) {
  const [copies, setCopies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [addForm, setAddForm] = useState({ accession_no: '', book_id: '', date_acquired: '', price: '', how_obtained: '', remark: '' });

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

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const handleAddCopy = async () => {
    if (!addForm.accession_no.trim() || !addForm.book_id.trim()) { showToast('Accession No and Book ID required', 'error'); return; }
    setSaving(true);
    try {
      const data = await apiFetch(`${API}/physical-copies`, {
        method: 'POST',
        body: JSON.stringify(addForm),
      });
      showToast(data.message || 'Copy added!');
      setShowAddModal(false);
      setAddForm({ accession_no: '', book_id: '', date_acquired: '', price: '', how_obtained: '', remark: '' });
      fetchInventory();
    } catch (err) { showToast(err.message, 'error'); }
    setSaving(false);
  };

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
            <button className="admin-btn-primary" onClick={() => setShowAddModal(true)}>+ Add Copy</button>
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

      {/* Add Copy Modal */}
      {showAddModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3>📦 Add Physical Copy</h3>
              <button className="admin-modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Accession No *</label>
                  <input className="admin-form-input" placeholder="e.g. ACC-0001" value={addForm.accession_no} onChange={e => setAddForm({ ...addForm, accession_no: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Book ID (UUID) *</label>
                  <input className="admin-form-input" placeholder="Paste book UUID" value={addForm.book_id} onChange={e => setAddForm({ ...addForm, book_id: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Date Acquired</label>
                  <input className="admin-form-input" type="date" value={addForm.date_acquired} onChange={e => setAddForm({ ...addForm, date_acquired: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Price</label>
                  <input className="admin-form-input" type="number" placeholder="e.g. 15000" value={addForm.price} onChange={e => setAddForm({ ...addForm, price: e.target.value })} />
                </div>
              </div>
              <div className="admin-form-group">
                <label>How Obtained</label>
                <input className="admin-form-input" placeholder="e.g. Purchased, Donated" value={addForm.how_obtained} onChange={e => setAddForm({ ...addForm, how_obtained: e.target.value })} />
              </div>
              <div className="admin-form-group">
                <label>Remark</label>
                <input className="admin-form-input" placeholder="Optional notes…" value={addForm.remark} onChange={e => setAddForm({ ...addForm, remark: e.target.value })} />
              </div>
            </div>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="admin-btn-primary" onClick={handleAddCopy} disabled={saving}>{saving ? 'Adding…' : 'Add Copy'}</button>
            </div>
          </div>
        </div>
      )}

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
// RETURNS TAB (Process returns by accession number)
// ═══════════════════════════════════════════════════════════════
function ReturnsTab({ showToast }) {
  const [accessionNo, setAccessionNo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleReturn = async () => {
    if (!accessionNo.trim()) { showToast('Enter an accession number', 'error'); return; }
    setProcessing(true);
    setResult(null);
    try {
      const data = await apiFetch(`${API}/returns/${encodeURIComponent(accessionNo.trim())}`, { method: 'POST' });
      setResult(data);
      showToast(data.message || 'Return processed!');
      setAccessionNo('');
    } catch (err) {
      showToast(err.message, 'error');
    }
    setProcessing(false);
  };

  return (
    <>
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h3>🔄 Process Book Return</h3>
        </div>
        <div style={{ padding: '24px 22px' }}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13.5, marginBottom: 18 }}>
            Scan or type the <strong style={{ color: '#d1d5db' }}>accession number</strong> from the physical book to process its return.
          </p>
          <div className="admin-return-desk">
            <div className="admin-return-input-group">
              <input
                placeholder="Enter accession number (e.g. ACC-0001)"
                value={accessionNo}
                onChange={e => setAccessionNo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReturn()}
                autoFocus
              />
              <button className="admin-btn-primary" onClick={handleReturn} disabled={processing}
                style={{ padding: '14px 28px', fontSize: 14 }}>
                {processing ? 'Processing…' : '📥 Process Return'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="admin-panel admin-return-result">
          <div className="admin-panel-header">
            <h3>{result.transaction?.fine_amount > 0 ? '⚠️ Overdue Return' : '✅ Returned Successfully'}</h3>
          </div>
          <div style={{ padding: '20px 22px' }}>
            <div className="admin-return-card">
              <div className="admin-return-field">
                <label>Book</label>
                <p>{result.book?.title || '—'}</p>
              </div>
              <div className="admin-return-field">
                <label>Author</label>
                <p>{result.book?.author || '—'}</p>
              </div>
              <div className="admin-return-field">
                <label>Borrower</label>
                <p>{result.borrower?.name || '—'}</p>
              </div>
              <div className="admin-return-field">
                <label>Borrow Date</label>
                <p>{result.transaction?.borrow_date ? new Date(result.transaction.borrow_date).toLocaleDateString() : '—'}</p>
              </div>
              <div className="admin-return-field">
                <label>Due Date</label>
                <p>{result.transaction?.due_date ? new Date(result.transaction.due_date).toLocaleDateString() : '—'}</p>
              </div>
              <div className="admin-return-field">
                <label>Days Overdue</label>
                <p className={result.transaction?.days_overdue > 0 ? 'fine-amount' : 'no-fine'}>
                  {result.transaction?.days_overdue > 0 ? `${result.transaction.days_overdue} days` : 'On time ✓'}
                </p>
              </div>
              <div className="admin-return-field">
                <label>Fine Amount</label>
                <p className={result.transaction?.fine_amount > 0 ? 'fine-amount' : 'no-fine'}>
                  {result.transaction?.fine_amount > 0 ? `${result.transaction.fine_amount} kyats` : 'No fine'}
                </p>
              </div>
              <div className="admin-return-field">
                <label>Fine Status</label>
                <p><span className={`admin-badge ${result.transaction?.fine_status}`}>{result.transaction?.fine_status}</span></p>
              </div>
              <div className="admin-return-field">
                <label>Student ID</label>
                <p style={{ fontFamily: 'monospace' }}>{result.borrower?.student_id || '—'}</p>
              </div>
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
