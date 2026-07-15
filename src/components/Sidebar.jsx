import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ activeNav, sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();

  const closeSidebar = () => setSidebarOpen(false);
  
  const handleNavClick = (id) => {
    setSidebarOpen(false);
    
    if (id === 'bookshelf') {
      navigate('/bookshelf');
      return;
    }
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

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`} onClick={closeSidebar} />

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <h1 className="sidebar-title">TTU Library</h1>
            <p className="sidebar-subtitle">Cozy Study Space</p>
          </div>
          <nav className="sidebar-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`sidebar-nav-item ${activeNav === item.id ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          {bottomNavItems.map(item => (
            <button
              key={item.id}
              className="sidebar-nav-item"
              onClick={() => handleNavClick(item.id)}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
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

export default Sidebar;
