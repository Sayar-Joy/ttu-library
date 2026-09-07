import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  GraduationCap,
  BookOpen,
  Bell,
  Sparkles,
  User,
  Users,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react';
import { cn } from '../lib/utils';

function Sidebar({ activeNav, sidebarOpen, setSidebarOpen }) {
  const navigate = useNavigate();

  const closeSidebar = () => setSidebarOpen(false);

  const storedUser = sessionStorage.getItem('ttu_user');
  let isLibrarian = false;
  if (storedUser) {
    try {
      const u = JSON.parse(storedUser);
      isLibrarian = u.role === 'librarian';
    } catch (e) {}
  }

  const handleNavClick = (id) => {
    setSidebarOpen(false);

    if (id === 'admin') {
      navigate('/admin');
      return;
    }
    if (id === 'bookshelf') {
      navigate('/bookshelf');
      return;
    }
    if (id === 'theses') {
      navigate('/bookshelf?tab=theses');
      return;
    }
    if (id === 'profile' || id === 'mybooks' || id === 'notifications' || id === 'friends' || id === 'ai') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          navigate(`/${id}/${u.id}`);
          return;
        } catch (e) {
          console.error(e);
        }
      }
      navigate(`/${id}`);
      return;
    }
    if (id === 'logout') {
      sessionStorage.removeItem('ttu_user');
      sessionStorage.removeItem('ttu_session');
      navigate('/');
    }
  };

  const navItems = [
    { id: 'bookshelf', label: 'Bookshelf', icon: LayoutGrid },
    { id: 'theses', label: 'Theses', icon: GraduationCap },
    { id: 'mybooks', label: 'My Books', icon: BookOpen },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'ai', label: 'AI Librarian', icon: Sparkles },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'friends', label: 'Friends', icon: Users },
    ...(isLibrarian ? [{ id: 'admin', label: 'Admin Dashboard', icon: ShieldCheck, highlight: true }] : []),
  ];

  const bottomNavItems = [
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logout', label: 'Logout', icon: LogOut },
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-[90] transition-opacity duration-300 lg:hidden',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 w-64 h-screen bg-sidebar flex flex-col justify-between z-[100] transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Top section */}
        <div className="px-6 pt-8 pb-4">
          {/* Brand */}
          <div className="mb-8 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shadow-md flex-shrink-0 border border-white/20 overflow-hidden">
              <img src="/images/logo.jpg" alt="TTU Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-sidebar-foreground tracking-tight leading-tight truncate">
                TTU Library
              </h1>
              <p className="text-[12px] text-sidebar-foreground/70 mt-0.5 truncate">
                Cozy Study Space
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-1">
            {navItems.map(item => (
              <button
                key={item.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-[15px] font-medium text-left w-full border-none transition-all duration-200',
                  'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                  activeNav === item.id && 'bg-sidebar-accent text-sidebar-accent-foreground',
                  item.highlight && 'mt-2 bg-brand-yellow/15 border border-brand-yellow/25 text-brand-yellow-100 hover:bg-brand-yellow/25',
                  item.highlight && activeNav === item.id && 'bg-brand-yellow/25'
                )}
                onClick={() => handleNavClick(item.id)}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Bottom section */}
        <div className="px-6 pb-8">
          <div className="h-px bg-sidebar-foreground/15 mb-2" />
          {bottomNavItems.map(item => (
            <button
              key={item.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-[15px] font-medium text-left w-full border-none transition-all duration-200',
                'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent'
              )}
              onClick={() => handleNavClick(item.id)}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
