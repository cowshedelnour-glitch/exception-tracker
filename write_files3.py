import os

files = {
    r"SETUP.md": """# Exception Tracker — Setup Guide

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
- [ ] `npm run dev` runs without errors""",

    r"public\locales\en\common.json": """{
  "app": {
    "name": "Exception Tracker",
    "tagline": "Enterprise Exception & Compensation Management"
  },
  "nav": {
    "dashboard": "Dashboard",
    "incidents": "Incidents",
    "compensations": "Compensations",
    "reports": "Reports",
    "team": "Team",
    "invites": "Invite Links",
    "profile": "Profile",
    "logout": "Sign Out"
  },
  "auth": {
    "login": "Sign In",
    "register": "Register",
    "email": "Email Address",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "fullName": "Full Name",
    "hrId": "HR ID",
    "rememberMe": "Remember me for 30 days",
    "forgotPassword": "Forgot Password?",
    "forgotPasswordInfo": "Please contact your Team Manager or System Administrator to reset your password."
  },
  "incidents": {
    "title": "Incidents",
    "submit": "Submit Incident",
    "referenceNumber": "Reference Number",
    "incidentDate": "Incident Date",
    "submissionDate": "Submission Date",
    "category": "Category",
    "lostMinutes": "Lost Minutes",
    "compensatedMinutes": "Compended Minutes",
    "remainingMinutes": "Remaining Minutes",
    "notes": "Notes (Optional)",
    "status": "Status"
  },
  "status": {
    "submitted": "Submitted",
    "under_review": "Under Review",
    "approved": "Approved",
    "rejected": "Rejected",
    "partially_compensated": "Partially Compensated",
    "fully_compensated": "Fully Compensated",
    "pending_review": "Pending Review"
  },
  "categories": {
    "Late Arrival": "Late Arrival",
    "Early Leave": "Early Leave",
    "Power Cut / Internet Outage": "Power Cut / Internet Outage",
    "Tool ID Malfunction": "Tool ID Malfunction",
    "Tardy Login": "Tardy Login",
    "Half Day Deduction": "Half Day Deduction",
    "Tardy Break": "Tardy Break"
  },
  "actions": {
    "approve": "Approve",
    "reject": "Reject",
    "view": "View Details",
    "export": "Export",
    "exportExcel": "Export to Excel",
    "exportPdf": "Export to PDF",
    "cancel": "Cancel",
    "submit": "Submit",
    "save": "Save",
    "search": "Search...",
    "filter": "Filter",
    "clearFilters": "Clear Filters"
  },
  "common": {
    "loading": "Loading...",
    "noData": "No records found.",
    "error": "Something went wrong. Please try again.",
    "required": "This field is required.",
    "minutes": "minutes"
  }
}""",

    r"public\locales\ar\common.json": """{
  "app": {
    "name": "متتبع الاستثناءات",
    "tagline": "إدارة الاستثناءات والتعويضات للمؤسسات"
  },
  "nav": {
    "dashboard": "لوحة التحكم",
    "incidents": "الحوادث",
    "compensations": "التعويضات",
    "reports": "التقارير",
    "team": "الفريق",
    "invites": "روابط الدعوة",
    "profile": "الملف الشخصي",
    "logout": "تسجيل الخروج"
  },
  "auth": {
    "login": "تسجيل الدخول",
    "register": "تسجيل",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "confirmPassword": "تأكيد كلمة المرور",
    "fullName": "الاسم الكامل",
    "hrId": "الرقم الوظيفي",
    "rememberMe": "تذكرني لمدة 30 يومًا",
    "forgotPassword": "نسيت كلمة المرور؟",
    "forgotPasswordInfo": "يرجى التواصل مع مدير فريقك أو مسؤول النظام لإعادة تعيين كلمة المرور."
  },
  "incidents": {
    "title": "الحوادث",
    "submit": "تقديم حادثة",
    "referenceNumber": "الرقم المرجعي",
    "incidentDate": "تاريخ الحادثة",
    "submissionDate": "تاريخ التقديم",
    "category": "الفئة",
    "lostMinutes": "الدقائق المفقودة",
    "compensatedMinutes": "الدقائق المعوضة",
    "remainingMinutes": "الدقائق المتبقية",
    "notes": "ملاحظات (اختياري)",
    "status": "الحالة"
  },
  "status": {
    "submitted": "مُقدَّم",
    "under_review": "قيد المراجعة",
    "approved": "موافق عليه",
    "rejected": "مرفوض",
    "partially_compensated": "معوض جزئياً",
    "fully_compensated": "معوض بالكامل",
    "pending_review": "في انتظار المراجعة"
  },
  "categories": {
    "Late Arrival": "الحضور المتأخر",
    "Early Leave": "الانصراف المبكر",
    "Power Cut / Internet Outage": "انقطاع الكهرباء / الإنترنت",
    "Tool ID Malfunction": "عطل في أداة تسجيل الدخول",
    "Tardy Login": "تأخر تسجيل الدخول",
    "Half Day Deduction": "خصم نصف يوم",
    "Tardy Break": "تأخر بعد الاستراحة"
  },
  "actions": {
    "approve": "موافقة",
    "reject": "رفض",
    "view": "عرض التفاصيل",
    "export": "تصدير",
    "exportExcel": "تصدير إلى Excel",
    "exportPdf": "تصدير إلى PDF",
    "cancel": "إلغاء",
    "submit": "إرسال",
    "save": "حفظ",
    "search": "بحث...",
    "filter": "تصفية",
    "clearFilters": "مسح التصفية"
  },
  "common": {
    "loading": "جارٍ التحميل...",
    "noData": "لا توجد سجلات.",
    "error": "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
    "required": "هذا الحقل مطلوب.",
    "minutes": "دقيقة"
  }
}""",

    r"src\lib\i18n.ts": """import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;"""
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
