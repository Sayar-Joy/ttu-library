# 🔑 Getting Your Supabase Credentials (New UI - 2026)

Supabase has updated their API interface. Here's how to get your credentials:

---

## Step 1: Get Your Project URL

1. In Supabase dashboard, look at the **top-left corner** of your project
2. You'll see your project name: **TTU_library**
3. The Project URL format is: `https://[PROJECT_REF].supabase.co`

**To find your exact Project URL:**
- Click on **"Project Settings"** (gear icon ⚙️) in the left sidebar
- Stay on the **"General"** tab
- Look for **"Reference ID"** or scroll down to find **"API URL"** or **"Project URL"**
- Copy the URL that looks like: `https://xxxxxxxxxx.supabase.co`

---

## Step 2: Get Your API Keys

You're already on the right page! On the **Settings → API Keys** page, you need:

### Option A: Use Legacy Keys (Recommended for this project)

**Scroll down on the API Keys page** until you see a section called:
- **"Legacy anon, service_role API keys"** or
- **"Project API keys"**

There you'll find:
- **anon public** key (starts with `eyJ...`) - This is your `SUPABASE_ANON_KEY`
- **service_role** key (starts with `eyJ...`) - This is your `SUPABASE_SERVICE_ROLE_KEY`

### Option B: Use New Keys (Alternative)

If you can't find the legacy section, you can use the new keys:

1. **Publishable key**: 
   - Copy the value that looks like: `sb_publishable_fS7Oeucqq9bH98pDs7w0Pw_PMQpS-xE`
   - This is your `SUPABASE_ANON_KEY`

2. **Secret key**:
   - Click the **dots (••••)** to reveal it
   - Copy the full secret key that starts with `sb_secret_...`
   - This is your `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 3: Update Your .env File

Open your `.env` file and fill in:

```env
# Example with legacy keys:
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3M...

# OR with new keys:
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_ANON_KEY=sb_publishable_fS7Oeucqq9bH98pDs7w0Pw_PMQpS-xE
SUPABASE_SERVICE_ROLE_KEY=sb_secret_APIGZ...your_full_secret_key

PORT=3001
NODE_ENV=development
```

---

## Quick Visual Guide

Your Supabase dashboard structure:

```
Supabase Dashboard
├── Your Project: TTU_library
│   ├── SQL Editor ← (Run schema here)
│   ├── Authentication
│   └── Project Settings ⚙️
│       ├── General ← (Find Project URL here)
│       └── API Keys ← (YOU ARE HERE)
│           ├── New Keys Section (top)
│           │   ├── Publishable key
│           │   └── Secret key
│           └── Legacy Keys Section (scroll down)
│               ├── anon public
│               └── service_role
```

---

## What to Copy

You need exactly **3 values**:

| What | Where to Find | Example |
|------|--------------|---------|
| SUPABASE_URL | Settings → General | `https://xyz123.supabase.co` |
| SUPABASE_ANON_KEY | Settings → API Keys → Publishable/anon | `eyJ...` or `sb_publishable_...` |
| SUPABASE_SERVICE_ROLE_KEY | Settings → API Keys → Secret/service_role | `eyJ...` or `sb_secret_...` |

---

## Can't Find Something?

### Can't find Project URL?
- Click **Project Settings** → **General** tab
- Look for "API URL" or "Reference ID"

### Can't find Legacy Keys?
- On the API Keys page, scroll all the way down
- Look for a section labeled "Legacy" or "Project API keys"
- If you still can't find it, use the new keys (Option B above)

### Keys don't work?
- Make sure there are no extra spaces when copying
- Make sure the URL starts with `https://`
- Try using the legacy keys instead of new keys (or vice versa)

---

## ✅ After You Get Your Credentials

1. Paste them into `.env` file
2. Run the SQL schema in SQL Editor (from SETUP_INSTRUCTIONS.md Step 1)
3. Run: `npm run seed:supabase`
4. Run: `npm run server`

---

**Still stuck?** Share a screenshot of your Settings → General page and I can help identify your Project URL!
