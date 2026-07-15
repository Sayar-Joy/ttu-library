import mongoose from 'mongoose';
import Book from '../models/Book.js';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import QRCode from 'qrcode';

// ============================================================
// Internal helper: determine whether the connected MongoDB
// supports write sessions (i.e. is a replica set or mongos).
// Standalone instances cannot use sessions/transactions.
// ============================================================
function supportsTransactions() {
  const state = mongoose.connection.readyState;
  if (state !== 1) return false;

  // Check the topology description for replica-set / mongos
  const desc = mongoose.connection.db?.admin().serverInfo;
  // Simplest check: if the topology type has 'replica' or 'sharded', we can use sessions
  try {
    const topo = mongoose.connection.db?.topology?.s?.description?.type;
    if (topo === 'ReplicaSetWithPrimary' || topo === 'ReplicaSetNoPrimary' || topo === 'Sharded') {
      return true;
    }
  } catch (_) {
    // cannot determine → assume standalone
  }
  return false;
}

/**
 * borrowedBookError(msg, statusCode)
 *
 * Tiny factory to attach an HTTP‑ish statusCode to an Error.
 * Makes Express error‑handling easy without a custom error class.
 */
function borrowedBookError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

// ============================================================
//  borrowBook(userId, bookId)
// ============================================================
/**
 * Borrow one copy of a book for a user.
 *
 * On replica‑set / sharded clusters the four writes run inside a
 * MongoDB write‑session so that they either all succeed or all
 * roll back.  On standalone instances the writes run sequentially
 * with manual rollback logic (good enough for dev / small deploys).
 *
 * Errors handled:
 *   400 – missing userId / bookId
 *   404 – book or user not found
 *   409 – book out of stock, or user already has an active borrow
 */
export async function borrowBook(userId, bookId) {
  if (!userId || !bookId) {
    throw borrowedBookError('userId and bookId are required', 400);
  }

  const useSession = supportsTransactions();
  let session = null;

  // ── Start a session if supported ──
  if (useSession) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    // ── Lookup helpers (pass session when available) ──
    const opts = session ? { session } : {};

    const book = await Book.findById(bookId, null, opts);
    if (!book) {
      throw borrowedBookError(`Book not found: ${bookId}`, 404);
    }

    if (book.availableCopies <= 0) {
      throw borrowedBookError(
        `"${book.title}" is out of stock. All ${book.totalCopies} copies are borrowed.`,
        409
      );
    }

    const user = await User.findById(userId, null, opts);
    if (!user) {
      throw borrowedBookError(`User not found: ${userId}`, 404);
    }

    const existingTx = await Transaction.findOne(
      { user: userId, book: bookId, status: { $in: ['active', 'overdue'] } },
      null,
      opts
    );
    if (existingTx) {
      throw borrowedBookError(
        `You already have an active borrow for "${book.title}".`,
        409
      );
    }

    // ── Execute writes ──
    book.availableCopies -= 1;
    await book.save(opts);

    const [transaction] = await Transaction.create(
      [
        {
          user: userId,
          book: bookId,
          borrowDate: new Date(),
          dueDate: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 14);
            return d;
          })(),
          status: 'active',
          progress: 0,
        },
      ],
      opts
    );

    user.activeBorrowCount += 1;
    user.booksBorrowed += 1;
    await user.save(opts);

    // ── Commit (or no‑op for standalone) ──
    if (session) await session.commitTransaction();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate('user', 'name avatar')
      .populate('book')
      .lean();

    // Generate QR code with transaction data
    const qrData = {
      transactionId: transaction._id.toString(),
      userId: userId,
      bookId: bookId,
      bookTitle: book.title,
      borrowDate: new Date().toISOString(),
      dueDate: populatedTx.dueDate
    };
    
    const qrCode = await QRCode.toDataURL(JSON.stringify(qrData), {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return {
      success: true,
      message: `Successfully borrowed "${book.title}". Due in 14 days.`,
      transaction: populatedTx,
      qrCode: qrCode
    };
  } catch (err) {
    if (session) await session.abortTransaction();

    if (err.statusCode) throw err;
    console.error('borrowBook error:', err);
    throw borrowedBookError('Failed to borrow book. Please try again.', 500);
  } finally {
    if (session) session.endSession();
  }
}

// ============================================================
//  returnBook(transactionId)
// ============================================================
/**
 * Return a borrowed book.
 *
 * Atomic writes (on replica sets) or sequential writes (standalone):
 *   - transaction.status  → 'returned', returnDate = now
 *   - book.availableCopies incremented (clamped to totalCopies)
 *   - user.activeBorrowCount decremented (clamped to 0)
 */
export async function returnBook(transactionId) {
  if (!transactionId) {
    throw borrowedBookError('transactionId is required', 400);
  }

  const useSession = supportsTransactions();
  let session = null;

  if (useSession) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const opts = session ? { session } : {};

    const transaction = await Transaction.findById(transactionId, null, opts);
    if (!transaction) {
      throw borrowedBookError(`Transaction not found: ${transactionId}`, 404);
    }

    if (!['active', 'overdue'].includes(transaction.status)) {
      throw borrowedBookError(
        `Transaction is already ${transaction.status}. Cannot return.`,
        409
      );
    }

    // Book: increment available copies
    const book = await Book.findById(transaction.book, null, opts);
    if (book) {
      book.availableCopies = Math.min(book.availableCopies + 1, book.totalCopies);
      await book.save(opts);
    }

    // Transaction → returned
    transaction.returnDate = new Date();
    transaction.status = 'returned';
    await transaction.save(opts);

    // User: decrement active count
    const user = await User.findById(transaction.user, null, opts);
    if (user) {
      user.activeBorrowCount = Math.max(0, user.activeBorrowCount - 1);
      await user.save(opts);
    }

    if (session) await session.commitTransaction();

    const populatedTx = await Transaction.findById(transactionId)
      .populate('user', 'name avatar')
      .populate('book')
      .lean();

    return {
      success: true,
      message: book ? `"${book.title}" has been returned.` : 'Book has been returned.',
      transaction: populatedTx,
    };
  } catch (err) {
    if (session) await session.abortTransaction();
    if (err.statusCode) throw err;
    console.error('returnBook error:', err);
    throw borrowedBookError('Failed to return book. Please try again.', 500);
  } finally {
    if (session) session.endSession();
  }
}

// ============================================================
//  getUserDashboard(userId)
// ============================================================
/**
 * Fetch the user's profile, active borrows, reservations, and
 * recommendations for the dashboard view.
 *
 * Returns:
 *   user               – public profile with live counter values
 *   currentlyReading   – first active tx with progress > 0
 *   activeTransactions – array of borrowed books with daysRemaining
 *   recommended        – 6 available books not currently held by user
 */
// ============================================================
//  preBook(userId, bookId)
// ============================================================
/**
 * Pre-book (reserve) a book for a user when all copies are borrowed.
 *
 * Errors handled:
 *   400 – missing userId / bookId
 *   404 – book or user not found
 *   409 – user already has a pre-book for this book, or already has an active borrow
 */
export async function preBook(userId, bookId) {
  if (!userId || !bookId) {
    throw borrowedBookError('userId and bookId are required', 400);
  }

  const useSession = supportsTransactions();
  let session = null;

  if (useSession) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const opts = session ? { session } : {};

    const book = await Book.findById(bookId, null, opts);
    if (!book) {
      throw borrowedBookError(`Book not found: ${bookId}`, 404);
    }

    const user = await User.findById(userId, null, opts);
    if (!user) {
      throw borrowedBookError(`User not found: ${userId}`, 404);
    }

    // Check for existing active borrow or pre-book for this book
    const existingTx = await Transaction.findOne(
      { user: userId, book: bookId, status: { $in: ['active', 'overdue', 'reserved'] } },
      null,
      opts
    );
    if (existingTx) {
      throw borrowedBookError(
        `You already have an active borrow or reservation for "${book.title}".`,
        409
      );
    }

    // Check user's reserve limit (max 3 pre-books)
    const activeReservations = await Transaction.countDocuments(
      { user: userId, status: 'reserved' },
      opts
    );
    if (activeReservations >= 3) {
      throw borrowedBookError(
        'You have reached the maximum of 3 pre-booked books. Please wait for availability.',
        409
      );
    }

    // Check if book already has pre-books queued (max 5 pre-books per book)
    const existingPreBooks = await Transaction.countDocuments(
      { book: bookId, status: 'reserved' },
      opts
    );
    const MAX_PREBOOKS_PER_BOOK = 5;
    if (existingPreBooks >= MAX_PREBOOKS_PER_BOOK) {
      throw borrowedBookError(
        `"${book.title}" already has ${MAX_PREBOOKS_PER_BOOK} pre-books. Please check back later.`,
        409
      );
    }

    const [transaction] = await Transaction.create(
      [
        {
          user: userId,
          book: bookId,
          borrowDate: new Date(),
          dueDate: null,
          status: 'reserved',
          progress: 0,
        },
      ],
      opts
    );

    user.activeReserveCount += 1;
    user.booksReserved += 1;
    await user.save(opts);

    if (session) await session.commitTransaction();

    const populatedTx = await Transaction.findById(transaction._id)
      .populate('user', 'name avatar')
      .populate('book')
      .lean();

    return {
      success: true,
      message: `"${book.title}" has been pre-booked. You'll be notified when it's available.`,
      transaction: populatedTx,
    };
  } catch (err) {
    if (session) await session.abortTransaction();
    if (err.statusCode) throw err;
    console.error('preBook error:', err);
    throw borrowedBookError('Failed to pre-book. Please try again.', 500);
  } finally {
    if (session) session.endSession();
  }
}

// ============================================================
//  getUserDashboard(userId)
// ============================================================
export async function getUserDashboard(userId) {
  if (!userId) {
    throw borrowedBookError('userId is required', 400);
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    throw borrowedBookError(`User not found: ${userId}`, 404);
  }

  // Active borrows
  const activeTransactions = await Transaction.find({
    user: userId,
    status: { $in: ['active', 'overdue'] },
  })
    .populate('book')
    .sort({ dueDate: 1 })
    .lean();

  const demoToday = new Date('2026-06-28');
  const enriched = activeTransactions.map(tx => {
    const b = tx.book || {};
    let daysRemaining = null;
    if (tx.dueDate) {
      daysRemaining = Math.ceil((new Date(tx.dueDate) - demoToday) / (1000 * 60 * 60 * 24));
    }
    return {
      id: tx._id,
      bookId: b._id,
      title: b.title,
      author: b.author,
      genre: b.genre,
      cover: b.cover,
      isbn: b.isbn,
      year: b.year,
      pages: b.pages,
      borrowDate: tx.borrowDate,
      dueDate: tx.dueDate,
      daysRemaining,
      progress: tx.progress,
      status: tx.status,
      notes: tx.notes,
    };
  });

  const currentlyReading =
    enriched.find(tx => tx.progress > 0) || enriched[0] || null;

  // Reserved
  const reservedTransactions = await Transaction.find({
    user: userId,
    status: 'reserved',
  })
    .populate('book')
    .lean();

  const dueThisWeek = enriched.filter(
    tx => tx.daysRemaining !== null && tx.daysRemaining >= 0 && tx.daysRemaining <= 7
  ).length;

  // Recommendations: books with available copies, not held by this user
  const userBookIds = [
    ...activeTransactions.map(tx => tx.book?._id || tx.book),
    ...reservedTransactions.map(tx => tx.book?._id || tx.book),
  ].filter(Boolean);

  const recommendations = await Book.find({
    _id: { $nin: userBookIds },
    availableCopies: { $gt: 0 },
  })
    .limit(6)
    .lean();

  return {
    success: true,
    user: {
      id: user._id,
      name: user.name,
      avatar: user.avatar,
      identifier: user.identifier,
      email: user.email,
      joined: user.joined,
      booksBorrowed: user.booksBorrowed,
      booksDue: dueThisWeek,
      booksReserved: user.booksReserved,
      activeBorrowCount: user.activeBorrowCount,
      activeReserveCount: user.activeReserveCount,
    },
    currentlyReading,
    activeTransactions: enriched,
    reservedCount: reservedTransactions.length,
    recommended: recommendations,
  };
}