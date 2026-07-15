import supabase from './supabase.js';

/**
 * One-time script to create a librarian/admin account.
 * Run with: node server/createAdmin.js
 */

const ADMIN_EMAIL = 'admin@ttu-library.com';
const ADMIN_PASSWORD = 'Admin@2026!';
const ADMIN_NAME = 'Head Librarian';

async function createAdmin() {
  console.log('🔧 Creating librarian account...\n');

  // Step 1: Create auth user in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true, // Auto-confirm so they can log in immediately
    user_metadata: { name: ADMIN_NAME, role: 'librarian' },
  });

  if (authError) {
    // If user already exists, try to look them up
    if (authError.message.includes('already') || authError.status === 422) {
      console.log('⚠️  Auth user already exists. Checking users table...');

      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('email', ADMIN_EMAIL)
        .single();

      if (existing) {
        // Make sure role is librarian
        if (existing.role !== 'librarian') {
          await supabase
            .from('users')
            .update({ role: 'librarian' })
            .eq('id', existing.id);
          console.log('✅ Updated existing user role to librarian.');
        } else {
          console.log('✅ Account already exists with librarian role.');
        }

        console.log('\n═══════════════════════════════════════');
        console.log('  📧 Email:    ', ADMIN_EMAIL);
        console.log('  🔑 Password: ', ADMIN_PASSWORD);
        console.log('═══════════════════════════════════════\n');
        return;
      }
    }

    console.error('❌ Auth error:', authError.message);
    process.exit(1);
  }

  const authUser = authData.user;
  console.log('✅ Auth user created:', authUser.id);

  // Step 2: Insert profile into `users` table with role = 'librarian'
  const initials = ADMIN_NAME.split(' ').map(n => n[0]).join('').toUpperCase();

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .insert([{
      id: authUser.id,
      name: ADMIN_NAME,
      email: ADMIN_EMAIL,
      student_id: 'ADMIN-001',
      avatar_url: initials,
      role: 'librarian',
    }])
    .select()
    .single();

  if (profileError) {
    console.error('❌ Profile insert error:', profileError.message);
    process.exit(1);
  }

  console.log('✅ Librarian profile created:', profile.name);

  console.log('\n═══════════════════════════════════════');
  console.log('  🎉 ADMIN ACCOUNT READY');
  console.log('  📧 Email:    ', ADMIN_EMAIL);
  console.log('  🔑 Password: ', ADMIN_PASSWORD);
  console.log('  👤 Role:     ', profile.role);
  console.log('═══════════════════════════════════════\n');

  process.exit(0);
}

createAdmin();
