# 🚀 Library Management System - MongoDB to Supabase Migration Guide

## Overview

This guide documents the complete migration from MongoDB to Supabase PostgreSQL for the TTU Library Management System. The migration includes architectural changes to better handle relational data, physical inventory tracking, and a new fine-based system.

---

## 🎯 Key Architectural Changes

### 1. **Authentication System**
- **Before**: Local password storage in MongoDB
- **After**: Supabase Auth with secure authentication
- **Impact**: Users table is now a profile table linked to auth.users via UUID

### 2. **Inventory Management**
- **Before**: Books had a flat `status` and `availableCopies` counter
- **After**: Split into two tables:
  - `books` - Catalog/bibliographic metadata
  - `physical_copies` - Individual inventory items with unique `accession_no`
- **Impact**: Users borrow specific physical copies, not generic "books"

### 3. **Fine System**
- **Before**: Virtual credit system (users had credits deducted)
- **After**: Real fine system
  - **Loan Period**: 7 days (was 14 days)
  - **Fine Rate**: 50 kyats per day overdue
  - **Calculation**: Dynamic calculation during loan, saved on return
- **Impact**: No more credits field; fines are monetary

### 4. **Database Architecture**
- **Before**: MongoDB (NoSQL, document-based)
- **After**: Supabase PostgreSQL (Relational, SQL-based)
- **Impact**: Better referential integrity, relational queries, and data consistency

---

## 📋 Prerequisites

Before starting the migration:

1. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project

2. **Supabase Project Setup**
   - Note your project URL
   - Get your `anon` key and `service_role` key from Project Settings → API

3. **SQL Schema Applied**
   - Execute the SQL schema in your Supabase SQL Editor (provided in your task description)

---

## ⚙️ Setup Instructions

### Step 1: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials in `.env`:
   ```env
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your_anon_key_here
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

   # Server Configuration
   PORT=3001
   NODE_ENV=development
   ```

   **Important**: The `SUPABASE_SERVICE_ROLE_KEY` is required for server-side operations. Keep it secure and never expose it to the client.

### Step 2: Install Dependencies

Dependencies are already installed. If needed:
```bash
npm install
```

### Step 3: Seed the Database

Run the Supabase seed script to populate your database with test data:

```bash
npm run seed:supabase
```

This will create:
- 15 sample books
- 1-3 physical copies per book (with unique accession numbers)
- Sample transactions for existing users

**Note**: You need to create at least one user first through registration or the Supabase dashboard for the seed to create transactions.

### Step 4: Start the Server

```bash
npm run server
```

Or run both frontend and backend:
```bash
npm start
```

---

## 🗄️ Database Schema Reference

### Users Table
```sql
- id: UUID (from Supabase Auth)
- name: TEXT
- student_id: TEXT (unique)
- roll_number: TEXT
- email: TEXT (unique)
- avatar_url: TEXT
- role: TEXT (student/librarian)
- created_at: TIMESTAMP
```

### Books Table (Catalog)
```sql
- id: UUID
- title: TEXT
- author: TEXT
- publisher: TEXT
- edition: TEXT
- publication_year: INTEGER
- class_no: TEXT
- isbn: TEXT
- cover_url: TEXT
- created_at: TIMESTAMP
```

### Physical Copies Table (Inventory)
```sql
- accession_no: TEXT (PRIMARY KEY) - e.g., "ACC-001-01"
- book_id: UUID (→ books.id)
- date_acquired: DATE
- price: INTEGER (in kyats)
- how_obtained: TEXT (Purchase/Donation/Grant)
- remark: TEXT
- status: TEXT (available/borrowed/lost/maintenance)
- created_at: TIMESTAMP
```

### Transactions Table
```sql
- id: UUID
- user_id: UUID (→ users.id)
- accession_no: TEXT (→ physical_copies.accession_no)
- borrow_date: TIMESTAMP
- due_date: TIMESTAMP (borrow_date + 7 days)
- return_date: TIMESTAMP (NULL if active)
- fine_status: TEXT (no_fine/unpaid/paid)
- final_fine_amount: INTEGER (50 kyats/day)
- progress_percentage: INTEGER (0-100)
```

---

## 🔄 API Changes

### Authentication Endpoints

#### POST `/api/auth/register`
**Changed**: Now creates user in Supabase Auth + profile in users table
```json
{
  "name": "John Doe",
  "student_id": "STU-2024-001",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### POST `/api/auth/login`
**Changed**: Uses Supabase Auth
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
**Returns**: Includes `session` object with access token

### Transaction Endpoints

#### POST `/api/transactions/borrow`
**Changed**: Now requires `bookId`, optionally accepts `accessionNo`
```json
{
  "userId": "uuid",
  "bookId": "uuid",
  "accessionNo": "ACC-001-01" // optional, will auto-select if omitted
}
```

#### POST `/api/transactions/return`
**Changed**: Automatically calculates and saves fine
```json
{
  "transactionId": "uuid"
}
```
**Returns**: `final_fine_amount` if overdue

#### POST `/api/transactions/pay-fine` (NEW)
Mark a fine as paid
```json
{
  "transactionId": "uuid"
}
```

---

## 🚨 Breaking Changes

### Removed Features
1. **Credits System**: No longer exists
   - Old: `user.credits` field
   - New: Fine-based system

2. **Pre-booking/Reservations**: Temporarily removed
   - Will be reimplemented later if needed

3. **14-day Loan Period**:
   - Old: 14 days
   - New: 7 days

### Changed Fields

**User Object**:
- ❌ Removed: `credits`, `activeBorrowCount`, `booksBorrowed` (computed dynamically)
- ✅ New: UUID-based `id` from Supabase Auth
- ✅ Changed: `identifier` → `student_id`
- ✅ Changed: `avatar` (emoji) → `avatar_url` (text/URL)

**Book Object**:
- ✅ Added: `physical_copies` array (nested)
- ✅ Computed: `total_copies`, `available_copies`, `borrowed_copies`
- ❌ Removed: `creditCost`, `genre` fields

**Transaction Object**:
- ✅ Added: `accession_no` (which physical copy)
- ✅ Added: `fine_status`, `final_fine_amount`
- ✅ Changed: `progress` → `progress_percentage`
- ❌ Removed: `status` enum (computed from `return_date`)

---

## 📦 File Structure

### New Files Created
```
server/
├── supabase.js                 # Supabase client configuration
├── supabaseSeed.js             # New seed script for Supabase
├── services/                   # Service layer (replaces models)
│   ├── userService.js
│   ├── bookService.js
│   └── transactionService.js
```

### Modified Files
```
server/
├── index.js                    # Complete rewrite for Supabase
└── controllers/                # Will be removed (logic moved to services)
```

### Legacy Files (Can be deleted after migration)
```
server/
├── db.js                       # MongoDB connection
├── models/                     # Mongoose models
│   ├── User.js
│   ├── Book.js
│   └── Transaction.js
├── controllers/
│   └── bookController.js
├── seed.js                     # MongoDB seed
└── migrate.js                  # MongoDB migration
```

---

## 🧪 Testing the Migration

### 1. Test User Registration
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "student_id": "TEST-001",
    "email": "test@example.com",
    "password": "password123",
    "confirmPassword": "password123"
  }'
```

### 2. Test Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 3. Test Borrowing
```bash
curl -X POST http://localhost:3001/api/transactions/borrow \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "bookId": "book-uuid"
  }'
```

### 4. Check Health
```bash
curl http://localhost:3001/api/health
```

---

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` to version control
2. **Service Role Key**: Only use on the server, never expose to frontend
3. **Row Level Security**: Consider enabling RLS in Supabase for additional security
4. **API Keys**: Rotate keys regularly in production

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase credentials"
**Solution**: Ensure `.env` file exists with correct credentials

### Issue: "No rows returned" errors
**Solution**: Check that your SQL schema is properly applied in Supabase

### Issue: Users can't register
**Solution**: 
- Check email confirmation settings in Supabase Auth settings
- Disable email confirmation for testing (Auth → Settings → Email Auth)

### Issue: Can't borrow books
**Solution**: 
- Ensure physical_copies exist for the book
- Check that copies have status='available'

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## ✅ Migration Checklist

- [ ] Supabase project created
- [ ] SQL schema executed in Supabase
- [ ] `.env` file configured with credentials
- [ ] Dependencies installed
- [ ] Database seeded with test data
- [ ] Server starts without errors
- [ ] Can register new users
- [ ] Can login with registered users
- [ ] Can view books
- [ ] Can borrow books
- [ ] Can return books
- [ ] Fines calculate correctly
- [ ] Dashboard displays correctly
- [ ] Profile page works

---

## 🎉 Success Criteria

Your migration is successful when:

1. ✅ Server starts and connects to Supabase
2. ✅ Users can register and login
3. ✅ Books display with physical copy counts
4. ✅ Users can borrow specific physical copies
5. ✅ 7-day loan period enforced
6. ✅ Fines calculate at 50 kyats/day
7. ✅ Books return to 'available' status after return
8. ✅ All API endpoints respond correctly

---

**Need Help?** Check the console logs for detailed error messages. The server provides comprehensive logging for debugging.
