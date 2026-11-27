# Vexora Studio — Backend Setup Guide (Supabase + Gemini AI + GitHub Pages)

Because **GitHub Pages** serves static frontend files (`index.html`, `styles.css`, `app.js`), database persistence, admin authentication, image storage, and Gemini API calls run securely through **Supabase**.

## 1. Create Supabase Project & Database
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** in Supabase and run the entire contents of `supabase/schema.sql`.
   - Creates tables: `site_settings`, `services`, `projects`, `team_members`, `contact_messages`, `admin_users`.
   - Creates public storage bucket: `vexora-media`.
   - Enforces **Row Level Security (RLS)** so visitors can only read published data and submit contact messages, while only verified entries in `admin_users` can edit content or read messages.

## 2. Create Your Admin Account
1. In Supabase Dashboard → **Authentication → Users → Add User**, create your admin account (e.g. `vexora0studio@gmail.com` with a strong password).
2. Copy the new user's `UUID`, then run in **SQL Editor**:
   ```sql
   insert into public.admin_users (user_id, email, role)
   values ('YOUR-USER-UUID-HERE', 'vexora0studio@gmail.com', 'admin');
   ```

## 3. Connect Frontend (`website/vexora-config.js`)
Open `website/vexora-config.js` and fill in your **public** Supabase Project URL and `anon` public key (from **Project Settings → API**):
```js
window.VEXORA_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  aiFunctionName: "vexora-ai"
};
```
> Never place `service_role` keys or `GEMINI_API_KEY` inside `website/` files.

## 4. Deploy Secure Gemini AI Edge Function (`vexora-ai`)
Using Supabase CLI:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase secrets set GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
supabase functions deploy vexora-ai
```
Once deployed, **Vexora AI Assistant** automatically connects to `vexora-ai` and answers questions strictly from your live published Vexora Studio database.
