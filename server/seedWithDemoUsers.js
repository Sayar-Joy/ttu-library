import supabase from './supabase.js';

/**
 * Comprehensive Seed Script with Demo Users
 * Creates users via Supabase Auth, then seeds books, copies, and transactions
 */

// Demo users with 4-digit student IDs
const demoUsers = [
  { 
    name: 'Aung Kyaw Moe', 
    student_id: '2401', 
    roll_number: 'CS-2401',
    email: 'aungkyaw@ttu.edu.mm',
    password: 'password123',
    role: 'student',
    avatar_url: '👨‍🎓'
  },
  { 
    name: 'Hnin Ei Phyu', 
    student_id: '2402', 
    roll_number: 'CS-2402',
    email: 'hnin@ttu.edu.mm',
    password: 'password123',
    role: 'student',
    avatar_url: '👩‍🎓'
  },
  { 
    name: 'Zaw Min Oo', 
    student_id: '2403', 
    roll_number: 'IT-2403',
    email: 'zaw@ttu.edu.mm',
    password: 'password123',
    role: 'student',
    avatar_url: '👨‍💻'
  },
  { 
    name: 'Thida Win', 
    student_id: '2404', 
    roll_number: 'IT-2404',
    email: 'thida@ttu.edu.mm',
    password: 'password123',
    role: 'student',
    avatar_url: '👩‍💼'
  },
  { 
    name: 'Ko Librarian', 
    student_id: '9999', 
    roll_number: 'LIB-001',
    email: 'librarian@ttu.edu.mm',
    password: 'admin123',
    role: 'librarian',
    avatar_url: '📚'
  }
];

// Sample books data
const books = [
  { title: 'The Silent Patient', author: 'Alex Michaelides', publisher: 'Celadon Books', edition: '1st', publication_year: 2019, class_no: 'FIC-MIC', isbn: '978-1250301697', cover_url: '#485E78' },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', publisher: 'Scribner', edition: '2nd', publication_year: 1925, class_no: 'FIC-FIT', isbn: '978-0743273565', cover_url: '#C4A44A' },
  { title: 'Design Systems', author: 'Alla Kholmatova', publisher: 'Smashing Magazine', edition: '1st', publication_year: 2017, class_no: 'TEC-KHO', isbn: '978-3945749586', cover_url: '#E74C3C' },
  { title: 'Brief Answers to the Big Questions', author: 'Stephen Hawking', publisher: 'Bantam', edition: '1st', publication_year: 2018, class_no: 'SCI-HAW', isbn: '978-1984819192', cover_url: '#2D3E50' },
  { title: 'Clean Code', author: 'Robert C. Martin', publisher: 'Prentice Hall', edition: '1st', publication_year: 2008, class_no: 'TEC-MAR', isbn: '978-0132350884', cover_url: '#27AE60' },
  { title: 'The Modern Grid', author: 'Julian Arnell', publisher: 'Grid Press', edition: '1st', publication_year: 2023, class_no: 'DES-ARN', isbn: '978-1916332608', cover_url: '#6B5E4A' },
  { title: 'Sapiens', author: 'Yuval Noah Harari', publisher: 'Harper', edition: '1st', publication_year: 2015, class_no: 'HIS-HAR', isbn: '978-0062316097', cover_url: '#8E44AD' },
  { title: 'Dune', author: 'Frank Herbert', publisher: 'Ace Books', edition: '40th Anniversary', publication_year: 1965, class_no: 'FIC-HER', isbn: '978-0441172719', cover_url: '#D35400' },
  { title: 'Atomic Habits', author: 'James Clear', publisher: 'Avery', edition: '1st', publication_year: 2018, class_no: 'SEL-CLE', isbn: '978-0735211292', cover_url: '#2980B9' },
  { title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', publisher: 'Farrar, Straus and Giroux', edition: '1st', publication_year: 2011, class_no: 'PSY-KAH', isbn: '978-0374533557', cover_url: '#F39C12' },
  { title: 'The Pragmatic Programmer', author: 'David Thomas', publisher: 'Addison-Wesley', edition: '2nd', publication_year: 2019, class_no: 'TEC-THO', isbn: '978-0135957059', cover_url: '#1ABC9C' },
  { title: '1984', author: 'George Orwell', publisher: 'Signet Classic', edition: 'Reprint', publication_year: 1949, class_no: 'FIC-ORW', isbn: '978-0451524935', cover_url: '#C0392B' },
  { title: 'Educated', author: 'Tara Westover', publisher: 'Random House', edition: '1st', publication_year: 2018, class_no: 'BIO-WES', isbn: '978-0399590504', cover_url: '#16A085' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', publisher: 'HarperCollins', edition: '50th Anniversary', publication_year: 1960, class_no: 'FIC-LEE', isbn: '978-0446310789', cover_url: '#7F8C8D' },
  { title: 'The Alchemist', author: 'Paulo Coelho', publisher: 'HarperOne', edition: '25th Anniversary', publication_year: 1988, class_no: 'FIC-COE', isbn: '978-0062315007', cover_url: '#E67E22' },
];

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  // Delete in correct order (respecting foreign keys)
  await supabase.from('recommendations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('user_favorites').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('user_friends').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('physical_copies').delete().neq('accession_no', 'NONE');
  await supabase.from('books').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('✅ Database cleared');
}

async function createDemoUsers() {
  console.log('\n👥 Creating demo users with Supabase Auth...');
  
  const createdUsers = [];
  
  for (const userData of demoUsers) {
    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: userData.name,
          student_id: userData.student_id
        }
      });
      
      if (authError) {
        console.error(`   ❌ Failed to create auth user for ${userData.email}:`, authError.message);
        continue;
      }
      
      // 2. Create profile in users table
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          name: userData.name,
          student_id: userData.student_id,
          roll_number: userData.roll_number,
          email: userData.email,
          avatar_url: userData.avatar_url,
          role: userData.role
        }])
        .select()
        .single();
      
      if (profileError) {
        console.error(`   ❌ Failed to create profile for ${userData.email}:`, profileError.message);
        continue;
      }
      
      createdUsers.push(profileData);
      console.log(`   ✅ Created: ${userData.name} (${userData.student_id}) - ${userData.email}`);
      
    } catch (error) {
      console.error(`   ❌ Error creating ${userData.email}:`, error.message);
    }
  }
  
  console.log(`\n✅ Created ${createdUsers.length}/${demoUsers.length} demo users`);
  return createdUsers;
}

async function seedBooks() {
  console.log('\n📚 Seeding books...');
  
  const { data: insertedBooks, error } = await supabase
    .from('books')
    .insert(books)
    .select();
  
  if (error) {
    console.error('❌ Error seeding books:', error);
    throw error;
  }
  
  console.log(`✅ Inserted ${insertedBooks.length} books`);
  return insertedBooks;
}

async function seedPhysicalCopies(books) {
  console.log('\n📦 Seeding physical copies...');
  
  const physicalCopies = [];
  
  // Create 1-3 physical copies for each book
  books.forEach((book, index) => {
    const numCopies = Math.floor(Math.random() * 3) + 1; // 1-3 copies
    
    for (let i = 0; i < numCopies; i++) {
      const accessionNo = `ACC-${String(index + 1).padStart(3, '0')}-${String(i + 1).padStart(2, '0')}`;
      
      physicalCopies.push({
        accession_no: accessionNo,
        book_id: book.id,
        date_acquired: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        price: Math.floor(Math.random() * 20000) + 5000, // 5000-25000 kyats
        how_obtained: ['Purchase', 'Donation', 'Grant'][Math.floor(Math.random() * 3)],
        status: 'available', // All start as available
        remark: null
      });
    }
  });
  
  const { data: insertedCopies, error } = await supabase
    .from('physical_copies')
    .insert(physicalCopies)
    .select();
  
  if (error) {
    console.error('❌ Error seeding physical copies:', error);
    throw error;
  }
  
  console.log(`✅ Inserted ${insertedCopies.length} physical copies`);
  return insertedCopies;
}

async function seedDemoTransactions(users, physicalCopies) {
  console.log('\n📝 Creating demo transactions (active borrows)...');
  
  if (users.length === 0 || physicalCopies.length === 0) {
    console.log('⚠️  Skipping transactions - no users or copies available');
    return [];
  }
  
  const transactions = [];
  const numTransactions = Math.min(5, users.length, physicalCopies.length);
  
  // Create some active borrows
  for (let i = 0; i < numTransactions; i++) {
    const user = users[i % users.length];
    const copy = physicalCopies[i];
    
    // Some are on-time, some are overdue
    const daysAgo = Math.floor(Math.random() * 10) + 1; // 1-10 days ago
    const borrowDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const dueDate = new Date(borrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    transactions.push({
      user_id: user.id,
      accession_no: copy.accession_no,
      borrow_date: borrowDate.toISOString(),
      due_date: dueDate.toISOString(),
      return_date: null,
      fine_status: 'no_fine',
      final_fine_amount: 0,
      progress_percentage: Math.floor(Math.random() * 80) + 10 // 10-90%
    });
  }
  
  if (transactions.length === 0) return [];
  
  // Insert transactions
  const { data: insertedTx, error: txError } = await supabase
    .from('transactions')
    .insert(transactions)
    .select();
  
  if (txError) {
    console.error('❌ Error seeding transactions:', txError);
    return [];
  }
  
  // Update physical copy status to borrowed
  for (const tx of insertedTx) {
    await supabase
      .from('physical_copies')
      .update({ status: 'borrowed' })
      .eq('accession_no', tx.accession_no);
  }
  
  console.log(`✅ Created ${insertedTx.length} active transactions`);
  return insertedTx;
}

async function main() {
  console.log('🌱 Starting comprehensive seed with demo users...\n');
  
  try {
    // Clear existing data
    await clearDatabase();
    
    // Create demo users
    const users = await createDemoUsers();
    
    // Seed books
    const insertedBooks = await seedBooks();
    
    // Seed physical copies
    const insertedCopies = await seedPhysicalCopies(insertedBooks);
    
    // Create demo transactions
    const transactions = await seedDemoTransactions(users, insertedCopies);
    
    // Summary
    console.log('\n📊 Seed Summary:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Books: ${insertedBooks.length}`);
    console.log(`   Physical Copies: ${insertedCopies.length}`);
    console.log(`   Active Transactions: ${transactions.length}`);
    
    console.log('\n📧 Demo User Credentials:');
    console.log('   ┌─────────────────────────────────────────────────┐');
    demoUsers.forEach(user => {
      console.log(`   │ ${user.student_id} - ${user.email.padEnd(26)} │`);
      console.log(`   │ Password: ${user.password.padEnd(33)} │`);
    });
    console.log('   └─────────────────────────────────────────────────┘');
    
    console.log('\n✅ Seed complete! You can now login with any of the demo accounts.\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  }
}

main();
