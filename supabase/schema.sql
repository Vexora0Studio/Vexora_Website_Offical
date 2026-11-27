-- ============================================================================
-- Vexora Studio — Production Supabase Schema & Row Level Security (RLS)
-- Compatible with GitHub Pages Static Frontend + Supabase Auth + Storage
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Authorized Admins Table (maps Supabase Auth users to admin privileges)
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'admin',
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "Admins can read own admin record"
  on public.admin_users for select
  to authenticated
  using (auth.uid() = user_id);

-- Helper function for RLS policies
create or replace function public.is_vexora_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- 2. Site Settings (Singleton configuration row id = 'main')
create table if not exists public.site_settings (
  id text primary key default 'main',
  company_name text not null default 'Vexora Studio',
  tagline_en text not null default 'Building The Future Through Code.',
  tagline_ar text not null default 'نبني المستقبل عبر البرمجة.',
  home_desc_en text not null default 'Vexora Studio is a software development company specializing in modern websites, mobile applications, software engineering, and AI-powered solutions.',
  home_desc_ar text not null default 'شركة Vexora Studio متخصصة في تطوير المواقع الحديثة، تطبيقات Android، هندسة البرمجيات، والحلول المدعومة بالذكاء الاصطناعي.',
  official_email text not null default 'vexora0studio@gmail.com',
  github_url text not null default 'https://github.com/Vexora0studio',
  linkedin_url text not null default '',
  youtube_url text not null default '',
  website_url text not null default 'https://vexora0studio.github.io/Vexora_Website_Offical/',
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "Admins can manage site settings"
  on public.site_settings for all
  to authenticated
  using (public.is_vexora_admin())
  with check (public.is_vexora_admin());

-- 3. Software Services
create table if not exists public.services (
  id text primary key,
  title_en text not null,
  title_ar text not null,
  description_en text not null,
  description_ar text not null,
  details_en text not null default '',
  details_ar text not null default '',
  technologies text[] not null default '{}',
  icon_key text not null default 'code',
  category text not null default 'engineering',
  sort_order int not null default 1,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

create policy "Public can view published services"
  on public.services for select
  to anon, authenticated
  using (published = true or public.is_vexora_admin());

create policy "Admins can manage services"
  on public.services for all
  to authenticated
  using (public.is_vexora_admin())
  with check (public.is_vexora_admin());

-- 4. Projects & Portfolio
create table if not exists public.projects (
  id text primary key,
  name_en text not null,
  name_ar text not null,
  description_en text not null,
  description_ar text not null,
  category text not null default 'Websites' check (category in (
    'Websites',
    'Android Applications',
    'AI Projects',
    'Software Systems',
    'Other Software Projects'
  )),
  status text not null default 'In Progress' check (status in (
    'Completed',
    'In Progress',
    'Coming Soon'
  )),
  technologies text[] not null default '{}',
  website_url text not null default '',
  image_url text not null default '',
  preset_image_key text not null default 'web',
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Public can view published projects"
  on public.projects for select
  to anon, authenticated
  using (published = true or public.is_vexora_admin());

create policy "Admins can manage projects"
  on public.projects for all
  to authenticated
  using (public.is_vexora_admin())
  with check (public.is_vexora_admin());

-- 5. Team Members (No CV or hiring fields)
create table if not exists public.team_members (
  id text primary key,
  name_en text not null,
  name_ar text not null,
  specialization_en text not null default '',
  specialization_ar text not null default '',
  role_en text not null,
  role_ar text not null,
  bio_en text not null,
  bio_ar text not null,
  skills text[] not null default '{}',
  experience_years int,
  avatar_url text not null default '',
  github_url text not null default '',
  linkedin_url text not null default '',
  published boolean not null default true,
  sort_order int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.team_members enable row level security;

create policy "Public can view published team members"
  on public.team_members for select
  to anon, authenticated
  using (published = true or public.is_vexora_admin());

create policy "Admins can manage team members"
  on public.team_members for all
  to authenticated
  using (public.is_vexora_admin())
  with check (public.is_vexora_admin());

-- 6. Contact Messages (Visitors can INSERT only; only Admins can SELECT/UPDATE/DELETE)
create table if not exists public.contact_messages (
  id text primary key,
  sender_name text not null check (char_length(sender_name) between 2 and 120),
  email text not null check (position('@' in email) > 1 and char_length(email) <= 180),
  subject text not null check (char_length(subject) between 2 and 200),
  message text not null check (char_length(message) between 5 and 5000),
  service_requested text not null default '',
  status text not null default 'new' check (status in ('new', 'replied')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "Anyone can submit a contact message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (status = 'new');

create policy "Only admins can read contact messages"
  on public.contact_messages for select
  to authenticated
  using (public.is_vexora_admin());

create policy "Only admins can update contact messages"
  on public.contact_messages for update
  to authenticated
  using (public.is_vexora_admin())
  with check (public.is_vexora_admin());

create policy "Only admins can delete contact messages"
  on public.contact_messages for delete
  to authenticated
  using (public.is_vexora_admin());

-- 7. Supabase Storage Bucket for Project & Team Images
insert into storage.buckets (id, name, public)
values ('vexora-media', 'vexora-media', true)
on conflict (id) do nothing;

create policy "Public can view Vexora media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'vexora-media');

create policy "Admins can upload Vexora media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'vexora-media' and public.is_vexora_admin());

create policy "Admins can update Vexora media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'vexora-media' and public.is_vexora_admin());

create policy "Admins can delete Vexora media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vexora-media' and public.is_vexora_admin());

-- 8. Seed Default Real Baseline Data
insert into public.site_settings (id)
values ('main')
on conflict (id) do nothing;
