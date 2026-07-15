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
// Auth Routes (Supabase Auth)
// ============================================================

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
// Book Routes
// ============================================================

app.get('/api/books', async (req, res) => {
  try {
    const { search } = req.query;
    const books = await bookService.getAllBooks({ search });
    res.json({ success: true, count: books.length, books });
  } catch (err) {
    console.error('Books error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await bookService.getBookById(req.params.id);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    res.json({ success: true, book });
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
    
    // Get full transaction details
    const fullTransaction = await transactionService.getTransactionById(transaction.id);

    // Generate QR code
    const qrData = {
      transactionId: transaction.id,
      userId,
      bookId,
      accessionNo: transaction.accession_no,
      borrowDate: transaction.borrow_date,
      dueDate: transaction.due_date
    };
    
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.status(201).json({
      success: true,
      message: `Successfully borrowed "${fullTransaction.book?.title}". Due in 7 days.`,
      transaction: fullTransaction,
      qrCode
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
        email: user.email,
        avatar_url: user.avatar_url,
        role: user.role,
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
