/**
 * Data Migration Script
 *
 * Transforms old flat-book documents into the new 3-collection Mongoose
 * architecture (User / Book / Transaction).
 *
 * Usage:  node server/migrate.js
 *
 * What it does:
 *   1. Reads old users array    → inserts into User collection
 *   2. Reads old books array    → maps status→inventory + inserts into Book collection
 *   3. For every old book with a borrowerId:
 *        - creates a Transaction (active or reserved)
 *        - recalculates activeBorrowCount / activeReserveCount on the User
 *   4. Prints a summary table
 */

import { connectDB, closeDB } from './db.js';
import User from './models/User.js';
import Book from './models/Book.js';
import Transaction from './models/Transaction.js';

// ============================================================
// OLD DATA (copied from seed.js — kept here so this script
//           is self-contained and repeatable)
// ============================================================

const oldUsers = [
  { _id: 'user_1',  name: 'Alex Schmidt',     identifier: '2024-STU-0891',  email: 'alex.schmidt@ttu.edu',    password: 'password123', avatar: 'AS', joined: '2024-01-15', booksBorrowed: 4, booksDue: 2, booksReserved: 1 },
  { _id: 'user_2',  name: 'Maya Patel',        identifier: '2023-STU-0456',  email: 'maya.patel@ttu.edu',      password: 'password123', avatar: 'MP', joined: '2023-09-01', booksBorrowed: 3, booksDue: 1, booksReserved: 2 },
  { _id: 'user_3',  name: "James O'Connor",    identifier: '2024-STU-1123',  email: 'james.oconnor@ttu.edu',   password: 'password123', avatar: 'JO', joined: '2024-02-20', booksBorrowed: 5, booksDue: 3, booksReserved: 0 },
  { _id: 'user_4',  name: 'Sakura Tanaka',     identifier: '2022-STU-0789',  email: 'sakura.tanaka@ttu.edu',   password: 'password123', avatar: 'ST', joined: '2022-08-10', booksBorrowed: 2, booksDue: 0, booksReserved: 4 },
  { _id: 'user_5',  name: 'David Kim',         identifier: '2025-STU-0034',  email: 'david.kim@ttu.edu',       password: 'password123', avatar: 'DK', joined: '2025-01-05', booksBorrowed: 1, booksDue: 1, booksReserved: 3 },
  { _id: 'user_6',  name: 'Emma Williams',     identifier: '2023-STU-0567',  email: 'emma.williams@ttu.edu',   password: 'password123', avatar: 'EW', joined: '2023-10-12', booksBorrowed: 6, booksDue: 4, booksReserved: 1 },
  { _id: 'user_7',  name: 'Liam Ngyuen',       identifier: '2024-STU-0234',  email: 'liam.nguyen@ttu.edu',     password: 'password123', avatar: 'LN', joined: '2024-03-08', booksBorrowed: 3, booksDue: 2, booksReserved: 2 },
  { _id: 'user_8',  name: 'Sofia Rodriguez',   identifier: '2022-STU-0912',  email: 'sofia.rodriguez@ttu.edu', password: 'password123', avatar: 'SR', joined: '2022-11-30', booksBorrowed: 7, booksDue: 5, booksReserved: 0 },
  { _id: 'user_9',  name: 'Oliver Chen',       identifier: '2025-STU-0012',  email: 'oliver.chen@ttu.edu',     password: 'password123', avatar: 'OC', joined: '2025-02-14', booksBorrowed: 2, booksDue: 0, booksReserved: 1 },
  { _id: 'user_10', name: 'Isabella Müller',   identifier: '2023-STU-0345',  email: 'isabella.muller@ttu.edu', password: 'password123', avatar: 'IM', joined: '2023-06-22', booksBorrowed: 4, booksDue: 2, booksReserved: 3 },
];

const oldBooks = [
  { _id: 'book_01',  title: 'The Silent Patient',       author: 'Alex Michaelides',      genre: 'Fiction',       year: 2019, pages: 336, cover: '#485E78', isbn: '978-1250301697',   status: 'borrowed',  borrowerId: 'user_1',  dueDate: '2026-07-01', progress: 65 },
  { _id: 'book_02',  title: 'The Great Gatsby',          author: 'F. Scott Fitzgerald',   genre: 'Classic',        year: 1925, pages: 180, cover: '#C4A44A', isbn: '978-0743273565',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
  { _id: 'book_03',  title: 'Design Systems',            author: 'Alla Kholmatova',       genre: 'Technology',     year: 2017, pages: 320, cover: '#E74C3C', isbn: '978-3945749586',   status: 'borrowed',  borrowerId: 'user_1',  dueDate: '2026-07-01', progress: 42 },
  { _id: 'book_04',  title: 'Brief Answers to the Big Questions', author: 'Stephen Hawking', genre: 'Science', year: 2018, pages: 256, cover: '#2D3E50', isbn: '978-1984819192',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
  { _id: 'book_05',  title: 'Clean Code',                author: 'Robert C. Martin',      genre: 'Technology',     year: 2008, pages: 464, cover: '#27AE60', isbn: '978-0132350884',   status: 'reserved',   borrowerId: 'user_1',  dueDate: null,          progress: 0 },
  { _id: 'book_06',  title: 'The Modern Grid',           author: 'Julian Arnell',         genre: 'Design',         year: 2023, pages: 210, cover: '#6B5E4A', isbn: '978-1916332608',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
  { _id: 'book_07',  title: 'Sapiens',                    author: 'Yuval Noah Harari',     genre: 'History',        year: 2015, pages: 464, cover: '#8E44AD', isbn: '978-0062316097',   status: 'borrowed',  borrowerId: 'user_2',  dueDate: '2026-07-03', progress: 78 },
  { _id: 'book_08',  title: 'Dune',                      author: 'Frank Herbert',         genre: 'Science Fiction', year: 1965, pages: 688, cover: '#D35400', isbn: '978-0441172719',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
  { _id: 'book_09',  title: 'Atomic Habits',             author: 'James Clear',           genre: 'Self-Help',      year: 2018, pages: 320, cover: '#2980B9', isbn: '978-0735211292',   status: 'borrowed',  borrowerId: 'user_3',  dueDate: '2026-07-05', progress: 31 },
  { _id: 'book_10', title: 'Thinking, Fast and Slow',    author: 'Daniel Kahneman',       genre: 'Psychology',     year: 2011, pages: 499, cover: '#F39C12', isbn: '978-0374533557',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
  { _id: 'book_11', title: 'The Pragmatic Programmer',    author: 'David Thomas',          genre: 'Technology',     year: 2019, pages: 352, cover: '#1ABC9C', isbn: '978-0135957059',   status: 'borrowed',  borrowerId: 'user_4',  dueDate: '2026-07-08', progress: 52 },
  { _id: 'book_12', title: '1984',                       author: 'George Orwell',         genre: 'Dystopian',      year: 1949, pages: 328, cover: '#C0392B', isbn: '978-0451524935',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
  { _id: 'book_13', title: 'Educated',                   author: 'Tara Westover',         genre: 'Memoir',         year: 2018, pages: 352, cover: '#16A085', isbn: '978-0399590504',   status: 'borrowed',  borrowerId: 'user_5',  dueDate: '2026-06-30', progress: 89 },
  { _id: 'book_14', title: 'To Kill a Mockingbird',      author: 'Harper Lee',            genre: 'Classic',        year: 1960, pages: 281, cover: '#7F8C8D', isbn: '978-0446310789',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
  { _id: 'book_15', title: 'The Alchemist',              author: 'Paulo Coelho',          genre: 'Fiction',        year: 1988, pages: 197, cover: '#E67E22', isbn: '978-0062315007',   status: 'borrowed',  borrowerId: 'user_6',  dueDate: '2026-07-02', progress: 45 },
  { _id: 'book_16', title: 'Refactoring UI',             author: 'Adam Wathan',           genre: 'Design',         year: 2018, pages: 372, cover: '#9B59B6', isbn: '978-1981241098',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
  { _id: 'book_17', title: 'The Lean Startup',           author: 'Eric Ries',             genre: 'Business',       year: 2011, pages: 336, cover: '#2C3E50', isbn: '978-0307887894',   status: 'borrowed',  borrowerId: 'user_7',  dueDate: '2026-07-04', progress: 23 },
  { _id: 'book_18', title: 'Deep Work',                  author: 'Cal Newport',           genre: 'Productivity',   year: 2016, pages: 304, cover: '#3498DB', isbn: '978-1455586691',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
  { _id: 'book_19', title: "Don't Make Me Think",        author: 'Steve Krug',            genre: 'Design',         year: 2014, pages: 216, cover: '#E91E63', isbn: '978-0321965516',   status: 'reserved',   borrowerId: 'user_8',  dueDate: null,          progress: 0 },
  { _id: 'book_20', title: 'The Art of War',             author: 'Sun Tzu',               genre: 'Philosophy',     year: -500, pages: 68,  cover: '#34495E', isbn: '978-1590302255',   status: 'available',  borrowerId: null,      dueDate: null,          progress: 0 },
];

// ============================================================
// MIGRATION LOGIC
// ============================================================

async function migrate() {
  await connectDB();
  console.log('🚀 Starting migration to 3-collection architecture…\n');

  // ── 1. Clear target collections ──
  await User.deleteMany({});
  await Book.deleteMany({});
  await Transaction.deleteMany({});
  console.log('🗑️  Cleared User, Book, Transaction collections');

  // ── 2. Insert Users ──
  //    Keep old fields for backward-compat but add new counters.
  //    We'll recalculate counts from transactions after step 3.
  const usersToInsert = oldUsers.map(u => ({
    ...u,
    activeBorrowCount: 0,
    activeReserveCount: 0,
    credits: u.credits || 5000,
  }));

  const insertedUsers = await User.insertMany(usersToInsert);
  console.log(`👥 Inserted ${insertedUsers.length} users`);

  // ── 3. Transform & Insert Books ──
  //    Map old flat status → totalCopies / availableCopies inventory model.
  const booksToInsert = oldBooks.map(b => {
    const base = {
      _id: b._id,
      title: b.title,
      author: b.author,
      genre: b.genre,
      year: b.year,
      pages: b.pages,
      cover: b.cover,
      isbn: b.isbn,
      totalCopies: 1,
    };

    // available copies = 0 if currently borrowed, 1 otherwise
    if (b.status === 'borrowed') {
      base.availableCopies = 0;
    } else {
      base.availableCopies = 1;
    }

    // Set credit cost based on genre (premium genres cost more)
    const premiumGenres = ['Technology', 'Business', 'Design', 'Science'];
    base.creditCost = premiumGenres.includes(b.genre) ? 200 : 100;

    return base;
  });

  const insertedBooks = await Book.insertMany(booksToInsert);
  console.log(`📖 Inserted ${insertedBooks.length} books`);

  // ── 4. Create Transactions from old borrowerId data ──
  const transactionsToInsert = [];
  const userBorrowCounts = {};   // userId → borrow count
  const userReserveCounts = {};  // userId → reserve count
  const userBookIds = {};        // userId → [bookId, …]  (for backward-compat)
  const now = new Date('2026-06-28'); // demo "today"

  for (const oldBook of oldBooks) {
    if (!oldBook.borrowerId) continue; // available book → no transaction

    const txStatus = oldBook.status === 'reserved' ? 'reserved' : 'active';
    const tx = {
      user: oldBook.borrowerId,
      book: oldBook._id,
      borrowDate: now,
      dueDate: oldBook.dueDate ? new Date(oldBook.dueDate) : undefined,
      returnDate: null,
      status: txStatus,
      progress: oldBook.progress || 0,
    };

    // Remove undefined fields
    if (tx.dueDate === undefined) delete tx.dueDate;

    transactionsToInsert.push(tx);

    // Count per user
    if (!userBorrowCounts[oldBook.borrowerId]) userBorrowCounts[oldBook.borrowerId] = 0;
    if (!userReserveCounts[oldBook.borrowerId]) userReserveCounts[oldBook.borrowerId] = 0;
    if (!userBookIds[oldBook.borrowerId]) userBookIds[oldBook.borrowerId] = { borrowed: [], reserved: [] };

    if (txStatus === 'reserved') {
      userReserveCounts[oldBook.borrowerId]++;
      userBookIds[oldBook.borrowerId].reserved.push(oldBook._id);
    } else {
      userBorrowCounts[oldBook.borrowerId]++;
      userBookIds[oldBook.borrowerId].borrowed.push(oldBook._id);
    }
  }

  let insertedTxs = [];
  if (transactionsToInsert.length > 0) {
    insertedTxs = await Transaction.insertMany(transactionsToInsert);
  }
  console.log(`📋 Inserted ${insertedTxs.length} transactions`);

  // ── 5. Update User counters to match reality ──
  //    Also count "due this week" for booksDue display field
  const weekFromNow = new Date('2026-07-05');
  const usersToUpdate = [];

  for (const u of oldUsers) {
    const borrowCount = userBorrowCounts[u._id] || 0;
    const reserveCount = userReserveCounts[u._id] || 0;
    const borrowedIds = userBookIds[u._id]?.borrowed || [];
    const reservedIds = userBookIds[u._id]?.reserved || [];

    // Count books due within 7 days
    let dueThisWeek = 0;
    for (const tx of transactionsToInsert) {
      if (tx.user === u._id && tx.status !== 'reserved' && tx.dueDate) {
        const daysLeft = Math.ceil((tx.dueDate - now) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 7) {
          dueThisWeek++;
        }
      }
    }

    usersToUpdate.push({
      _id: u._id,
      activeBorrowCount: borrowCount,
      activeReserveCount: reserveCount,
      booksBorrowed: borrowCount,
      booksDue: dueThisWeek,
      booksReserved: reserveCount,
    });
  }

  // Bulk update each user
  for (const update of usersToUpdate) {
    await User.findByIdAndUpdate(update._id, {
      $set: {
        activeBorrowCount: update.activeBorrowCount,
        activeReserveCount: update.activeReserveCount,
        booksBorrowed: update.booksBorrowed,
        booksDue: update.booksDue,
        booksReserved: update.booksReserved,
      },
    });
  }

  // ── 6. Print summary ──
  const totalUsers = await User.countDocuments();
  const totalBooks = await Book.countDocuments();
  const totalTxs = await Transaction.countDocuments();
  const activeTxs = await Transaction.countDocuments({ status: { $in: ['active', 'overdue'] } });
  const reservedTxs = await Transaction.countDocuments({ status: 'reserved' });
  const availableBooks = await Book.countDocuments({ availableCopies: { $gt: 0 } });

  console.log('\n✅ Migration complete!\n');
  console.log('═══════════════════════════════════════');
  console.log('  Collection        Documents');
  console.log('  ─────────         ─────────');
  console.log(`  users             ${totalUsers}`);
  console.log(`  books             ${totalBooks}  (${availableBooks} available)`);
  console.log(`  transactions      ${totalTxs}  (${activeTxs} active, ${reservedTxs} reserved)`);
  console.log('═══════════════════════════════════════\n');

  await closeDB();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});