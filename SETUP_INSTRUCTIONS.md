# 🔧 Connecting Your Supabase Database - Step by Step

Since you've already created an empty Supabase database, follow these steps to connect it:

---

## Step 1: Execute the SQL Schema in Supabase

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **"+ New Query"**
5. **Copy and paste this entire SQL schema:**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (profile table linked to auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    student_id TEXT UNIQUE,
    roll_number TEXT,
    email TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('student', 'librarian')) DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table (catalog/bibliographic data)
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT,
    edition TEXT,
    publication_year INTEGER,
    class_no TEXT,
    isbn TEXT,
    cover_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Physical copies table (inventory tracking)
CREATE TABLE physical_copies (
    accession_no TEXT PRIMARY KEY,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    date_acquired DATE,
    price INTEGER,
    how_obtained TEXT,
    remark TEXT,
    status TEXT CHECK (status IN ('available', 'borrowed', 'lost', 'maintenance')) DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table (borrowing records)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    accession_no TEXT NOT NULL REFERENCES physical_copies(accession_no),
    borrow_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    return_date TIMESTAMP WITH TIME ZONE,
    fine_status TEXT CHECK (fine_status IN ('no_fine', 'unpaid', 'paid')) DEFAULT 'no_fine',
    final_fine_amount INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- User friends (social features)
CREATE TABLE user_friends (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, friend_id)
);

-- User favorites (saved books)
CREATE TABLE user_favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, book_id)
);

-- Recommendations table
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT CHECK (status IN ('unread', 'read')) DEFAULT 'unread',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_physical_copies_book_id ON physical_copies(book_id);
CREATE INDEX idx_physical_copies_status ON physical_copies(status);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_accession_no ON transactions(accession_no);
CREATE INDEX idx_transactions_return_date ON transactions(return_date);
```

6. Click **"Run"** button (or press Cmd/Ctrl + Enter)
7. You should see "Success. No rows returned" message

---

## Step 2: Get Your Supabase Credentials

1. In your Supabase project, click **"Project Settings"** (gear icon ⚙️ in left sidebar)
2. Click on **"API"** in the settings menu
3. You'll see three important values:

   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
   - **service_role secret**: Long string starting with `eyJ...` (scroll down)

4. **Copy all three values** - you'll need them in the next step

---

## Step 3: Configure Your .env File

I've already created a `.env` file for you. Now update it with your credentials:

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
SUPABASE_URL=https://your-actual-project-ref.supabase.co
SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
PORT=3001
NODE_ENV=development
```

**⚠️ Important**: 
- Keep the `SUPABASE_SERVICE_ROLE_KEY` secret - never commit it to git
- The `.env` file is already in `.gitignore`

---

## Step 4: (Optional) Disable Email Confirmation for Testing

For easier testing, disable email confirmation:

1. In Supabase, go to **Authentication** → **Providers**
2. Click on **Email** provider
3. Toggle **OFF** the "Confirm email" option
4. Click **Save**

This allows you to test user registration without email verification.

---

## Step 5: Seed Your Database

Run the seed script to populate your database with test data:

```bash
npm run seed:supabase
```

This will create:
- 15 sample books
- 1-3 physical copies per book (with accession numbers like "ACC-001-01")
- Sample transactions for any existing users

---

## Step 6: Start Your Server

```bash
npm run server
```

You should see:
```
✅ Supabase connection successful
📚 TTU Library API running on http://localhost:3001
🔗 Database: Supabase (PostgreSQL)
🚀 Ready to serve requests
```

---

## Step 7: Test the Connection

Open a new terminal and test:

```bash
# Check health endpoint
curl http://localhost:3001/api/health

# Should return something like:
# {"status":"ok","database":"Supabase PostgreSQL","users":0,"books":15,"transactions":0}
```

---

## 🎉 You're Done!

Your Supabase database is now connected and ready. You can:

1. **Register a user**: Visit `http://localhost:3000` and sign up
2. **Browse books**: Navigate through the app
3. **Borrow books**: Test the borrowing system
4. **Check transactions**: View your borrowed books

---

## 📍 Where Are Your Credentials?

Your credentials are in three places:

1. **Supabase Dashboard**: 
   - URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api
   
2. **Local .env file**: 
   - Location: `/Users/hlyanpaingaung/Desktop/est/.env`
   
3. **Server reads from**: 
   - File: `server/supabase.js` (reads process.env variables)

---

## 🆘 Troubleshooting

### "Missing Supabase credentials" error
- Check that `.env` file exists and has correct values
- Restart the server after editing `.env`

### "Failed to connect to Supabase" error
- Verify your SUPABASE_URL is correct (should start with `https://`)
- Check that your keys don't have extra spaces

### "No rows returned" when seeding
- Make sure you ran the SQL schema first (Step 1)
- Check for any SQL errors in Supabase SQL Editor

---

**Need help?** Check the console logs - they provide detailed error messages.
