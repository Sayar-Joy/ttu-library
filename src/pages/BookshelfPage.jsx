import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './BookshelfPage.css';
import { useNotifications } from '../hooks/useNotifications';
import Sidebar from '../components/Sidebar';
import MembershipModal from '../components/MembershipModal';
import supabase from '../lib/supabase';
import { cn } from '../lib/utils';
import { Search, HelpCircle, Bell, ChevronDown, ChevronLeft, ChevronRight, Loader2, AlertCircle, Star, GraduationCap, X, Menu } from 'lucide-react';
import {
  DDC_CLASSES,
  THESIS_CLASS,
  DDC_COLORS,
  DDC_TEXT_COLORS,
  getBookDdcClass,
  matchBookSearch,
  formatClassNoDual
} from '../lib/ddc';

function BookshelfPage() {
  const [activeNav, setActiveNav] = useState('bookshelf');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedAvailability, setSelectedAvailability] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
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
    if (id === 'profile' || id === 'mybooks' || id === 'notifications' || id === 'friends' || id === 'ai') {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        const u = JSON.parse(stored);
        navigate(`/${id}/${u.id}`);
      } else {
        navigate(`/${id}`);
      }
      return;
    }
    if (id === 'logout') {
      supabase.auth.signOut().catch(() => {});
      sessionStorage.removeItem('ttu_user');
      sessionStorage.removeItem('ttu_session');
      navigate('/');
    }
  };

  // Get logged-in user and handle OAuth session synchronization
  useEffect(() => {
    async function initUserSession() {
      // First check sessionStorage
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        const u = JSON.parse(stored);
        setUserId(u.id);
        setUser(u);
      }

      // Check active Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const syncRes = await fetch('/api/auth/oauth-sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
              avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null
            })
          });
          const syncData = await syncRes.json();
          if (syncData.success && syncData.user) {
            sessionStorage.setItem('ttu_user', JSON.stringify(syncData.user));
            sessionStorage.setItem('ttu_session', JSON.stringify(session));
            setUserId(syncData.user.id);
            setUser(syncData.user);
          }
        } catch (err) {
          console.error('OAuth sync error in Bookshelf:', err);
        }
      }
    }

    initUserSession();
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

  // Filter and sort books with bidirectional English/Burmese DDC class support
  const filteredBooks = books
    .filter(book => {
      if (selectedGenre) {
        const ddc = getBookDdcClass(book);
        const matches =
          book.genre === selectedGenre ||
          book.category === selectedGenre ||
          ddc.name === selectedGenre ||
          ddc.code === selectedGenre ||
          ddc.burmeseCode === selectedGenre ||
          (selectedGenre === THESIS_CLASS.name && (book.isThesis || book.genre === 'Thesis'));
        if (!matches) return false;
      }
      if (selectedAvailability === 'available' && book.availableCopies <= 0) return false;
      if (selectedAvailability === 'coming-soon' && book.availableCopies <= 0) return false;
      if (searchQuery && !matchBookSearch(book, searchQuery)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.year || 0) - (a.year || 0);
      if (sortBy === 'oldest') return (a.year || 0) - (b.year || 0);
      if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'author') return (a.author || '').localeCompare(b.author || '');
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
  }, [selectedGenre, selectedAvailability, sortBy, searchQuery]);

  const authors = [...new Set(books.map(b => b.author).filter(Boolean))].sort().slice(0, 8);

  // The categories are strictly the 10 DDC Main Classes (+ Thesis)
  const ddcCategories = DDC_CLASSES;

  const sortOptions = [
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'title', label: 'Title A-Z' },
    { id: 'author', label: 'Author A-Z' },
  ];

  const currentSortLabel = sortOptions.find(o => o.id === sortBy)?.label || 'Newest First';

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
      <div className="flex min-h-screen bg-transparent">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground text-sm">Loading bookshelf...</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="flex min-h-screen bg-transparent">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-10">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
            <p className="mt-4 text-destructive text-base font-semibold">Failed to load bookshelf</p>
            <p className="mt-1 text-muted-foreground text-sm">{error}</p>
            <button onClick={() => window.location.reload()} className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-transparent font-sans">
      <Sidebar activeNav={activeNav} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content Area */}
      <div className="ml-0 lg:ml-64 flex-1 flex flex-col overflow-y-auto max-h-screen">
        {/* Header */}
        <header className="flex justify-between items-center px-6 lg:px-8 py-4 bg-background/80 backdrop-blur-sm border-b border-border sticky top-0 z-50">
          <div className="flex items-center gap-3 flex-1">
            <button className="lg:hidden p-1 bg-transparent border-none" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
              {sidebarOpen ? <X className="w-6 h-6 text-foreground" /> : <Menu className="w-6 h-6 text-foreground" />}
            </button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search class no (e.g. 620 / ၆၂၀), title, author..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-10 pr-9 border border-border rounded-full text-sm text-foreground bg-background outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="p-2 bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors relative" onClick={() => userId && navigate(`/notifications/${userId}`)} title="Notifications">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-[18px] h-[18px] flex items-center justify-center text-[10px] font-semibold border-2 border-background">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <div className="cursor-pointer" onClick={() => userId && navigate(`/profile/${userId}`)}>
              {user?.avatar_url && user.avatar_url.length > 2 ? (
                <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center font-bold text-sm text-primary shadow-sm">
                  {user?.avatar_url || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'AS')}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Membership Status Banner */}
        {user && user.role === 'student' && user.membership_status !== 'approved' && (
          <div className={cn(
            "mx-4 lg:mx-6 mt-4 px-5 py-3.5 rounded-xl flex items-center justify-between flex-wrap gap-3 border",
            user.membership_status === 'pending' && "bg-amber-50 border-amber-200",
            user.membership_status === 'rejected' && "bg-red-50 border-red-200",
            !['pending', 'rejected'].includes(user.membership_status) && "bg-primary/5 border-primary/15"
          )}>
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {user.membership_status === 'pending' ? '⏳' : user.membership_status === 'rejected' ? '⚠️' : '🪪'}
              </span>
              <div>
                <div className="font-semibold text-sm text-foreground">
                  {user.membership_status === 'pending'
                    ? 'Library Membership Application Pending'
                    : user.membership_status === 'rejected'
                    ? 'Membership Application Needs Attention'
                    : 'Library Membership Required to Borrow Books'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {user.membership_status === 'pending'
                    ? 'Your application is under review by the librarian. You will be able to borrow books once approved.'
                    : user.membership_status === 'rejected'
                    ? 'Your application was rejected. Please review librarian notes and resubmit.'
                    : 'Submit your student membership form to enable physical book checkouts.'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsMembershipModalOpen(true)}
              className={cn(
                "px-4 py-2 text-[13px] font-semibold rounded-lg border-none text-white shadow-sm transition-opacity hover:opacity-90",
                user.membership_status === 'pending' ? 'bg-amber-600' : 'bg-primary'
              )}
            >
              {user.membership_status === 'pending' ? 'View Status' : user.membership_status === 'rejected' ? 'Fix Application' : 'Apply for Membership'}
            </button>
          </div>
        )}

        {/* Bookshelf Body — Recommended, Categories, Discover Grid */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-8">
          
          {/* ─── Recommended for You ─── */}
          {recommended.length > 0 && (
            <section className="bg-muted/30 border border-border rounded-2xl p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground tracking-tight">Recommended for You</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Curated selections based on your reading preferences</p>
                </div>
                <button
                  className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  onClick={() => {}}
                >
                  See All
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {recommended.map(book => (
                  <Link
                    to={`/book/${book.id}`}
                    key={book.id}
                    className="group flex-shrink-0 w-36 sm:w-40 flex flex-col bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="aspect-[2/3] relative bg-muted overflow-hidden">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <BookCoverSVG title={book.title} color={book.cover} />
                      )}
                      <div className="absolute top-2 right-2 bg-zinc-900/80 backdrop-blur-xs text-brand-yellow px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border border-zinc-700/50">
                        <Star className="w-2.5 h-2.5 fill-brand-yellow" />
                        <span>{(4.5 + Math.random() * 0.3).toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <h4 className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {book.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {book.author}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ─── Categories Pills ─── */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Categories
                </h3>
              </div>
              {selectedGenre && (
                <button
                  onClick={() => setSelectedGenre(null)}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Reset Category
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                  selectedGenre === null
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
                )}
                onClick={() => setSelectedGenre(null)}
              >
                All Categories
              </button>
              {ddcCategories.map(cat => {
                const isSelected = selectedGenre === cat.name;
                return (
                  <button
                    key={cat.code}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
                    )}
                    onClick={() => setSelectedGenre(isSelected ? null : cat.name)}
                  >
                    {cat.name}
                  </button>
                );
              })}
              <button
                key={THESIS_CLASS.code}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                  selectedGenre === THESIS_CLASS.name
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs font-semibold"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
                )}
                onClick={() => setSelectedGenre(selectedGenre === THESIS_CLASS.name ? null : THESIS_CLASS.name)}
              >
                Thesis
              </button>
            </div>
          </section>

          {/* ─── Discover Grid Section ─── */}
          <section className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Discover Library</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Showing {filteredBooks.length} available resources</p>
              </div>

              {/* Sort selector */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sort:</span>
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-xs"
                  >
                    <span>{currentSortLabel}</span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", showSortMenu && "rotate-180")} />
                  </button>
                </div>

                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-card border border-border rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                    {sortOptions.map(opt => (
                      <button
                        key={opt.id}
                        className={cn(
                          "w-full text-left px-3.5 py-2 text-xs transition-colors flex items-center justify-between",
                          sortBy === opt.id
                            ? "font-semibold text-primary bg-primary/5"
                            : "text-foreground hover:bg-muted/60"
                        )}
                        onClick={() => {
                          setSortBy(opt.id);
                          setShowSortMenu(false);
                        }}
                      >
                        <span>{opt.label}</span>
                        {sortBy === opt.id && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Books Grid */}
            {paginatedBooks.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                {paginatedBooks.map(book => {
                  const isThesisBook = book.isThesis || book.genre === 'Thesis' || book.category === 'Thesis';
                  const ddcClass = getBookDdcClass(book);
                  return (
                    <Link
                      to={`/book/${book.id}`}
                      key={book.id}
                      className={cn(
                        "group flex flex-col bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200",
                        isThesisBook && "border-emerald-200/80 hover:border-emerald-500/50"
                      )}
                    >
                      <div className="aspect-[2/3] relative bg-muted overflow-hidden">
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : isThesisBook ? (
                          <div className="w-full h-full bg-gradient-to-br from-slate-900 via-primary to-slate-950 flex flex-col items-center justify-center p-3 text-white text-center">
                            <GraduationCap className="w-8 h-8 text-emerald-400 mb-1.5" />
                            <span className="text-[10px] font-bold text-sky-300 tracking-wider">TTU THESIS</span>
                            <span className="text-[9px] text-slate-300 line-clamp-1 mt-0.5">{book.major}</span>
                          </div>
                        ) : (
                          <BookCoverSVG title={book.title} color={book.cover} />
                        )}

                        {/* DDC Genre Badge */}
                        <span
                          className={cn(
                            "absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold border backdrop-blur-xs max-w-[85%] truncate",
                            isThesisBook 
                              ? "bg-emerald-50/95 text-emerald-700 border-emerald-200" 
                              : "border-border shadow-2xs"
                          )}
                          style={!isThesisBook ? {
                            backgroundColor: `${ddcClass.color}F2`,
                            color: ddcClass.textColor,
                            borderColor: ddcClass.borderColor
                          } : undefined}
                          title={isThesisBook ? 'Thesis' : ddcClass.name}
                        >
                          {isThesisBook ? 'Thesis' : ddcClass.name}
                        </span>

                        {isThesisBook && (
                          <span className="absolute top-2 right-2 bg-slate-950/85 text-sky-300 text-[9px] font-bold px-1.5 py-0.5 rounded border border-sky-400/30 backdrop-blur-xs">
                            10p Preview
                          </span>
                        )}
                      </div>

                      <div className="p-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-xs font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {book.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {book.author}
                          </p>
                        </div>

                        {isThesisBook ? (
                          <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-border/60">
                            {book.major && (
                              <span className="text-[9px] font-medium bg-sky-50 text-sky-700 border border-sky-200/60 px-1.5 py-0.5 rounded">
                                {book.major}
                              </span>
                            )}
                            {book.student_roll && (
                              <span className="text-[9px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                                {book.student_roll}
                              </span>
                            )}
                            {book.year && (
                              <span className="text-[9px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded">
                                {book.year}
                              </span>
                            )}
                          </div>
                        ) : (
                          book.class_no && (
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50 text-[10px]">
                              <span className="text-muted-foreground font-medium text-[10px]">Class:</span>
                              <span className="font-mono font-semibold text-foreground px-1.5 py-0.2 rounded bg-muted border border-border">
                                {formatClassNoDual(book.class_no)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-muted/20 border border-dashed border-border rounded-2xl">
                <p className="text-sm font-medium text-muted-foreground mb-3">No books match your selected filters.</p>
                <button
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  onClick={() => { setSelectedGenre(null); setSelectedAvailability(null); }}
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* ─── Pagination ─── */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1.5 pt-4 pb-8">
                <button
                  className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {getPageNumbers().map((page, i) =>
                  page === '...' ? (
                    <span key={`dots-${i}`} className="px-1.5 text-xs text-muted-foreground">...</span>
                  ) : (
                    <button
                      key={page}
                      className={cn(
                        "w-8 h-8 rounded-lg text-xs font-semibold transition-all border",
                        currentPage === page
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      )}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  className="p-2 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-auto border-t border-border bg-card px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
            <span className="font-bold text-foreground">TTU Library</span>
            <span className="hidden sm:inline text-border">•</span>
            <span>© 2026 TTU IT Department. Academic Sanctuary.</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="mailto:library@ttu.edu.mm" className="hover:text-primary transition-colors">Contact Librarian</a>
          </div>
        </footer>
      </div>

      {/* Membership Modal */}
      {user && (
        <MembershipModal
          isOpen={isMembershipModalOpen}
          onClose={() => setIsMembershipModalOpen(false)}
          user={user}
          onSuccess={(updatedUser) => {
            setUser(updatedUser);
          }}
        />
      )}
    </div>
  );
}

/* ─── Book Cover SVG ─── */
function BookCoverSVG({ title, color }) {
  const words = (title || '').split(' ');
  const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');
  const bgColor = color || '#1e293b';

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-3 text-white text-center relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
      <div className="relative z-10 flex flex-col items-center justify-center gap-1">
        <span className="text-[11px] font-bold leading-tight line-clamp-2 px-1 text-white/95 drop-shadow-xs">
          {line1}
        </span>
        {line2 && (
          <span className="text-[10px] font-medium leading-tight line-clamp-2 px-1 text-white/80">
            {line2}
          </span>
        )}
      </div>
    </div>
  );
}

/* Icons now provided by lucide-react */

export default BookshelfPage;