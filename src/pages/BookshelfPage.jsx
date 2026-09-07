import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import './BookshelfPage.css';
import { useNotifications } from '../hooks/useNotifications';
import Sidebar from '../components/Sidebar';
import MembershipModal from '../components/MembershipModal';
import ThesisPdfViewer from '../components/ThesisPdfViewer';
import supabase from '../lib/supabase';
import { cn } from '../lib/utils';
import {
  Search,
  HelpCircle,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Star,
  GraduationCap,
  BookOpen,
  X,
  Menu,
  FileText,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  Eye
} from 'lucide-react';
import {
  DDC_CLASSES,
  getBookDdcClass,
  matchBookSearch,
  formatClassNoDual
} from '../lib/ddc';
import { TTU_MAJORS, normalizeMajor, getMajorInfo } from '../lib/majors';

function BookshelfPage({ defaultTab = 'books' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { major: paramMajor } = useParams();
  const navigate = useNavigate();

  // Primary Tabs: 'books' or 'theses'
  const tabFromUrl = searchParams.get('tab');
  const initialTab = tabFromUrl === 'theses' || defaultTab === 'theses' ? 'theses' : 'books';
  const [activeCatalogTab, setActiveCatalogTab] = useState(initialTab);
  const [activeNav, setActiveNav] = useState(initialTab === 'theses' ? 'theses' : 'bookshelf');

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [books, setBooks] = useState([]);
  const [theses, setTheses] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Books tab filters
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedAvailability, setSelectedAvailability] = useState(null);

  // Theses tab filters: 9 majors to choose
  const initialMajor = paramMajor ? normalizeMajor(paramMajor) : (searchParams.get('major') || 'all');
  const [selectedMajor, setSelectedMajor] = useState(initialMajor);
  const [selectedYear, setSelectedYear] = useState('all');
  const [previewThesis, setPreviewThesis] = useState(null);

  // Shared Search & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [userId, setUserId] = useState(null);
  const [user, setUser] = useState(null);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const itemsPerPage = 16;

  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl === 'theses' || defaultTab === 'theses') {
      setActiveCatalogTab('theses');
      setActiveNav('theses');
    } else {
      setActiveCatalogTab('books');
      setActiveNav('bookshelf');
    }
  }, [tabFromUrl, defaultTab]);

  // Sync major parameter if provided in URL route
  useEffect(() => {
    if (paramMajor) {
      setSelectedMajor(normalizeMajor(paramMajor));
    }
  }, [paramMajor]);

  const switchCatalogTab = (tab) => {
    setActiveCatalogTab(tab);
    setActiveNav(tab === 'theses' ? 'theses' : 'bookshelf');
    setCurrentPage(1);
    setSearchParams(prev => {
      const p = new URLSearchParams(prev);
      if (tab === 'theses') {
        p.set('tab', 'theses');
      } else {
        p.delete('tab');
        p.delete('major');
      }
      return p;
    });
  };

  // 🔔 Notifications
  const { unreadCount } = useNotifications(userId, {
    enabled: !!userId,
    onNotification: (notification) => {
      alert(`📬 ${notification.title}\n\n${notification.message}`);
    }
  });

  // Init User Session
  useEffect(() => {
    async function initUserSession() {
      const stored = sessionStorage.getItem('ttu_user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setUserId(u.id);
          setUser(u);
        } catch (e) {}
      }

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

  // Fetch Books and Theses
  useEffect(() => {
    setLoading(true);

    const fetchBooks = fetch('/api/books')
      .then(res => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      });

    const fetchTheses = fetch('/api/theses')
      .then(res => {
        if (!res.ok) return { theses: [] };
        return res.json();
      })
      .catch(() => ({ theses: [] }));

    Promise.all([fetchBooks, fetchTheses])
      .then(([booksData, thesesData]) => {
        setBooks(booksData.books || []);
        setTheses(thesesData.theses || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load bookshelf data:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Recommendations for logged-in user
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/dashboard/${userId}`)
      .then(res => res.ok ? res.json() : { recommended: [] })
      .then(data => {
        setRecommended(data.recommended || []);
      })
      .catch(() => {});
  }, [userId]);

  // Separate regular books (excluding theses from the Books tab)
  const regularBooks = useMemo(() => {
    return books.filter(b => !b.isThesis && b.genre !== 'Thesis' && b.category !== 'Thesis');
  }, [books]);

  // Combined and enriched theses list
  const combinedTheses = useMemo(() => {
    if (theses && theses.length > 0) {
      return theses;
    }
    // Fallback to formatted theses from books payload if /api/theses was empty
    return books
      .filter(b => b.isThesis || b.genre === 'Thesis' || b.category === 'Thesis')
      .map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        student_roll: b.student_roll || (b.isbn && b.isbn.startsWith('Roll: ') ? b.isbn.replace('Roll: ', '') : ''),
        major: b.major || b.class_no || 'Engineering',
        year: b.year || b.publication_year || 2025,
        supervisor: b.supervisor || 'Faculty Advisor',
        abstract: b.description || b.review || '',
        cover_url: b.cover_url,
        pdf_url: b.pdf_url,
        preview_pdf_url: b.preview_pdf_url,
        total_pages: b.total_pages || 10,
        preview_pages_count: b.preview_pages_count || 10,
      }));
  }, [theses, books]);

  // Available graduation years from theses
  const availableYears = useMemo(() => {
    const yearsSet = new Set(combinedTheses.map(t => Number(t.year)).filter(Boolean));
    return ['all', ...Array.from(yearsSet).sort((a, b) => b - a)];
  }, [combinedTheses]);

  // Major counts for badge displays
  const majorCounts = useMemo(() => {
    const counts = {};
    TTU_MAJORS.forEach(m => { counts[m.code] = 0; });
    combinedTheses.forEach(t => {
      const code = normalizeMajor(t.major);
      if (code && counts[code] !== undefined) {
        counts[code] += 1;
      }
    });
    return counts;
  }, [combinedTheses]);

  // Filtered Books (for 'books' tab)
  const filteredBooks = useMemo(() => {
    return regularBooks
      .filter(book => {
        if (selectedGenre) {
          const ddc = getBookDdcClass(book);
          const matches =
            book.genre === selectedGenre ||
            book.category === selectedGenre ||
            ddc.name === selectedGenre ||
            ddc.code === selectedGenre ||
            ddc.burmeseCode === selectedGenre;
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
  }, [regularBooks, selectedGenre, selectedAvailability, searchQuery, sortBy]);

  // Filtered Theses (for 'theses' tab)
  const filteredTheses = useMemo(() => {
    return combinedTheses
      .filter(thesis => {
        // Major filter
        if (selectedMajor && selectedMajor !== 'all') {
          const tCode = normalizeMajor(thesis.major);
          if (tCode !== selectedMajor) return false;
        }

        // Year filter
        if (selectedYear && selectedYear !== 'all') {
          if (String(thesis.year) !== String(selectedYear)) return false;
        }

        // Search query
        if (searchQuery && searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const title = (thesis.title || '').toLowerCase();
          const author = (thesis.author || '').toLowerCase();
          const roll = (thesis.student_roll || '').toLowerCase();
          const supervisor = (thesis.supervisor || '').toLowerCase();
          const major = (thesis.major || '').toLowerCase();
          const code = (normalizeMajor(thesis.major) || '').toLowerCase();

          const matches =
            title.includes(q) ||
            author.includes(q) ||
            roll.includes(q) ||
            supervisor.includes(q) ||
            major.includes(q) ||
            code.includes(q);

          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.year || 0) - (a.year || 0);
        if (sortBy === 'oldest') return (a.year || 0) - (b.year || 0);
        if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '');
        if (sortBy === 'author') return (a.author || '').localeCompare(b.author || '');
        return 0;
      });
  }, [combinedTheses, selectedMajor, selectedYear, searchQuery, sortBy]);

  // Reset pagination when active filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCatalogTab, selectedGenre, selectedMajor, selectedYear, selectedAvailability, sortBy, searchQuery]);

  const activeItems = activeCatalogTab === 'books' ? filteredBooks : filteredTheses;
  const totalPages = Math.ceil(activeItems.length / itemsPerPage);
  const paginatedItems = activeItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const sortOptions = [
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'title', label: 'Title A-Z' },
    { id: 'author', label: 'Author A-Z' },
  ];
  const currentSortLabel = sortOptions.find(o => o.id === sortBy)?.label || 'Newest First';

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
            <p className="mt-4 text-muted-foreground text-sm font-medium">Loading TTU Library Catalog...</p>
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
            <p className="mt-4 text-destructive text-base font-semibold">Failed to load library catalog</p>
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
                placeholder={
                  activeCatalogTab === 'theses'
                    ? "Search thesis title, student roll (e.g. 5MC-08), author, supervisor..."
                    : "Search class no (e.g. 620 / ၆၂၀), title, author..."
                }
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
            <button className="p-2 bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors" title="Help">
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
            <div className="cursor-pointer" onClick={() => userId && navigate(`/profile/${userId}`)} title="My Profile">
              {user?.avatar_url && user.avatar_url.length > 2 ? (
                <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted border-2 border-background flex items-center justify-center font-bold text-sm text-primary shadow-sm">
                  {user?.avatar_url || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'TT')}
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
                    : 'Library Membership Required to Borrow Physical Books'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {user.membership_status === 'pending'
                    ? 'Your application is under review by the librarian. You can preview all thesis papers digitally.'
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

        {/* Main Body */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto flex flex-col gap-6">

          {/* ─── PRIMARY CATALOG TABS: BOOKS vs THESES ─── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
            <div className="flex items-center gap-1.5 p-1 bg-muted/80 backdrop-blur-xs rounded-2xl border border-border w-fit shadow-2xs">
              {/* Books Tab Button */}
              <button
                type="button"
                onClick={() => switchCatalogTab('books')}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border",
                  activeCatalogTab === 'books'
                    ? "bg-background text-foreground border-border shadow-xs scale-[1.01]"
                    : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-background/50"
                )}
              >
                <BookOpen className={cn("w-4 h-4", activeCatalogTab === 'books' ? "text-primary" : "text-muted-foreground")} />
                <span>Books</span>
                <span className={cn(
                  "text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors",
                  activeCatalogTab === 'books'
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {regularBooks.length}
                </span>
              </button>

              {/* Theses Tab Button */}
              <button
                type="button"
                onClick={() => switchCatalogTab('theses')}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border",
                  activeCatalogTab === 'theses'
                    ? "bg-background text-emerald-800 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-700/60 shadow-xs scale-[1.01]"
                    : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-background/50"
                )}
              >
                <GraduationCap className={cn("w-4 h-4", activeCatalogTab === 'theses' ? "text-emerald-600" : "text-muted-foreground")} />
                <span>Theses</span>
                <span className={cn(
                  "text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors",
                  activeCatalogTab === 'theses'
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                )}>
                  {combinedTheses.length}
                </span>
              </button>
            </div>

            {/* Quick subtitle / department note */}
            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              {activeCatalogTab === 'books' ? (
                <span>Official Dewey Decimal Classification (DDC 000–900)</span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>TTU 9 Engineering Majors & Research Archive</span>
                </span>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════
              TAB CONTENT 1: BOOKS TAB
             ═══════════════════════════════════════════════ */}
          {activeCatalogTab === 'books' && (
            <>
              {/* Recommended for You */}
              {recommended.length > 0 && !searchQuery && (
                <section className="bg-muted/30 border border-border rounded-2xl p-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-foreground tracking-tight">Recommended for You</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Curated selections based on your reading preferences</p>
                    </div>
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
                            <span>4.8</span>
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

              {/* DDC Categories Pills */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Dewey Decimal Categories</span>
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
                    All Categories ({regularBooks.length})
                  </button>
                  {DDC_CLASSES.map(cat => {
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
                </div>
              </section>
            </>
          )}

          {/* ═══════════════════════════════════════════════
              TAB CONTENT 2: THESES TAB (9 MAJORS SELECTOR)
             ═══════════════════════════════════════════════ */}
          {activeCatalogTab === 'theses' && (
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              {/* Thesis Header Banner */}
              <div className="bg-gradient-to-r from-emerald-900/90 via-teal-900/90 to-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-emerald-700/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold mb-2 border border-emerald-400/30">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <span>Thanlyin Technological University Graduation Archive</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Academic Theses & Research Papers
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                    Explore final year graduation theses across TTU's 9 Engineering Departments with instant 10-page preview engine.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15">
                  <div className="text-center px-2">
                    <div className="text-lg font-extrabold text-emerald-300">{combinedTheses.length}</div>
                    <div className="text-[10px] uppercase font-bold text-slate-300">Theses</div>
                  </div>
                  <div className="w-px h-8 bg-white/20" />
                  <div className="text-center px-2">
                    <div className="text-lg font-extrabold text-sky-300">9</div>
                    <div className="text-[10px] uppercase font-bold text-slate-300">Majors</div>
                  </div>
                </div>
              </div>

              {/* ─── 9 MAJORS SELECTOR PILLS ─── */}
              <section className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Select Major / Department (9 Majors)
                    </h3>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Choose department to filter papers
                    </span>
                  </div>
                  {selectedMajor !== 'all' && (
                    <button
                      onClick={() => setSelectedMajor('all')}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> All Majors
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {/* All Majors Option */}
                  <button
                    onClick={() => setSelectedMajor('all')}
                    className={cn(
                      "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2",
                      selectedMajor === 'all'
                        ? "bg-slate-900 text-white border-slate-900 shadow-xs dark:bg-white dark:text-slate-900"
                        : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <span>All Majors</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                      selectedMajor === 'all' ? "bg-white/20 text-white dark:bg-black/20 dark:text-black" : "bg-muted text-muted-foreground"
                    )}>
                      {combinedTheses.length}
                    </span>
                  </button>

                  {/* 9 TTU Engineering Majors: CEIT, MC, Mech, Archi, Civil, PE, Che, EC, EP */}
                  {TTU_MAJORS.map(major => {
                    const isSelected = selectedMajor === major.code;
                    const count = majorCounts[major.code] || 0;

                    return (
                      <button
                        key={major.code}
                        onClick={() => setSelectedMajor(isSelected ? 'all' : major.code)}
                        title={`${major.code} — ${major.name}`}
                        className={cn(
                          "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2",
                          isSelected
                            ? "shadow-xs ring-2 ring-primary/20 scale-[1.02]"
                            : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/60"
                        )}
                        style={isSelected ? {
                          backgroundColor: major.bg,
                          color: major.color,
                          borderColor: major.border,
                        } : undefined}
                      >
                        <span className="font-bold tracking-tight">{major.code}</span>
                        <span className="hidden md:inline font-normal text-[11px] opacity-80">
                          {major.shortName}
                        </span>
                        <span
                          className={cn(
                            "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
                            isSelected ? "bg-white/70 shadow-2xs" : "bg-muted text-muted-foreground"
                          )}
                          style={isSelected ? { color: major.color } : undefined}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Major Description Bar */}
                {selectedMajor !== 'all' && (
                  <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {getMajorInfo(selectedMajor).code}:
                      </span>
                      <span>{getMajorInfo(selectedMajor).name}</span>
                      <span className="text-muted-foreground/60 hidden sm:inline">
                        ({getMajorInfo(selectedMajor).burmeseName})
                      </span>
                    </div>
                    <span className="font-medium text-primary">
                      {filteredTheses.length} {filteredTheses.length === 1 ? 'thesis' : 'theses'} found
                    </span>
                  </div>
                )}
              </section>

              {/* Year & Additional Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Year:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {availableYears.map(yr => (
                      <button
                        key={yr}
                        onClick={() => setSelectedYear(yr)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border",
                          String(selectedYear) === String(yr)
                            ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                            : "bg-card text-muted-foreground border-border hover:text-foreground"
                        )}
                      >
                        {yr === 'all' ? 'All Years' : yr}
                      </button>
                    ))}
                  </div>
                </div>

                {(selectedMajor !== 'all' || selectedYear !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedMajor('all');
                      setSelectedYear('all');
                      setSearchQuery('');
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium"
                  >
                    <X className="w-3.5 h-3.5" /> Clear All Filters
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              GRID SECTION (BOOKS or THESES)
             ═══════════════════════════════════════════════ */}
          <section className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  {activeCatalogTab === 'theses' ? (
                    <>
                      <span>Graduation Theses Archive</span>
                      {selectedMajor !== 'all' && (
                        <span className="text-sm font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {selectedMajor}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>Discover Library Catalog</span>
                  )}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Showing {activeItems.length} {activeCatalogTab === 'theses' ? 'theses' : 'resources'}
                  {searchQuery ? ` matching "${searchQuery}"` : ''}
                </p>
              </div>

              {/* Sort Selector */}
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

            {/* ─── ITEMS DISPLAY ─── */}
            {paginatedItems.length > 0 ? (
              activeCatalogTab === 'theses' ? (
                /* ─── THESES CARDS GRID ─── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {paginatedItems.map(thesis => {
                    const majorInfo = getMajorInfo(thesis.major);
                    return (
                      <div
                        key={thesis.id}
                        className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden hover:border-emerald-500/50 hover:shadow-lg transition-all duration-300 relative"
                      >
                        {/* Top Cover / Header Banner */}
                        <div
                          className="aspect-[16/9] relative p-4 flex flex-col justify-between text-white overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${majorInfo.color}EE, #0f172a)`
                          }}
                        >
                          <div className="flex items-center justify-between gap-2 z-10">
                            {/* Major Pill */}
                            <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-white/95 text-slate-900 shadow-sm border border-white/20 tracking-wider">
                              {majorInfo.code}
                            </span>
                            {/* 10p Preview Tag */}
                            <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-400/30 backdrop-blur-xs flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>10p Preview</span>
                            </span>
                          </div>

                          <div className="z-10 mt-auto">
                            <div className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
                              TTU Graduation Thesis
                            </div>
                            <div className="text-xs font-mono font-bold text-emerald-200">
                              {thesis.student_roll || `${thesis.year || '2025'}-${majorInfo.code}`}
                            </div>
                          </div>

                          {/* Watermark Icon */}
                          <GraduationCap className="absolute -bottom-3 -right-3 w-28 h-28 text-white/10 pointer-events-none" />
                        </div>

                        {/* Card Content */}
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <Link
                              to={`/book/${thesis.id}`}
                              className="text-sm font-bold text-foreground line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug"
                              title={thesis.title}
                            >
                              {thesis.title}
                            </Link>
                            <p className="text-xs font-medium text-muted-foreground mt-1 line-clamp-1">
                              By {thesis.author}
                            </p>
                          </div>

                          {/* Metadata badges */}
                          <div className="space-y-1.5 text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                            {thesis.supervisor && (
                              <div className="flex items-center gap-1.5 truncate" title={`Supervisor: ${thesis.supervisor}`}>
                                <UserCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                <span className="truncate">Adv: {thesis.supervisor}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-[10px] font-medium pt-1">
                              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                                Year: {thesis.year}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                {thesis.total_pages || 10} pages
                              </span>
                            </div>
                          </div>

                          {/* Card Action Buttons */}
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
                            <button
                              onClick={() => setPreviewThesis(thesis)}
                              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                              title="Preview first 10 pages in PDF viewer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>

                            <Link
                              to={`/book/${thesis.id}`}
                              className="w-full py-2 px-3 bg-muted hover:bg-muted/80 text-foreground rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors border border-border"
                            >
                              <span>Details</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ─── BOOKS CARDS GRID ─── */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
                  {paginatedItems.map(book => {
                    const ddcClass = getBookDdcClass(book);
                    return (
                      <Link
                        to={`/book/${book.id}`}
                        key={book.id}
                        className="group flex flex-col bg-card rounded-xl border border-border overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200"
                      >
                        <div className="aspect-[2/3] relative bg-muted overflow-hidden">
                          {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          ) : (
                            <BookCoverSVG title={book.title} color={book.cover} />
                          )}

                          {/* DDC Genre Badge */}
                          <span
                            className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold border backdrop-blur-xs max-w-[85%] truncate border-border shadow-2xs"
                            style={{
                              backgroundColor: `${ddcClass.color}F2`,
                              color: ddcClass.textColor,
                              borderColor: ddcClass.borderColor
                            }}
                            title={ddcClass.name}
                          >
                            {ddcClass.name}
                          </span>
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

                          {book.class_no && (
                            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50 text-[10px]">
                              <span className="text-muted-foreground font-medium text-[10px]">Class:</span>
                              <span className="font-mono font-semibold text-foreground px-1.5 py-0.2 rounded bg-muted border border-border">
                                {formatClassNoDual(book.class_no)}
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : (
              /* Empty State */
              <div className="text-center py-16 px-4 bg-muted/20 border border-dashed border-border rounded-2xl">
                <p className="text-sm font-medium text-muted-foreground mb-3">
                  {activeCatalogTab === 'theses'
                    ? `No graduation theses found for major "${selectedMajor}" with the current filters.`
                    : 'No books match your selected category or search filters.'}
                </p>
                <button
                  className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  onClick={() => {
                    setSelectedGenre(null);
                    setSelectedMajor('all');
                    setSelectedYear('all');
                    setSelectedAvailability(null);
                    setSearchQuery('');
                  }}
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

      {/* ─── PDF PREVIEW MODAL ─── */}
      {previewThesis && (
        <ThesisPdfViewer
          isModal
          onClose={() => setPreviewThesis(null)}
          pdfUrl={previewThesis.pdf_url}
          previewPdfUrl={previewThesis.preview_pdf_url}
          title={previewThesis.title}
          author={thesisAuthor(previewThesis)}
          studentRoll={previewThesis.student_roll}
          major={previewThesis.major}
          year={previewThesis.year}
          totalPages={previewThesis.total_pages || 10}
          previewPagesCount={previewThesis.preview_pages_count || 10}
        />
      )}

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

function thesisAuthor(thesis) {
  return thesis.author || 'Student Author';
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

export default BookshelfPage;