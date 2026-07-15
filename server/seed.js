import { connectDB, getDB, closeDB } from './db.js';

const users = [
  { _id: 'user_1',  name: 'Brainy',              identifier: 'LUM-2026-8834',   email: 'brainy@ttu.edu',          password: 'password123', avatar: 'BN', joined: '2024-01-15', activeBorrowCount: 4, activeReserveCount: 1, booksBorrowed: 28, booksDue: 1, booksReserved: 1, credits: 4500, favourites: ['book_03', 'book_05', 'book_06', 'book_11', 'book_16', 'book_01', 'book_02', 'book_07', 'book_04', 'book_10', 'book_20', 'book_14'], finished: ['book_03', 'book_05', 'book_06', 'book_11', 'book_16', 'book_02', 'book_07', 'book_04', 'book_10', 'book_20', 'book_14', 'book_12', 'book_08', 'book_15', 'book_09', 'book_17', 'book_18', 'book_19', 'book_13', 'book_01', 'Design Systems', 'Clean Code', 'The Modern Grid', 'The Pragmatic Programmer', 'Refactoring UI', 'The Great Gatsby', 'Sapiens', 'Dune'], queryInterested: ['Architecture', 'Urban Design', 'Physics', 'Biophysics', 'History', 'Philosophy'], genre: ['Architecture', 'Urban Design', 'Physics', 'Biophysics', 'History', 'Philosophy', 'Design', 'Technology'] },
  { _id: 'user_2',  name: 'Maya Patel',          identifier: '2023-STU-0456',   email: 'maya.patel@ttu.edu',      password: 'password123', avatar: 'MP', joined: '2023-09-01', activeBorrowCount: 3, activeReserveCount: 2, booksBorrowed: 15, booksDue: 1, booksReserved: 2, credits: 3200, favourites: ['book_07', 'book_04', 'book_14'], finished: ['book_07', 'book_04', 'book_14', 'book_02', 'book_08'], queryInterested: ['History', 'Science', 'Classic'], genre: ['History', 'Science', 'Classic'] },
  { _id: 'user_3',  name: "James O'Connor",      identifier: '2024-STU-1123',   email: 'james.oconnor@ttu.edu',   password: 'password123', avatar: 'JO', joined: '2024-02-20', activeBorrowCount: 5, activeReserveCount: 0, booksBorrowed: 22, booksDue: 3, booksReserved: 0, credits: 5000, favourites: ['book_09', 'book_10', 'book_01', 'book_15'], finished: ['book_09', 'book_10', 'book_01', 'book_15', 'book_07', 'book_02'], queryInterested: ['Self-Help', 'Psychology', 'Fiction'], genre: ['Self-Help', 'Psychology', 'Fiction'] },
  { _id: 'user_4',  name: 'Sakura Tanaka',       identifier: '2022-STU-0789',   email: 'sakura.tanaka@ttu.edu',   password: 'password123', avatar: 'ST', joined: '2022-08-10', activeBorrowCount: 2, activeReserveCount: 4, booksBorrowed: 18, booksDue: 0, booksReserved: 4, credits: 1800, favourites: ['book_11', 'book_05', 'book_03', 'book_17'], finished: ['book_11', 'book_05', 'book_03', 'book_17', 'book_18'], queryInterested: ['Technology', 'Business', 'Productivity'], genre: ['Technology', 'Business'] },
  { _id: 'user_5',  name: 'David Kim',           identifier: '2025-STU-0034',   email: 'david.kim@ttu.edu',       password: 'password123', avatar: 'DK', joined: '2025-01-05', activeBorrowCount: 1, activeReserveCount: 3, booksBorrowed: 10, booksDue: 1, booksReserved: 3, credits: 2500, favourites: ['book_13', 'book_09', 'book_18'], finished: ['book_13', 'book_09', 'book_18'], queryInterested: ['Memoir', 'Self-Help', 'Productivity'], genre: ['Memoir', 'Productivity'] },
  { _id: 'user_6',  name: 'Emma Williams',       identifier: '2023-STU-0567',   email: 'emma.williams@ttu.edu',   password: 'password123', avatar: 'EW', joined: '2023-10-12', activeBorrowCount: 6, activeReserveCount: 1, booksBorrowed: 20, booksDue: 4, booksReserved: 1, credits: 4500, favourites: ['book_01', 'book_15', 'book_02'], finished: ['book_01', 'book_15', 'book_02', 'book_14', 'book_13'], queryInterested: ['Fiction', 'Classic', 'Memoir'], genre: ['Fiction', 'Classic'] },
  { _id: 'user_7',  name: 'Liam Ngyuen',         identifier: '2024-STU-0234',   email: 'liam.nguyen@ttu.edu',     password: 'password123', avatar: 'LN', joined: '2024-03-08', activeBorrowCount: 3, activeReserveCount: 2, booksBorrowed: 16, booksDue: 2, booksReserved: 2, credits: 5000, favourites: ['book_17', 'book_05', 'book_11'], finished: ['book_17', 'book_05', 'book_11', 'book_03'], queryInterested: ['Business', 'Technology'], genre: ['Business', 'Technology'] },
  { _id: 'user_8',  name: 'Sofia Rodriguez',     identifier: '2022-STU-0912',   email: 'sofia.rodriguez@ttu.edu', password: 'password123', avatar: 'SR', joined: '2022-11-30', activeBorrowCount: 7, activeReserveCount: 0, booksBorrowed: 25, booksDue: 5, booksReserved: 0, credits: 1000, favourites: ['book_19', 'book_06', 'book_16'], finished: ['book_19', 'book_06', 'book_16', 'book_12', 'book_07'], queryInterested: ['Design', 'Dystopian', 'History'], genre: ['Design', 'History'] },
  { _id: 'user_9',  name: 'Oliver Chen',         identifier: '2025-STU-0012',   email: 'oliver.chen@ttu.edu',     password: 'password123', avatar: 'OC', joined: '2025-02-14', activeBorrowCount: 2, activeReserveCount: 1, booksBorrowed: 12, booksDue: 0, booksReserved: 1, credits: 5000, favourites: ['book_04', 'book_08', 'book_10'], finished: ['book_04', 'book_08', 'book_10', 'book_20', 'book_07'], queryInterested: ['Science', 'Science Fiction', 'Psychology'], genre: ['Science', 'Science Fiction'] },
  { _id: 'user_10', name: 'Isabella Müller',     identifier: '2023-STU-0345',   email: 'isabella.muller@ttu.edu', password: 'password123', avatar: 'IM', joined: '2023-06-22', activeBorrowCount: 4, activeReserveCount: 3, booksBorrowed: 19, booksDue: 2, booksReserved: 3, credits: 3500, favourites: ['book_12', 'book_08', 'book_20'], finished: ['book_12', 'book_08', 'book_20', 'book_07', 'book_10', 'book_04'], queryInterested: ['Dystopian', 'Science Fiction', 'Philosophy'], genre: ['Dystopian', 'Philosophy'] },
];

const books = [
  { _id: 'book_01',  title: 'The Silent Patient',       author: 'Alex Michaelides',      genre: 'Fiction',       year: 2019, pages: 336, cover: '#485E78', isbn: '978-1250301697',   availableCopies: 0, totalCopies: 1, totalSaved: 15, totalFinished: 8 },
  { _id: 'book_02',  title: 'The Great Gatsby',          author: 'F. Scott Fitzgerald',   genre: 'Classic',        year: 1925, pages: 180, cover: '#C4A44A', isbn: '978-0743273565',   availableCopies: 1, totalCopies: 1, totalSaved: 22, totalFinished: 18 },
  { _id: 'book_03',  title: 'Design Systems',            author: 'Alla Kholmatova',       genre: 'Technology',     year: 2017, pages: 320, cover: '#E74C3C', isbn: '978-3945749586',   availableCopies: 0, totalCopies: 1, totalSaved: 35, totalFinished: 28 },
  { _id: 'book_04',  title: 'Brief Answers to the Big Questions', author: 'Stephen Hawking', genre: 'Science', year: 2018, pages: 256, cover: '#2D3E50', isbn: '978-1984819192',   availableCopies: 1, totalCopies: 1, totalSaved: 28, totalFinished: 20 },
  { _id: 'book_05',  title: 'Clean Code',                author: 'Robert C. Martin',      genre: 'Technology',     year: 2008, pages: 464, cover: '#27AE60', isbn: '978-0132350884',   availableCopies: 1, totalCopies: 1, totalSaved: 42, totalFinished: 36 },
  { _id: 'book_06',  title: 'The Modern Grid',           author: 'Julian Arnell',         genre: 'Design',         year: 2023, pages: 210, cover: '#6B5E4A', isbn: '978-1916332608',   availableCopies: 1, totalCopies: 1, totalSaved: 18, totalFinished: 12 },
  { _id: 'book_07',  title: 'Sapiens',                    author: 'Yuval Noah Harari',     genre: 'History',        year: 2015, pages: 464, cover: '#8E44AD', isbn: '978-0062316097',   availableCopies: 0, totalCopies: 1, totalSaved: 38, totalFinished: 32 },
  { _id: 'book_08',  title: 'Dune',                      author: 'Frank Herbert',         genre: 'Science Fiction', year: 1965, pages: 688, cover: '#D35400', isbn: '978-0441172719',   availableCopies: 1, totalCopies: 1, totalSaved: 25, totalFinished: 19 },
  { _id: 'book_09',  title: 'Atomic Habits',             author: 'James Clear',           genre: 'Self-Help',      year: 2018, pages: 320, cover: '#2980B9', isbn: '978-0735211292',   availableCopies: 0, totalCopies: 1, totalSaved: 45, totalFinished: 38 },
  { _id: 'book_10', title: 'Thinking, Fast and Slow',    author: 'Daniel Kahneman',       genre: 'Psychology',     year: 2011, pages: 499, cover: '#F39C12', isbn: '978-0374533557',   availableCopies: 1, totalCopies: 1, totalSaved: 30, totalFinished: 24 },
  { _id: 'book_11', title: 'The Pragmatic Programmer',    author: 'David Thomas',          genre: 'Technology',     year: 2019, pages: 352, cover: '#1ABC9C', isbn: '978-0135957059',   availableCopies: 0, totalCopies: 1, totalSaved: 32, totalFinished: 26 },
  { _id: 'book_12', title: '1984',                       author: 'George Orwell',         genre: 'Dystopian',      year: 1949, pages: 328, cover: '#C0392B', isbn: '978-0451524935',   availableCopies: 1, totalCopies: 1, totalSaved: 28, totalFinished: 22 },
  { _id: 'book_13', title: 'Educated',                   author: 'Tara Westover',         genre: 'Memoir',         year: 2018, pages: 352, cover: '#16A085', isbn: '978-0399590504',   availableCopies: 0, totalCopies: 1, totalSaved: 24, totalFinished: 18 },
  { _id: 'book_14', title: 'To Kill a Mockingbird',      author: 'Harper Lee',            genre: 'Classic',        year: 1960, pages: 281, cover: '#7F8C8D', isbn: '978-0446310789',   availableCopies: 1, totalCopies: 1, totalSaved: 35, totalFinished: 28 },
  { _id: 'book_15', title: 'The Alchemist',              author: 'Paulo Coelho',          genre: 'Fiction',        year: 1988, pages: 197, cover: '#E67E22', isbn: '978-0062315007',   availableCopies: 0, totalCopies: 1, totalSaved: 40, totalFinished: 34 },
  { _id: 'book_16', title: 'Refactoring UI',             author: 'Adam Wathan',           genre: 'Design',         year: 2018, pages: 372, cover: '#9B59B6', isbn: '978-1981241098',   availableCopies: 1, totalCopies: 1, totalSaved: 26, totalFinished: 20 },
  { _id: 'book_17', title: 'The Lean Startup',           author: 'Eric Ries',             genre: 'Business',       year: 2011, pages: 336, cover: '#2C3E50', isbn: '978-0307887894',   availableCopies: 0, totalCopies: 1, totalSaved: 30, totalFinished: 24 },
  { _id: 'book_18', title: 'Deep Work',                  author: 'Cal Newport',           genre: 'Productivity',   year: 2016, pages: 304, cover: '#3498DB', isbn: '978-1455586691',   availableCopies: 1, totalCopies: 1, totalSaved: 22, totalFinished: 16 },
  { _id: 'book_19', title: "Don't Make Me Think",        author: 'Steve Krug',            genre: 'Design',         year: 2014, pages: 216, cover: '#E91E63', isbn: '978-0321965516',   availableCopies: 1, totalCopies: 1, totalSaved: 20, totalFinished: 14 },
  { _id: 'book_20', title: 'The Art of War',             author: 'Sun Tzu',               genre: 'Philosophy',     year: -500, pages: 68,  cover: '#34495E', isbn: '978-1590302255',   availableCopies: 1, totalCopies: 1, totalSaved: 18, totalFinished: 12 },
];

const activities = [
  { _id: 'act_1', userId: 'user_1', time: 'Today, 10:24 AM',  text: 'Renewed "Design Systems"',                             dotColor: '#366380' },
  { _id: 'act_2', userId: 'user_1', time: 'Yesterday',         text: 'Returned "The Great Gatsby"',                          dotColor: '#F59E0B' },
  { _id: 'act_3', userId: 'user_1', time: 'Oct 24, 2023',      text: 'Reserved "Clean Code"',                                dotColor: '#10B981' },
  { _id: 'act_4', userId: 'user_1', time: 'Oct 20, 2023',      text: 'Borrowed "The Silent Patient"',                        dotColor: '#366380' },
  { _id: 'act_5', userId: 'user_1', time: 'Oct 18, 2023',      text: 'Extended due date for "Design Systems"',               dotColor: '#F59E0B' },
];

async function seed() {
  await connectDB();
  const db = getDB();
  console.log('🌱 Seeding TTU_Library_Demo...\n');

  // Clear existing data
  await db.collection('users').deleteMany({});
  await db.collection('books').deleteMany({});
  await db.collection('activities').deleteMany({});
  console.log('🗑️  Cleared existing collections');

  // Insert fresh data
  const userResult = await db.collection('users').insertMany(users);
  console.log(`👥 Inserted ${userResult.insertedCount} users`);

  const bookResult = await db.collection('books').insertMany(books);
  console.log(`📖 Inserted ${bookResult.insertedCount} books`);

  const actResult = await db.collection('activities').insertMany(activities);
  console.log(`📋 Inserted ${actResult.insertedCount} activities`);

  console.log('\n✅ Seed complete!\n');

  // Verify
  const userCount = await db.collection('users').countDocuments();
  const bookCount = await db.collection('books').countDocuments();
  console.log(`   Database now has: ${userCount} users, ${bookCount} books`);

  await closeDB();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});