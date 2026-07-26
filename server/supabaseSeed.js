import supabase from './supabase.js';

/**
 * Supabase Seed Script — Full Library Data
 * 
 * Populates books with ALL fields:
 *   title, author, publisher, edition, publication_year, class_no,
 *   isbn, cover_url, category, review, total_pages, size
 *
 * Each book gets realistic physical copies (accession_no, date, price, etc.)
 * 
 * Run: node server/supabaseSeed.js
 */

// ════════════════════════════════════════════════════════════
// BOOKS DATA (with all 12 fields from the user's structure)
// ════════════════════════════════════════════════════════════

const booksData = [
  {
    title: 'The Silent Patient',
    author: 'Alex Michaelides',
    publisher: 'Celadon Books',
    edition: '1st',
    publication_year: 2019,
    class_no: 'FIC-001',
    isbn: '978-1250301697',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1582759969i/40097951.jpg',
    category: 'Fiction / Thriller',
    review: 'A gripping psychological thriller about a famous painter who stops speaking after allegedly murdering her husband. Highly recommended for mystery lovers.',
    total_pages: 325,
    size: '21 × 14 cm',
    place_of_publication: 'New York, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-001-01', price: 15000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-001-02', price: 15000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Clean Code',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    edition: '1st',
    publication_year: 2008,
    class_no: 'TEC-001',
    isbn: '978-0132350884',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1436202607i/3735293.jpg',
    category: 'Technology / Software Engineering',
    review: 'A must-read handbook for writing maintainable, readable code. Essential for every computer science student and professional developer.',
    total_pages: 464,
    size: '23.5 × 17.5 cm',
    place_of_publication: 'Upper Saddle River, NJ, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-002-01', price: 22000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-002-02', price: 22000, how_obtained: 'Donation', remark: 'Donated by CS Dept' },
      { accession_no: 'ACC-002-03', price: 22000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    publisher: 'Harper',
    edition: '1st',
    publication_year: 2015,
    class_no: 'HIS-001',
    isbn: '978-0062316097',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1703329310i/23692271.jpg',
    category: 'History / Anthropology',
    review: 'A sweeping narrative of human history from the Stone Age to the modern era. Thought-provoking and accessible to all readers.',
    total_pages: 443,
    size: '23 × 15 cm',
    place_of_publication: 'New York, USA',
    is_translated: true,
    original_title: 'קיצור תולדות האנושות',
    original_author: 'יובל נח הררי',
    translator: 'John Purcell, Haim Watzman',
    copies: [
      { accession_no: 'ACC-003-01', price: 18000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-003-02', price: 18000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    publisher: 'Avery',
    edition: '1st',
    publication_year: 2018,
    class_no: 'SEL-001',
    isbn: '978-0735211292',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg',
    category: 'Self-Help / Productivity',
    review: 'Practical strategies for building good habits and breaking bad ones. Backed by scientific research and real-world examples.',
    total_pages: 320,
    size: '21 × 14 cm',
    place_of_publication: 'New York, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-004-01', price: 16000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-004-02', price: 16000, how_obtained: 'Grant', remark: 'Library Grant 2024' },
    ]
  },
  {
    title: 'The Pragmatic Programmer',
    author: 'David Thomas & Andrew Hunt',
    publisher: 'Addison-Wesley',
    edition: '20th Anniversary',
    publication_year: 2019,
    class_no: 'TEC-002',
    isbn: '978-0135957059',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1401432508i/4099.jpg',
    category: 'Technology / Software Engineering',
    review: 'Timeless advice for software developers on pragmatic approaches to coding, design, and career growth.',
    total_pages: 352,
    size: '23 × 15.5 cm',
    place_of_publication: 'Boston, MA, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-005-01', price: 25000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-005-02', price: 25000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Dune',
    author: 'Frank Herbert',
    publisher: 'Ace Books',
    edition: '40th Anniversary',
    publication_year: 1965,
    class_no: 'FIC-002',
    isbn: '978-0441172719',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1555447414i/44767458.jpg',
    category: 'Fiction / Science Fiction',
    review: 'The greatest science fiction novel of all time. A tale of politics, religion, ecology, and human potential set on the desert planet Arrakis.',
    total_pages: 688,
    size: '21 × 14 cm',
    place_of_publication: 'New York, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-006-01', price: 12000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-006-02', price: 12000, how_obtained: 'Donation', remark: 'Alumni donation' },
      { accession_no: 'ACC-006-03', price: 14000, how_obtained: 'Purchase', remark: 'Replacement copy' },
    ]
  },
  {
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    publisher: 'Farrar, Straus and Giroux',
    edition: '1st',
    publication_year: 2011,
    class_no: 'PSY-001',
    isbn: '978-0374533557',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1317793965i/11468377.jpg',
    category: 'Psychology / Behavioral Science',
    review: 'Nobel laureate Daniel Kahneman explores the two systems that drive human thinking — fast intuition and slow deliberation.',
    total_pages: 499,
    size: '23.5 × 15.5 cm',
    place_of_publication: 'New York, USA',
    is_translated: true,
    original_title: 'Thinking, Fast and Slow',
    original_author: 'Daniel Kahneman',
    translator: 'Amos Tversky (contributions)',
    copies: [
      { accession_no: 'ACC-007-01', price: 19000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-007-02', price: 19000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    publisher: 'Scribner',
    edition: 'Reprint',
    publication_year: 1925,
    class_no: 'FIC-003',
    isbn: '978-0743273565',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1490528560i/4671.jpg',
    category: 'Fiction / Classic Literature',
    review: 'A masterpiece of American literature depicting the Jazz Age, the American Dream, and its disillusionment through the enigmatic Jay Gatsby.',
    total_pages: 180,
    size: '21 × 14 cm',
    place_of_publication: 'New York, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-008-01', price: 8000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-008-02', price: 8500, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: '1984',
    author: 'George Orwell',
    publisher: 'Signet Classic',
    edition: 'Reprint',
    publication_year: 1949,
    class_no: 'FIC-004',
    isbn: '978-0451524935',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1657781256i/61439040.jpg',
    category: 'Fiction / Dystopian',
    review: 'A chilling dystopian novel about totalitarianism, surveillance, and the manipulation of truth. More relevant than ever.',
    total_pages: 328,
    size: '18 × 11 cm',
    place_of_publication: 'London, UK',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-009-01', price: 9000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-009-02', price: 9500, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-009-03', price: 9000, how_obtained: 'Donation', remark: null },
    ]
  },
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    publisher: 'HarperCollins',
    edition: '50th Anniversary',
    publication_year: 1960,
    class_no: 'FIC-005',
    isbn: '978-0446310789',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1553383690i/2657.jpg',
    category: 'Fiction / Classic Literature',
    review: 'A Pulitzer Prize-winning novel about racial injustice in the American South, seen through the eyes of a young girl named Scout.',
    total_pages: 336,
    size: '21 × 14 cm',
    place_of_publication: 'Philadelphia, PA, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-010-01', price: 10000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-010-02', price: 10500, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Design Patterns',
    author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
    publisher: 'Addison-Wesley',
    edition: '1st',
    publication_year: 1994,
    class_no: 'TEC-003',
    isbn: '978-0201633610',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1348027904i/85009.jpg',
    category: 'Technology / Software Architecture',
    review: 'The "Gang of Four" classic that catalogs 23 essential design patterns for object-oriented software development.',
    total_pages: 395,
    size: '24 × 18.5 cm',
    place_of_publication: 'Boston, MA, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-011-01', price: 28000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-011-02', price: 28000, how_obtained: 'Grant', remark: 'Dept Grant 2023' },
    ]
  },
  {
    title: 'Educated',
    author: 'Tara Westover',
    publisher: 'Random House',
    edition: '1st',
    publication_year: 2018,
    class_no: 'BIO-001',
    isbn: '978-0399590504',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1506026635i/35133922.jpg',
    category: 'Biography / Memoir',
    review: 'A remarkable memoir of a woman who grows up in a survivalist family and educates herself to earn a PhD from Cambridge University.',
    total_pages: 334,
    size: '21 × 14 cm',
    place_of_publication: 'New York, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-012-01', price: 17000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
    publisher: 'MIT Press',
    edition: '4th',
    publication_year: 2022,
    class_no: 'TEC-004',
    isbn: '978-0262046305',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1387741681i/108986.jpg',
    category: 'Technology / Computer Science',
    review: 'The definitive textbook on algorithms, known as "CLRS." Covers data structures, sorting, graph algorithms, and advanced topics.',
    total_pages: 1312,
    size: '25.5 × 20 cm',
    place_of_publication: 'Cambridge, MA, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-013-01', price: 45000, how_obtained: 'Purchase', remark: 'Reference copy' },
      { accession_no: 'ACC-013-02', price: 45000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-013-03', price: 45000, how_obtained: 'Grant', remark: 'CS Dept Grant' },
    ]
  },
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    publisher: 'HarperOne',
    edition: '25th Anniversary',
    publication_year: 1988,
    class_no: 'FIC-006',
    isbn: '978-0062315007',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1654371463i/18144590.jpg',
    category: 'Fiction / Philosophical',
    review: 'A mystical fable about a shepherd boy who travels from Spain to Egypt in search of treasure and discovers the true meaning of life.',
    total_pages: 197,
    size: '20 × 13 cm',
    place_of_publication: 'San Francisco, CA, USA',
    is_translated: true,
    original_title: 'O Alquimista',
    original_author: 'Paulo Coelho',
    translator: 'Alan R. Clarke',
    copies: [
      { accession_no: 'ACC-014-01', price: 10000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-014-02', price: 10000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Brief Answers to the Big Questions',
    author: 'Stephen Hawking',
    publisher: 'Bantam',
    edition: '1st',
    publication_year: 2018,
    class_no: 'SCI-001',
    isbn: '978-1984819192',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1536862019i/40277241.jpg',
    category: 'Science / Physics',
    review: 'Stephen Hawking\'s final book tackles ten fundamental questions about the universe, God, time travel, and the future of humanity.',
    total_pages: 256,
    size: '22 × 14 cm',
    place_of_publication: 'London, UK',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-015-01', price: 14000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-015-02', price: 14000, how_obtained: 'Donation', remark: 'Physics Dept' },
    ]
  },
  {
    title: 'Computer Networking: A Top-Down Approach',
    author: 'James F. Kurose, Keith W. Ross',
    publisher: 'Pearson',
    edition: '8th',
    publication_year: 2021,
    class_no: 'TEC-005',
    isbn: '978-0135928608',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1348917706i/83847.jpg',
    category: 'Technology / Networking',
    review: 'The standard textbook for computer networking courses. Covers application layer, transport, network, and link layers with real-world examples.',
    total_pages: 800,
    size: '26 × 20 cm',
    place_of_publication: 'Hoboken, NJ, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-016-01', price: 35000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-016-02', price: 35000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'The Art of War',
    author: 'Sun Tzu',
    publisher: 'Shambhala',
    edition: 'Translated',
    publication_year: -500,
    class_no: 'PHI-001',
    isbn: '978-1590302255',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1453417993i/10534.jpg',
    category: 'Philosophy / Strategy',
    review: 'An ancient Chinese military treatise that has become a cornerstone of strategic thinking in business, politics, and everyday life.',
    total_pages: 273,
    size: '18 × 11 cm',
    place_of_publication: 'Boston, MA, USA',
    is_translated: true,
    original_title: '孫子兵法 (Sūnzǐ Bīngfǎ)',
    original_author: '孫武 (Sūn Wǔ)',
    translator: 'Thomas Cleary',
    copies: [
      { accession_no: 'ACC-017-01', price: 7000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Database System Concepts',
    author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
    publisher: 'McGraw-Hill',
    edition: '7th',
    publication_year: 2019,
    class_no: 'TEC-006',
    isbn: '978-0078022159',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1348495562i/161332.jpg',
    category: 'Technology / Database Systems',
    review: 'Comprehensive textbook covering relational databases, SQL, transaction processing, data storage, and modern topics like NoSQL and big data.',
    total_pages: 1376,
    size: '26 × 20.5 cm',
    place_of_publication: 'New York, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-018-01', price: 40000, how_obtained: 'Purchase', remark: 'Reference' },
      { accession_no: 'ACC-018-02', price: 40000, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Brave New World',
    author: 'Aldous Huxley',
    publisher: 'Harper Perennial',
    edition: 'Reprint',
    publication_year: 1932,
    class_no: 'FIC-007',
    isbn: '978-0060850524',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1575509280i/5129.jpg',
    category: 'Fiction / Dystopian',
    review: 'A dystopian novel envisioning a future of genetic engineering, social conditioning, and a pleasure-driven society that has lost its humanity.',
    total_pages: 288,
    size: '20 × 13 cm',
    place_of_publication: 'London, UK',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-019-01', price: 9500, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-019-02', price: 9500, how_obtained: 'Purchase', remark: null },
    ]
  },
  {
    title: 'Operating System Concepts',
    author: 'Abraham Silberschatz, Peter Baer Galvin, Greg Gagne',
    publisher: 'Wiley',
    edition: '10th',
    publication_year: 2018,
    class_no: 'TEC-007',
    isbn: '978-1119800361',
    cover_url: 'https://images-na.ssl-images-amazon.com/images/S/compressed.photo.goodreads.com/books/1348977553i/83833.jpg',
    category: 'Technology / Operating Systems',
    review: 'The "dinosaur book" — the standard reference for OS courses covering processes, threads, memory management, file systems, and security.',
    total_pages: 976,
    size: '26 × 20 cm',
    place_of_publication: 'Hoboken, NJ, USA',
    is_translated: false,
    original_title: null,
    original_author: null,
    translator: null,
    copies: [
      { accession_no: 'ACC-020-01', price: 38000, how_obtained: 'Purchase', remark: null },
      { accession_no: 'ACC-020-02', price: 38000, how_obtained: 'Grant', remark: 'Academic Grant' },
      { accession_no: 'ACC-020-03', price: 38000, how_obtained: 'Purchase', remark: null },
    ]
  },
];

// ════════════════════════════════════════════════════════════
// SEED FUNCTIONS
// ════════════════════════════════════════════════════════════

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');

  // Delete in FK-safe order
  const tables = [
    { name: 'notifications', col: 'id', val: '00000000-0000-0000-0000-000000000000' },
    { name: 'recommendations', col: 'id', val: '00000000-0000-0000-0000-000000000000' },
    { name: 'user_favorites', col: 'user_id', val: '00000000-0000-0000-0000-000000000000' },
    { name: 'transactions', col: 'id', val: '00000000-0000-0000-0000-000000000000' },
    { name: 'physical_copies', col: 'accession_no', val: 'NONE' },
    { name: 'books', col: 'id', val: '00000000-0000-0000-0000-000000000000' },
  ];

  for (const t of tables) {
    const { error } = await supabase.from(t.name).delete().neq(t.col, t.val);
    if (error && !error.message.includes('does not exist')) {
      console.log(`  ⚠️  ${t.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${t.name} cleared`);
    }
  }
}

async function seedBooks() {
  console.log('\n📚 Seeding books...');

  const bookRecords = booksData.map(b => ({
    title: b.title,
    author: b.author,
    publisher: b.publisher,
    edition: b.edition,
    publication_year: b.publication_year,
    class_no: b.class_no,
    isbn: b.isbn,
    cover_url: b.cover_url,
    category: b.category,
    review: b.review,
    total_pages: b.total_pages,
    size: b.size,
    place_of_publication: b.place_of_publication || null,
    is_translated: b.is_translated || false,
    original_title: b.original_title || null,
    original_author: b.original_author || null,
    translator: b.translator || null,
  }));

  const { data: insertedBooks, error } = await supabase
    .from('books')
    .insert(bookRecords)
    .select();

  if (error) {
    console.error('❌ Error seeding books:', error.message);
    throw error;
  }

  console.log(`✅ Inserted ${insertedBooks.length} books`);
  return insertedBooks;
}

async function seedPhysicalCopies(insertedBooks) {
  console.log('\n📦 Seeding physical copies...');

  const physicalCopies = [];

  // Map inserted book IDs back to the original data to get copy definitions
  insertedBooks.forEach((book, idx) => {
    const original = booksData[idx];
    if (!original?.copies) return;

    original.copies.forEach(copy => {
      physicalCopies.push({
        accession_no: copy.accession_no,
        book_id: book.id,
        date_acquired: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: copy.price,
        how_obtained: copy.how_obtained,
        remark: copy.remark,
        status: 'available',
      });
    });
  });

  const { data: insertedCopies, error } = await supabase
    .from('physical_copies')
    .insert(physicalCopies)
    .select();

  if (error) {
    console.error('❌ Error seeding copies:', error.message);
    throw error;
  }

  console.log(`✅ Inserted ${insertedCopies.length} physical copies`);
  return insertedCopies;
}

async function seedSampleTransactions(physicalCopies) {
  console.log('\n📝 Seeding sample transactions...');

  // Get existing student users
  const { data: students } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'student')
    .limit(10);

  if (!students || students.length === 0) {
    console.log('⚠️  No student users found. Skipping transactions.');
    return;
  }

  // Pick a few copies to mark as borrowed with active transactions
  const copiesToBorrow = physicalCopies.slice(0, Math.min(6, physicalCopies.length));
  const transactions = [];

  copiesToBorrow.forEach((copy, i) => {
    const student = students[i % students.length];
    const borrowDate = new Date(Date.now() - Math.random() * 10 * 24 * 60 * 60 * 1000);
    const dueDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    transactions.push({
      user_id: student.id,
      accession_no: copy.accession_no,
      borrow_date: borrowDate.toISOString(),
      due_date: dueDate.toISOString(),
      return_date: null,
      fine_status: 'no_fine',
      final_fine_amount: 0,
      progress_percentage: Math.floor(Math.random() * 80),
    });
  });

  const { data: insertedTx, error } = await supabase
    .from('transactions')
    .insert(transactions)
    .select();

  if (error) {
    console.error('❌ Error seeding transactions:', error.message);
    return;
  }

  // Update borrowed copies' status
  for (const tx of insertedTx) {
    await supabase
      .from('physical_copies')
      .update({ status: 'borrowed' })
      .eq('accession_no', tx.accession_no);
  }

  console.log(`✅ Inserted ${insertedTx.length} active transactions`);
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════

async function main() {
  console.log('🌱 Starting full database reseed...\n');
  console.log('═'.repeat(55));

  try {
    await clearDatabase();
    const insertedBooks = await seedBooks();
    const insertedCopies = await seedPhysicalCopies(insertedBooks);
    await seedSampleTransactions(insertedCopies);

    // Summary
    const { count: bookCount } = await supabase.from('books').select('*', { count: 'exact', head: true });
    const { count: copyCount } = await supabase.from('physical_copies').select('*', { count: 'exact', head: true });
    const { count: txCount } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });

    console.log('\n' + '═'.repeat(55));
    console.log('📊 SEED SUMMARY');
    console.log('═'.repeat(55));
    console.log(`   📚 Books:           ${bookCount}`);
    console.log(`   📦 Physical Copies: ${copyCount}`);
    console.log(`   👥 Users:           ${userCount} (preserved)`);
    console.log(`   📝 Transactions:    ${txCount}`);
    console.log('═'.repeat(55));
    console.log('\n✅ Reseed complete!\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message || err);
    process.exit(1);
  }
}

main();
