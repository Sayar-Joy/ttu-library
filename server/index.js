import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import supabase, { testConnection } from './supabase.js';
import * as userService from './services/userService.js';
import * as bookService from './services/bookService.js';
import * as transactionService from './services/transactionService.js';
import * as notificationService from './services/notificationService.js';
import * as friendshipService from './services/friendshipService.js';
import { initNotificationCronJobs } from './cron/notificationJobs.js';
import QRCode from 'qrcode';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import thesisRoutes from './routes/thesisRoutes.js';
import * as thesisService from './services/thesisService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ============================================================
// Admin / Librarian Routes (protected by verifyLibrarian middleware)
// ============================================================
app.use('/api/admin', adminRoutes);

// ============================================================
// Upload Routes (image processing + Supabase Storage)
// ============================================================
app.use('/api/upload', uploadRoutes);

// ============================================================
// Auth Routes (Supabase Auth & Google OAuth)
// ============================================================

/**
 * POST /api/auth/oauth-sync
 * Synchronize Google OAuth user with the database on first signup / login.
 * Creates profile row in `users` if not present.
 */
app.post('/api/auth/oauth-sync', async (req, res) => {
  try {
    const { id, email, name, avatar_url } = req.body;

    if (!id || !email) {
      return res.status(400).json({
        success: false,
        message: 'id and email are required for OAuth sync.'
      });
    }

    const user = await userService.syncOAuthUser({
      id,
      email,
      name,
      avatar_url
    });

    res.json({
      success: true,
      message: 'OAuth profile synced successfully.',
      user: {
        id: user.id,
        name: user.name,
        student_id: user.student_id,
        roll_number: user.roll_number,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
        membership_status: user.membership_status || 'none',
        phone: user.phone,
        major: user.major,
        year: user.year,
        nrc: user.nrc,
        membership_applied_at: user.membership_applied_at,
        membership_approved_at: user.membership_approved_at,
        membership_rejected_reason: user.membership_rejected_reason,
      }
    });
  } catch (err) {
    console.error('OAuth sync error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error during OAuth sync.' });
  }
});

// ============================================================
// Student Membership Routes
// ============================================================

/**
 * POST /api/membership/apply
 * Student submits their library membership application form.
 */
app.post('/api/membership/apply', async (req, res) => {
  try {
    const { userId, name, roll_number, student_id, major, year, phone, nrc } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required.' });
    }

    if (!roll_number && !student_id) {
      return res.status(400).json({ success: false, message: 'Roll number / Student ID is required.' });
    }

    const updatedUser = await userService.submitMembershipApplication(userId, {
      name,
      roll_number,
      student_id,
      major,
      year,
      phone,
      nrc
    });

    // Create a confirmation notification for the student
    try {
      await notificationService.createNotification(
        userId,
        'membership_submitted',
        'Application Submitted',
        'Your library membership form has been submitted and is currently under review by the librarian.'
      );
    } catch (notifErr) {
      console.error('Failed to create membership submission notification:', notifErr);
    }

    res.json({
      success: true,
      message: 'Library membership application submitted successfully. Please wait for librarian approval.',
      user: updatedUser
    });
  } catch (err) {
    console.error('Membership apply error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to submit membership application.' });
  }
});

/**
 * GET /api/membership/status/:userId
 * Get current student's membership status and application data.
 */
app.get('/api/membership/status/:userId', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      membership: {
        status: user.membership_status || 'none',
        applied_at: user.membership_applied_at,
        approved_at: user.membership_approved_at,
        rejected_reason: user.membership_rejected_reason,
        details: {
          name: user.name,
          email: user.email,
          student_id: user.student_id,
          roll_number: user.roll_number,
          major: user.major,
          year: user.year,
          phone: user.phone,
          nrc: user.nrc
        }
      }
    });
  } catch (err) {
    console.error('Membership status error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide both email/student ID and password.' 
      });
    }

    // Determine if identifier is email or student_id
    const isEmail = identifier.includes('@');
    let email = identifier;

    // If it's a student ID, look up the email
    if (!isEmail) {
      const user = await userService.getUserByStudentId(identifier.trim());
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials.' 
        });
      }
      email = user.email;
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials.' 
      });
    }

    // Get user profile from users table
    let user = await userService.getUserById(data.user.id);

    // If profile doesn't exist, create it from auth metadata
    if (!user) {
      const authUser = data.user;
      const userData = {
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email.split('@')[0],
        student_id: authUser.user_metadata?.student_id || null,
        roll_number: null,
        email: authUser.email,
        avatar_url: authUser.user_metadata?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '👤',
        role: 'student'
      };
      user = await userService.createUser(userData);
    }

    res.json({ 
      success: true, 
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        student_id: user.student_id,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role
      },
      session: data.session
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, student_id, roll_number, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields required.' 
      });
    }

    if (!roll_number) {
      return res.status(400).json({ 
        success: false, 
        message: 'Roll number is required.' 
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match.' 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters.' 
      });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          student_id: student_id || roll_number,
          roll_number
        }
      }
    });

    if (authError) {
      return res.status(400).json({ 
        success: false, 
        message: authError.message 
      });
    }

    // Create user profile in users table
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    const userProfile = await userService.createUser({
      id: authData.user.id, // Use auth UUID
      name,
      student_id: student_id || roll_number,
      roll_number,
      email,
      avatar_url: initials,
      role: 'student'
    });

    res.status(201).json({ 
      success: true, 
      message: 'Account created! Please check your email to verify.',
      user: {
        id: userProfile.id,
        name: userProfile.name,
        student_id: userProfile.student_id,
        roll_number: userProfile.roll_number,
        email: userProfile.email,
        avatar_url: userProfile.avatar_url,
        role: userProfile.role
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error.' });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ============================================================
// Thesis Routes (Public & Student)
// ============================================================
app.use('/api/theses', thesisRoutes);

// ============================================================
// Book Routes
// ============================================================

app.get('/api/books', async (req, res) => {
  try {
    const { search, genre, category } = req.query;
    const books = await bookService.getAllBooks({ search });
    
    // Also fetch theses and format them as book objects
    const { theses } = await thesisService.getAllTheses({ search });
    const formattedTheses = (theses || []).map(t => ({
      id: t.id,
      title: t.title,
      author: t.author,
      genre: 'Thesis',
      category: 'Thesis',
      year: t.year,
      publication_year: t.year,
      cover: t.cover_url || '#1e3a5f',
      cover_url: t.cover_url,
      isbn: t.student_roll ? `Roll: ${t.student_roll}` : null,
      class_no: t.major,
      publisher: `TTU - ${t.major}`,
      review: t.abstract || `Thesis by ${t.author} (${t.student_roll}) under supervision of ${t.supervisor || 'Department Faculty'}.`,
      description: t.abstract,
      total_pages: t.total_pages || 10,
      totalCopies: 1,
      availableCopies: 1,
      borrowedCopies: 0,
      isThesis: true,
      major: t.major,
      student_roll: t.student_roll,
      supervisor: t.supervisor,
      pdf_url: t.pdf_url,
      preview_pdf_url: t.preview_pdf_url,
      preview_pages_count: t.preview_pages_count || 10,
    }));

    let combined = [...books, ...formattedTheses];

    // Filter by genre or category if requested
    if (genre) {
      combined = combined.filter(b => (b.genre && b.genre.toLowerCase() === genre.toLowerCase()) || (b.category && b.category.toLowerCase() === genre.toLowerCase()));
    }
    if (category) {
      combined = combined.filter(b => (b.category && b.category.toLowerCase() === category.toLowerCase()) || (b.genre && b.genre.toLowerCase() === category.toLowerCase()));
    }

    res.json({ success: true, count: combined.length, books: combined });
  } catch (err) {
    console.error('Books error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    // Check if it's a book
    try {
      const book = await bookService.getBookById(req.params.id);
      if (book) {
        return res.json({ success: true, book });
      }
    } catch (bErr) {
      // Not found in books table, check theses
    }

    // Check in theses
    const thesis = await thesisService.getThesisById(req.params.id);
    if (thesis) {
      const formattedThesis = {
        id: thesis.id,
        title: thesis.title,
        author: thesis.author,
        genre: 'Thesis',
        category: 'Thesis',
        year: thesis.year,
        publication_year: thesis.year,
        cover: thesis.cover_url || '#1e3a5f',
        cover_url: thesis.cover_url,
        isbn: thesis.student_roll ? `Roll: ${thesis.student_roll}` : null,
        class_no: thesis.major,
        publisher: `TTU - ${thesis.major}`,
        review: thesis.abstract || `Thesis by ${thesis.author} (${thesis.student_roll}).`,
        description: thesis.abstract,
        total_pages: thesis.total_pages || 10,
        totalCopies: 1,
        availableCopies: 1,
        borrowedCopies: 0,
        isThesis: true,
        major: thesis.major,
        student_roll: thesis.student_roll,
        supervisor: thesis.supervisor,
        pdf_url: thesis.pdf_url,
        preview_pdf_url: thesis.preview_pdf_url,
        preview_pages_count: thesis.preview_pages_count || 10,
      };
      return res.json({ success: true, book: formattedThesis });
    }

    return res.status(404).json({ success: false, message: 'Book or Thesis not found.' });
  } catch (err) {
    console.error('Book error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// ============================================================
// Save/Unsave Book (Favorites)
// ============================================================

app.post('/api/books/:bookId/save', async (req, res) => {
  try {
    const { userId } = req.body;
    const { bookId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const isSaved = await userService.isFavorite(userId, bookId);

    if (isSaved) {
      await userService.removeFavorite(userId, bookId);
      res.json({
        success: true,
        message: 'Book removed from saved',
        saved: false
      });
    } else {
      await userService.addFavorite(userId, bookId);
      res.json({
        success: true,
        message: 'Book saved successfully',
        saved: true
      });
    }
  } catch (err) {
    console.error('Save book error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// Transaction Routes
// ============================================================

// ============================================================
// Transaction Routes (Circulation & Requests)
// ============================================================

/**
 * POST /api/transactions/request-borrow
 * Student submits a request to borrow a book
 */
app.post('/api/transactions/request-borrow', async (req, res) => {
  try {
    const { userId, bookId, notes, durationDays, preferredAccessionNo, studentRealName } = req.body;

    if (!userId || !bookId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId and bookId are required' 
      });
    }

    const transaction = await transactionService.requestBorrowBook(userId, bookId, {
      notes,
      durationDays,
      preferredAccessionNo,
      studentRealName
    });

    res.status(201).json({
      success: true,
      message: `Borrow request for "${transaction.book?.title || 'the book'}" submitted successfully! Please wait for librarian approval.`,
      transaction
    });
  } catch (err) {
    console.error('Request borrow error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/transactions/request-return
 * Student submits a request to return a borrowed book
 */
app.post('/api/transactions/request-return', async (req, res) => {
  try {
    const { transactionId, returnCondition, notes } = req.body;

    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'transactionId is required' 
      });
    }

    const transaction = await transactionService.requestReturnBook(transactionId, {
      returnCondition,
      notes
    });

    res.json({
      success: true,
      message: 'Return request submitted. Please hand the physical book to the circulation desk for verification.',
      transaction
    });
  } catch (err) {
    console.error('Request return error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/transactions/request-renewal
 * Student submits a request to renew / extend a borrowed book loan
 */
app.post('/api/transactions/request-renewal', async (req, res) => {
  try {
    const { transactionId, renewalDays, notes } = req.body;

    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'transactionId is required' 
      });
    }

    const transaction = await transactionService.requestRenewalBook(transactionId, {
      renewalDays: parseInt(renewalDays, 10) || 7,
      notes: notes ? notes.trim() : ''
    });

    res.json({
      success: true,
      message: `Renewal request submitted successfully (+${transaction.renewal_duration_days || 7} days). Awaiting librarian review.`,
      transaction
    });
  } catch (err) {
    console.error('Request renewal error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/transactions/requests/:userId
 * Get user's borrow, renewal, and return requests history
 */
app.get('/api/transactions/requests/:userId', async (req, res) => {
  try {
    const requests = await transactionService.getStudentRequests(req.params.userId);
    res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error('Student requests error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/transactions/borrow', async (req, res) => {
  try {
    const { userId, bookId, accessionNo } = req.body;

    if (!userId || !bookId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId and bookId are required' 
      });
    }

    const transaction = await transactionService.borrowBook(userId, bookId, accessionNo);
    const fullTransaction = await transactionService.getTransactionById(transaction.id);

    res.status(201).json({
      success: true,
      message: `Successfully borrowed "${fullTransaction.book?.title}". Due in 7 days.`,
      transaction: fullTransaction
    });
  } catch (err) {
    console.error('Borrow error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/transactions/return', async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'transactionId is required' 
      });
    }

    const transaction = await transactionService.returnBook(transactionId);
    const fullTransaction = await transactionService.getTransactionById(transaction.id);

    let message = 'Book has been returned.';
    if (fullTransaction.final_fine_amount > 0) {
      message += ` Fine: ${fullTransaction.final_fine_amount} kyats.`;
    }

    res.json({
      success: true,
      message,
      transaction: fullTransaction
    });
  } catch (err) {
    console.error('Return error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/transactions/pay-fine', async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ 
        success: false, 
        message: 'transactionId is required' 
      });
    }

    const transaction = await transactionService.markFineAsPaid(transactionId);

    res.json({
      success: true,
      message: 'Fine marked as paid.',
      transaction
    });
  } catch (err) {
    console.error('Pay fine error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.get('/api/transactions/:userId', async (req, res) => {
  try {
    const transactions = await transactionService.getAllTransactions(req.params.userId);
    res.json({ success: true, count: transactions.length, transactions });
  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.patch('/api/transactions/:transactionId/progress', async (req, res) => {
  try {
    const { progress } = req.body;
    const transaction = await transactionService.updateProgress(
      req.params.transactionId, 
      progress
    );
    res.json({ success: true, transaction });
  } catch (err) {
    console.error('Update progress error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// Dashboard
// ============================================================

app.get('/api/dashboard/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Get user
    const user = await userService.getUserById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get active transactions
    const activeTransactions = await transactionService.getActiveTransactions(userId);
    
    // Get stats
    const stats = await transactionService.getUserStats(userId);
    
    // Get recommendations (books user hasn't borrowed and are available)
    const allBooks = await bookService.getAllBooks({});
    const borrowedBookIds = activeTransactions.map(tx => tx.book?.id).filter(Boolean);
    const recommendations = allBooks
      .filter(book => !borrowedBookIds.includes(book.id) && book.availableCopies > 0)
      .slice(0, 6);

    // Find currently reading (first book with progress > 0)
    const currentlyReading = activeTransactions.find(tx => tx.progress_percentage > 0) || null;

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        student_id: user.student_id,
        roll_number: user.roll_number,
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
        membership_status: user.membership_status || 'none',
        phone: user.phone,
        major: user.major,
        year: user.year,
        nrc: user.nrc,
        activeBorrowCount: stats.active_borrows,
        overdueCount: stats.overdue_count,
        unpaidFines: stats.unpaid_fines
      },
      currentlyReading,
      activeTransactions,
      recommended: recommendations
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================
// Profile Route
// ============================================================

app.get('/api/profile/:userId', async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Get favorites
    const favoriteBooks = await userService.getUserFavorites(req.params.userId);

    // Get transaction history
    const history = await transactionService.getTransactionHistory(req.params.userId);
    const finishedBooks = history
      .filter(tx => tx.progress_percentage === 100)
      .map(tx => tx.book)
      .filter(Boolean);

    // Get stats
    const stats = await transactionService.getUserStats(req.params.userId);

    // Format joined date
    const joinedDate = user.created_at 
      ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : 'N/A';

    res.json({
      success: true,
      profile: {
        ...user,
        avatar: user.avatar_url || '??',
        identifier: user.student_id || user.email,
        joined: joinedDate,
        // Match field names expected by ProfilePage
        booksBorrowed: stats.total_borrows,
        finishedCount: finishedBooks.length,
        favourites: favoriteBooks || [],
        favoriteBooks: favoriteBooks || [], // Alias for compatibility
        finishedBooks: finishedBooks || [], // Add finished books array
        booksReserved: 0, // No reservation system yet
        activeBorrowCount: stats.active_borrows,
        activeReserveCount: 0, // No reservation system yet
        booksDue: stats.overdue_count,
        unpaidFines: stats.unpaid_fines
      }
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// Notification Routes
// ============================================================

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.params.userId);
    res.json({ success: true, count: notifications.length, notifications });
  } catch (err) {
    console.error('Notifications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/notifications/:userId/unread-count', async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.params.userId);
    res.json({ success: true, count });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.patch('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const notification = await notificationService.markNotificationAsRead(req.params.notificationId);
    res.json({ success: true, notification });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.patch('/api/notifications/:userId/read-all', async (req, res) => {
  try {
    const notifications = await notificationService.markAllNotificationsAsRead(req.params.userId);
    res.json({ success: true, count: notifications.length, notifications });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.delete('/api/notifications/:notificationId', async (req, res) => {
  try {
    await notificationService.deleteNotification(req.params.notificationId);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ============================================================
// Friendship Routes
// ============================================================

// Send friend request
app.post('/api/friendships/request', async (req, res) => {
  try {
    const { requesterId, addresseeId } = req.body;
    
    if (!requesterId || !addresseeId) {
      return res.status(400).json({ 
        success: false, 
        message: 'requesterId and addresseeId are required' 
      });
    }

    const result = await friendshipService.sendFriendRequest(requesterId, addresseeId);
    res.status(201).json(result);
  } catch (err) {
    console.error('Send friend request error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Accept friend request
app.post('/api/friendships/:friendshipId/accept', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    const result = await friendshipService.acceptFriendRequest(req.params.friendshipId, userId);
    res.json(result);
  } catch (err) {
    console.error('Accept friend request error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Reject friend request
app.post('/api/friendships/:friendshipId/reject', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    const result = await friendshipService.rejectFriendRequest(req.params.friendshipId, userId);
    res.json(result);
  } catch (err) {
    console.error('Reject friend request error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Remove friend (unfriend)
app.delete('/api/friendships/:friendshipId', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }

    const result = await friendshipService.removeFriend(req.params.friendshipId, userId);
    res.json(result);
  } catch (err) {
    console.error('Remove friend error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get user's friends list
app.get('/api/friendships/:userId', async (req, res) => {
  try {
    const friends = await friendshipService.getFriends(req.params.userId);
    res.json({ success: true, count: friends.length, friends });
  } catch (err) {
    console.error('Get friends error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get pending friend requests (received)
app.get('/api/friendships/:userId/requests', async (req, res) => {
  try {
    const requests = await friendshipService.getPendingRequests(req.params.userId);
    res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error('Get pending requests error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get sent friend requests
app.get('/api/friendships/:userId/sent', async (req, res) => {
  try {
    const requests = await friendshipService.getSentRequests(req.params.userId);
    res.json({ success: true, count: requests.length, requests });
  } catch (err) {
    console.error('Get sent requests error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Search users for adding friends
app.get('/api/users/search', async (req, res) => {
  try {
    const { q, userId } = req.query;
    
    if (!q || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query (q) and userId are required' 
      });
    }

    const users = await friendshipService.searchUsers(q, userId);
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('Search users error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// Friend Public Profile (privacy-safe view)
// ============================================================

app.get('/api/friends/:friendId/public-profile', async (req, res) => {
  try {
    const { friendId } = req.params;

    // Get the user (friend)
    const user = await userService.getUserById(friendId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Get favourite books
    const favouriteBooks = await userService.getUserFavorites(friendId);

    // Get transaction history for borrowed & finished books
    const history = await transactionService.getTransactionHistory(friendId);
    const activeTransactions = await transactionService.getActiveTransactions(friendId);

    // Currently borrowed books (active transactions)
    const borrowedBooks = activeTransactions
      .map(tx => tx.book)
      .filter(Boolean);

    // Finished books (progress === 100%)
    const finishedBooks = history
      .filter(tx => tx.progress_percentage === 100)
      .map(tx => tx.book)
      .filter(Boolean);

    // Stats
    const stats = await transactionService.getUserStats(friendId);

    // Return ONLY public-safe data — no email, student_id, roll_number, join date
    res.json({
      success: true,
      profile: {
        name: user.name,
        avatar_url: user.avatar_url,
        // Only expose year portion of roll_number for "Class of 20XX"
        roll_number: user.roll_number || null,
        student_id: user.student_id || null,
        totalBorrowed: stats.total_borrows || 0,
        finishedCount: finishedBooks.length,
        favouriteBooks: favouriteBooks || [],
        borrowedBooks: borrowedBooks || [],
        finishedBooks: finishedBooks || [],
      }
    });
  } catch (err) {
    console.error('Friend public profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// Users / Health
// ============================================================

app.get('/api/users', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('Users error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.patch('/api/users/:userId', async (req, res) => {
  try {
    const { name, phone, major, year, roll_number, student_id, nrc } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (phone) updates.phone = phone.trim();
    if (major) updates.major = major.trim();
    if (year) updates.year = year.trim();
    if (roll_number || student_id) {
      updates.roll_number = (roll_number || student_id).trim();
      updates.student_id = (student_id || roll_number).trim();
    }
    if (nrc) updates.nrc = nrc.trim();

    const updated = await userService.updateUser(req.params.userId, updates);
    res.json({ success: true, message: 'Profile updated successfully!', user: updated });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    // Get counts from Supabase
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: bookCount } = await supabase
      .from('books')
      .select('*', { count: 'exact', head: true });

    const { count: txCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });

    res.json({ 
      status: 'ok', 
      database: 'Supabase PostgreSQL',
      users: userCount,
      books: bookCount,
      transactions: txCount
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ============================================================
// Static Files (Production)
// ============================================================

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => res.sendFile(join(__dirname, '..', 'dist', 'index.html')));
}

// ============================================================
// Start Server
// ============================================================

async function startServer() {
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Failed to connect to Supabase. Check your .env configuration.');
    process.exit(1);
  }

  // Initialize notification cron jobs
  initNotificationCronJobs();

  app.listen(PORT, () => {
    console.log(`📚 TTU Library API running on http://localhost:${PORT}`);
    console.log(`🔗 Database: Supabase (PostgreSQL)`);
    console.log(`🚀 Ready to serve requests`);
  });
}

startServer();
