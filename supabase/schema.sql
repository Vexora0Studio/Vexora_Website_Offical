-- ============================================================================
-- Vexora Studio — Enterprise Supabase Schema & Row Level Security (RLS)
-- Compatible with GitHub Pages Static Frontend + Supabase Auth + Edge Functions
-- Idempotent migration script: safe on fresh or existing databases.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Authorized Admins & RBAC Roles Table
-- Roles: owner | super_admin | admin | editor | support
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'admin' check (role in ('owner', 'super_admin', 'admin', 'editor', 'support')),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);

alter table public.admin_users add column if not exists full_name text not null default '';
alter table public.admin_users add column if not exists is_active boolean not null default true;
alter table public.admin_users add column if not exists last_login_at timestamptz;
alter table public.admin_users add column if not exists created_by uuid;
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users add constraint admin_users_role_check
  check (role in ('owner', 'super_admin', 'admin', 'editor', 'support'));

alter table public.admin_users enable row level security;

-- Helper functions for server-enforced RBAC
create or replace function public.get_vexora_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.admin_users
  where user_id = auth.uid() and is_active = true
  limit 1;
$$;

create or replace function public.is_vexora_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and is_active = true
  );
$$;

create or replace function public.has_vexora_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and is_active = true
      and role = any(allowed_roles)
  );
$$;

drop policy if exists "Admins can read own admin record" on public.admin_users;
drop policy if exists "Active admins or super admins read admin_users" on public.admin_users;
create policy "Active admins or super admins read admin_users"
  on public.admin_users for select
  to authenticated
  using (auth.uid() = user_id or public.has_vexora_role(array['owner', 'super_admin', 'admin']));

drop policy if exists "Only owner or super_admin manage admin_users" on public.admin_users;
create policy "Only owner or super_admin manage admin_users"
  on public.admin_users for all
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin']))
  with check (public.has_vexora_role(array['owner', 'super_admin']));

-- 2. Site Settings (Singleton configuration row id = 'main')
create table if not exists public.site_settings (
  id text primary key default 'main',
  company_name text not null default 'Vexora Studio',
  logo_url text not null default 'website/vexora-logo.png',
  tagline_en text not null default 'Building The Future Through Code.',
  tagline_ar text not null default 'نبني المستقبل عبر البرمجة.',
  home_desc_en text not null default 'Vexora Studio is a software development company specializing in modern websites, mobile applications, software engineering, and AI-powered solutions.',
  home_desc_ar text not null default 'شركة Vexora Studio متخصصة في تطوير المواقع الحديثة، تطبيقات Android، هندسة البرمجيات، والحلول المدعومة بالذكاء الاصطناعي.',
  official_email text not null default 'vexora0studio@gmail.com',
  github_url text not null default 'https://github.com/Vexora0studio',
  linkedin_url text not null default '',
  youtube_url text not null default '',
  website_url text not null default 'https://vexora0studio.github.io/Vexora_Website_Offical/',
  default_lang text not null default 'ar' check (default_lang in ('ar', 'en')),
  timezone text not null default 'Africa/Cairo',
  theme_mode text not null default 'dark' check (theme_mode in ('dark', 'light')),
  visible_sections jsonb not null default '{"services":true,"projects":true,"technologies":true,"team":true,"ai":true,"client":true,"updates":true,"download":true,"faq":true}'::jsonb,
  ai_enabled boolean not null default true,
  ai_model text not null default 'gemini-3.8-flash',
  ai_system_prompt text not null default '',
  ai_persona text not null default 'Senior Software Architect & Solutions Advisor',
  ai_allowed_langs text not null default 'both' check (ai_allowed_langs in ('both', 'ar', 'en')),
  ai_daily_limit int not null default 500,
  updated_at timestamptz not null default now()
);

alter table public.site_settings add column if not exists logo_url text not null default 'website/vexora-logo.png';
alter table public.site_settings add column if not exists default_lang text not null default 'ar';
alter table public.site_settings add column if not exists timezone text not null default 'Africa/Cairo';
alter table public.site_settings add column if not exists theme_mode text not null default 'dark';
alter table public.site_settings add column if not exists visible_sections jsonb not null default '{"services":true,"projects":true,"technologies":true,"team":true,"ai":true,"client":true,"updates":true,"download":true,"faq":true}'::jsonb;
alter table public.site_settings add column if not exists ai_enabled boolean not null default true;
alter table public.site_settings add column if not exists ai_model text not null default 'gemini-3.8-flash';
alter table public.site_settings add column if not exists ai_system_prompt text not null default '';
alter table public.site_settings add column if not exists ai_persona text not null default 'Senior Software Architect & Solutions Advisor';
alter table public.site_settings add column if not exists ai_allowed_langs text not null default 'both';
alter table public.site_settings add column if not exists ai_daily_limit int not null default 500;

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings"
  on public.site_settings for all
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']));

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

drop policy if exists "Public can view published services" on public.services;
create policy "Public can view published services"
  on public.services for select
  to anon, authenticated
  using (published = true or public.is_vexora_admin());

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
  on public.services for all
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']));

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
    'Planning',
    'In Progress',
    'Completed',
    'On Hold',
    'Coming Soon'
  )),
  technologies text[] not null default '{}',
  assigned_team text[] not null default '{}',
  change_history jsonb not null default '[]'::jsonb,
  website_url text not null default '' check (website_url ~* '^(|https?://)'),
  image_url text not null default '',
  video_url text not null default '' check (video_url ~* '^(|https?://)'),
  preset_image_key text not null default 'web',
  featured boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects add column if not exists video_url text not null default '';
alter table public.projects add column if not exists assigned_team text[] not null default '{}';
alter table public.projects add column if not exists change_history jsonb not null default '[]'::jsonb;
alter table public.projects drop constraint if exists projects_status_check;
alter table public.projects add constraint projects_status_check
  check (status in ('Planning', 'In Progress', 'Completed', 'On Hold', 'Coming Soon'));

alter table public.projects enable row level security;

drop policy if exists "Public can view published projects" on public.projects;
create policy "Public can view published projects"
  on public.projects for select
  to anon, authenticated
  using (published = true or public.is_vexora_admin());

drop policy if exists "Admins can manage projects" on public.projects;
create policy "Admins can manage projects"
  on public.projects for all
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']));

-- 5. Team & Employees Management
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
  email text not null default '',
  employee_status text not null default 'active' check (employee_status in ('active', 'on_leave', 'inactive')),
  system_role text not null default 'none' check (system_role in ('none', 'owner', 'super_admin', 'admin', 'editor', 'support')),
  portfolio_url text not null default '',
  cv_summary text not null default '',
  skills text[] not null default '{}',
  experience_years int,
  avatar_url text not null default '',
  github_url text not null default '',
  linkedin_url text not null default '',
  published boolean not null default true,
  sort_order int not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.team_members add column if not exists email text not null default '';
alter table public.team_members add column if not exists employee_status text not null default 'active';
alter table public.team_members add column if not exists system_role text not null default 'none';
alter table public.team_members add column if not exists portfolio_url text not null default '';
alter table public.team_members add column if not exists cv_summary text not null default '';

alter table public.team_members enable row level security;

drop policy if exists "Public can view published team members" on public.team_members;
create policy "Public can view published team members"
  on public.team_members for select
  to anon, authenticated
  using (published = true or public.is_vexora_admin());

drop policy if exists "Admins can manage team members" on public.team_members;
create policy "Admins can manage team members"
  on public.team_members for all
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin']));

-- 6. Unified Contact & Support Center Messages
create table if not exists public.contact_messages (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  sender_name text not null check (char_length(sender_name) between 2 and 120),
  email text not null check (position('@' in email) > 1 and char_length(email) <= 180),
  subject text not null check (char_length(subject) between 2 and 200),
  message text not null check (char_length(message) between 5 and 5000),
  service_requested text not null default '',
  ticket_type text not null default 'contact' check (ticket_type in ('contact', 'support')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  assigned_to text not null default '',
  admin_reply text not null default '',
  internal_note text not null default '',
  history jsonb not null default '[]'::jsonb,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved', 'closed', 'replied')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.contact_messages add column if not exists admin_reply text not null default '';
alter table public.contact_messages add column if not exists ticket_type text not null default 'contact';
alter table public.contact_messages add column if not exists priority text not null default 'medium';
alter table public.contact_messages add column if not exists assigned_to text not null default '';
alter table public.contact_messages add column if not exists internal_note text not null default '';
alter table public.contact_messages add column if not exists history jsonb not null default '[]'::jsonb;
alter table public.contact_messages drop constraint if exists contact_messages_status_check;
alter table public.contact_messages add constraint contact_messages_status_check
  check (status in ('new', 'in_progress', 'resolved', 'closed', 'replied'));

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can submit a contact message" on public.contact_messages;
create policy "Anyone can submit a contact message"
  on public.contact_messages for insert
  to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = auth.uid()));

drop policy if exists "Admins or owning clients can read contact messages" on public.contact_messages;
create policy "Admins or owning clients can read contact messages"
  on public.contact_messages for select
  to authenticated
  using (public.is_vexora_admin() or user_id = auth.uid());

drop policy if exists "Only admins can update contact messages" on public.contact_messages;
create policy "Only admins can update contact messages"
  on public.contact_messages for update
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'support']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'support']));

drop policy if exists "Only admins can delete contact messages" on public.contact_messages;
create policy "Only admins can delete contact messages"
  on public.contact_messages for delete
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin']));

-- 7. Company Knowledge Base
create table if not exists public.knowledge_base (
  id text primary key,
  topic text not null default 'general',
  title_en text not null,
  title_ar text not null,
  content_en text not null,
  content_ar text not null,
  keywords text[] not null default '{}',
  sort_order int not null default 1,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.knowledge_base enable row level security;

drop policy if exists "Public can view published knowledge base" on public.knowledge_base;
create policy "Public can view published knowledge base"
  on public.knowledge_base for select
  to anon, authenticated
  using (published = true or public.is_vexora_admin());

drop policy if exists "Admins can manage knowledge base" on public.knowledge_base;
create policy "Admins can manage knowledge base"
  on public.knowledge_base for all
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']));

-- 8. Frequently Asked Questions
create table if not exists public.faqs (
  id text primary key,
  question_en text not null,
  question_ar text not null,
  answer_en text not null,
  answer_ar text not null,
  category text not null default 'general',
  sort_order int not null default 1,
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.faqs enable row level security;

drop policy if exists "Public can view published faqs" on public.faqs;
create policy "Public can view published faqs"
  on public.faqs for select
  to anon, authenticated
  using (published = true or public.is_vexora_admin());

drop policy if exists "Admins can manage faqs" on public.faqs;
create policy "Admins can manage faqs"
  on public.faqs for all
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']));

-- 9. Client Profiles
create table if not exists public.client_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (position('@' in email) > 1 and char_length(email) <= 180),
  company text not null default '',
  phone text not null default '',
  status text not null default 'active' check (status in ('active', 'disabled')),
  internal_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_profiles add column if not exists status text not null default 'active';
alter table public.client_profiles add column if not exists internal_notes text not null default '';

alter table public.client_profiles enable row level security;

drop policy if exists "Clients read own profile or admin reads all" on public.client_profiles;
create policy "Clients read own profile or admin reads all"
  on public.client_profiles for select
  to authenticated
  using (auth.uid() = user_id or public.is_vexora_admin());

drop policy if exists "Clients insert own profile" on public.client_profiles;
create policy "Clients insert own profile"
  on public.client_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Clients update own profile" on public.client_profiles;
drop policy if exists "Clients update own basic profile or admin manages client" on public.client_profiles;
create policy "Clients update own basic profile or admin manages client"
  on public.client_profiles for update
  to authenticated
  using (auth.uid() = user_id or public.has_vexora_role(array['owner', 'super_admin', 'admin', 'support']))
  with check (auth.uid() = user_id or public.has_vexora_role(array['owner', 'super_admin', 'admin', 'support']));

-- 10. Client Project Requests
create table if not exists public.project_requests (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null check (char_length(client_name) between 2 and 120),
  client_email text not null check (position('@' in client_email) > 1 and char_length(client_email) <= 180),
  service_name text not null default '',
  project_title text not null check (char_length(project_title) between 2 and 160),
  description text not null check (char_length(description) between 10 and 5000),
  budget_range text not null default '',
  timeline text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'in_progress', 'completed')),
  admin_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_requests enable row level security;

drop policy if exists "Clients read own project requests or admin reads all" on public.project_requests;
create policy "Clients read own project requests or admin reads all"
  on public.project_requests for select
  to authenticated
  using (auth.uid() = user_id or public.is_vexora_admin());

drop policy if exists "Clients submit own project requests with initial status" on public.project_requests;
create policy "Clients submit own project requests with initial status"
  on public.project_requests for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'submitted');

drop policy if exists "Admins can update project requests" on public.project_requests;
create policy "Admins can update project requests"
  on public.project_requests for update
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'support']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'support']));

drop policy if exists "Admins can delete project requests" on public.project_requests;
create policy "Admins can delete project requests"
  on public.project_requests for delete
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin']));

-- 11. Notifications, Announcements & Scheduling Feed
create table if not exists public.updates_feed (
  id text primary key,
  kind text not null default 'update' check (kind in ('update', 'news', 'notification')),
  title_en text not null check (char_length(title_en) between 2 and 180),
  title_ar text not null check (char_length(title_ar) between 2 and 180),
  body_en text not null check (char_length(body_en) between 2 and 2500),
  body_ar text not null check (char_length(body_ar) between 2 and 2500),
  image_url text not null default '',
  target_route text not null default 'home',
  target_group text not null default 'all' check (target_group in ('all', 'clients', 'admins', 'specific')),
  target_email text not null default '',
  scheduled_at timestamptz,
  delivery_status text not null default 'published' check (delivery_status in ('published', 'scheduled', 'draft')),
  pinned boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.updates_feed add column if not exists image_url text not null default '';
alter table public.updates_feed add column if not exists target_group text not null default 'all';
alter table public.updates_feed add column if not exists target_email text not null default '';
alter table public.updates_feed add column if not exists scheduled_at timestamptz;
alter table public.updates_feed add column if not exists delivery_status text not null default 'published';

alter table public.updates_feed enable row level security;

drop policy if exists "Public can view published updates" on public.updates_feed;
create policy "Public can view published updates"
  on public.updates_feed for select
  to anon, authenticated
  using (
    (published = true and delivery_status = 'published' and (scheduled_at is null or scheduled_at <= now()) and target_group in ('all', 'clients'))
    or public.is_vexora_admin()
  );

drop policy if exists "Admins can manage updates feed" on public.updates_feed;
create policy "Admins can manage updates feed"
  on public.updates_feed for all
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor', 'support']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor', 'support']));

-- 12. Website Updates & Version Control (Changelog / Releases)
create table if not exists public.site_releases (
  id text primary key,
  version text not null check (char_length(version) between 2 and 40),
  title_en text not null check (char_length(title_en) between 2 and 180),
  title_ar text not null check (char_length(title_ar) between 2 and 180),
  description_en text not null default '',
  description_ar text not null default '',
  changelog text not null default '',
  release_date date not null default current_date,
  status text not null default 'released' check (status in ('planned', 'released', 'rolled_back')),
  deploy_target text not null default 'github_pages' check (deploy_target in ('github_pages', 'android_apk', 'edge_functions')),
  created_at timestamptz not null default now()
);

alter table public.site_releases enable row level security;

drop policy if exists "Public can view released site_releases" on public.site_releases;
create policy "Public can view released site_releases"
  on public.site_releases for select
  to anon, authenticated
  using (status = 'released' or public.is_vexora_admin());

drop policy if exists "Admins manage site_releases" on public.site_releases;
create policy "Admins manage site_releases"
  on public.site_releases for all
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin']))
  with check (public.has_vexora_role(array['owner', 'super_admin', 'admin']));

-- 13. Visit & Usage Analytics Events
create table if not exists public.analytics_events (
  id text primary key,
  event_type text not null check (event_type in ('page_view', 'ai_query', 'apk_download', 'client_request')),
  route text not null default 'home' check (char_length(route) <= 40),
  referrer_source text not null default 'direct' check (char_length(referrer_source) <= 120),
  created_at timestamptz not null default now()
);

alter table public.analytics_events add column if not exists referrer_source text not null default 'direct';

alter table public.analytics_events enable row level security;

drop policy if exists "Visitors can record lightweight analytics events" on public.analytics_events;
create policy "Visitors can record lightweight analytics events"
  on public.analytics_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Only admins can view analytics events" on public.analytics_events;
create policy "Only admins can view analytics events"
  on public.analytics_events for select
  to authenticated
  using (public.is_vexora_admin());

drop policy if exists "Only owner can purge analytics" on public.analytics_events;
create policy "Only owner can purge analytics"
  on public.analytics_events for delete
  to authenticated
  using (public.has_vexora_role(array['owner']));

-- 14. Admin Audit Logs (Enterprise Traceability)
create table if not exists public.audit_logs (
  id text primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_email text not null default '',
  actor_role text not null default '',
  action text not null,
  resource_type text not null default '',
  resource_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

drop policy if exists "Admins read audit_logs" on public.audit_logs;
create policy "Admins read audit_logs"
  on public.audit_logs for select
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin']));

drop policy if exists "Active admins insert audit_logs" on public.audit_logs;
create policy "Active admins insert audit_logs"
  on public.audit_logs for insert
  to authenticated
  with check (public.is_vexora_admin());

-- 15. Admin Login Attempts Logs
create table if not exists public.login_logs (
  id text primary key,
  email text not null default '',
  user_id uuid,
  role text not null default '',
  status text not null check (status in ('success', 'failed', 'blocked')),
  reason text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

alter table public.login_logs enable row level security;

drop policy if exists "Owner or super_admin read login_logs" on public.login_logs;
create policy "Owner or super_admin read login_logs"
  on public.login_logs for select
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin']));

drop policy if exists "Allow login telemetry inserts" on public.login_logs;
create policy "Allow login telemetry inserts"
  on public.login_logs for insert
  to anon, authenticated
  with check (true);

-- 16. Vexora AI Telemetry & Error Logs
create table if not exists public.ai_logs (
  id text primary key,
  user_lang text not null default 'ar',
  status text not null check (status in ('ok', 'error', 'disabled', 'rate_limited')),
  latency_ms int not null default 0,
  tokens_estimated int not null default 0,
  model text not null default 'gemini-3.8-flash',
  error_code text not null default '',
  error_message text not null default '',
  prompt_preview text not null default '',
  created_at timestamptz not null default now()
);

alter table public.ai_logs enable row level security;

drop policy if exists "Admins read ai_logs" on public.ai_logs;
create policy "Admins read ai_logs"
  on public.ai_logs for select
  to authenticated
  using (public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']));

drop policy if exists "Only owner deletes ai_logs" on public.ai_logs;
create policy "Only owner deletes ai_logs"
  on public.ai_logs for delete
  to authenticated
  using (public.has_vexora_role(array['owner']));

-- 17. Supabase Storage Bucket for Project & Team Media
insert into storage.buckets (id, name, public)
values ('vexora-media', 'vexora-media', true)
on conflict (id) do nothing;

drop policy if exists "Public can view Vexora media" on storage.objects;
create policy "Public can view Vexora media"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'vexora-media');

drop policy if exists "Admins can upload Vexora media" on storage.objects;
create policy "Admins can upload Vexora media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'vexora-media' and public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']));

drop policy if exists "Admins can update Vexora media" on storage.objects;
create policy "Admins can update Vexora media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'vexora-media' and public.has_vexora_role(array['owner', 'super_admin', 'admin', 'editor']));

drop policy if exists "Admins can delete Vexora media" on storage.objects;
create policy "Admins can delete Vexora media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'vexora-media' and public.has_vexora_role(array['owner', 'super_admin', 'admin']));

-- 18. Seed Default Real Baseline Data
insert into public.site_settings (id)
values ('main')
on conflict (id) do nothing;
