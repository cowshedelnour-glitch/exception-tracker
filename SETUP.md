# Exception Tracker — Setup Guide

## Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier is fine)

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com and sign in
2. Click **New Project**
3. Fill in:
   - **Name:** Exception Tracker
   - **Database Password:** (save this — you'll need it for DATABASE_URL)
   - **Region:** Choose nearest to you
4. Wait ~2 minutes for the project to initialize
5. Go to **Project Settings → API**
6. Copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

---

## Step 2: Get the Database Connection String

1. Go to **Project Settings → Database**
2. Scroll to **Connection Pooling**
3. Set **Pool Mode** to `Transaction`
4. Copy the **Connection string** (URI format)
5. Replace `[YOUR-PASSWORD]` with the database password you saved in Step 1
6. This is your `DATABASE_URL`

---

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```powershell
   Copy-Item .env.example .env.local
   ```
2. Open `.env.local` and fill in all four values:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`

---

## Step 4: Push the Database Schema

This creates all tables in your Supabase PostgreSQL database:
```powershell
npx drizzle-kit push
```

When prompted "Are you sure you want to push changes?", type `y` and press Enter.

Verify: Go to Supabase → **Table Editor** — you should see all 9 tables.

---

## Step 5: Run the SQL Migration (RLS, Triggers, Functions, Seed Data)

1. Go to Supabase → **SQL Editor**
2. Click **New Query**
3. Open `supabase/migrations/001_rls_triggers_functions.sql` from this project
4. Copy the entire file content and paste it into the SQL Editor
5. Click **Run**

Expected result: `Success. No rows returned.`

Verify:
- Go to **Table Editor → incident_categories** — you should see 7 rows
- Go to **Authentication → Policies** — you should see RLS policies on all tables

---

## Step 6: Seed the Root Admin Account

1. Go to Supabase → **Authentication → Users**
2. Click **Add User**
3. Fill in:
   - **Email:** admin@exceptiontracker.com (or your preferred admin email)
   - **Password:** (choose a strong password)
   - Click **Create User**
4. Copy the user's UUID from the Users table
5. Go to **SQL Editor** and run:
   ```sql
   UPDATE public.users
   SET role = 'admin', hr_id = 'ADMIN-001', full_name = 'System Administrator'
   WHERE id = '<paste-uuid-here>';
   ```

This promotes the user to Admin. No public UI exists for Admin registration.

---

## Step 7: Enable Supabase Realtime

1. Go to Supabase → **Database → Replication**
2. Under **Tables**, enable Realtime for the `notifications` table
3. This enables instant notification delivery without polling

---

## Step 8: Start the Development Server

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

---

## Verification Checklist

- [ ] `.env.local` has all 4 values filled in
- [ ] `npx drizzle-kit push` completed without errors
- [ ] 9 tables visible in Supabase Table Editor
- [ ] 7 incident categories in `incident_categories` table
- [ ] RLS policies visible in Supabase Authentication → Policies
- [ ] Admin user created and role updated to 'admin'
- [ ] Realtime enabled on `notifications` table
- [ ] `npm run dev` runs without errors