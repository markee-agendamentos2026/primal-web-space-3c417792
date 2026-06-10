
-- ENUMS
create type public.app_role as enum ('owner','professional','client');
create type public.booking_status as enum ('pending','confirmed','cancelled','done');
create type public.campaign_channel as enum ('whatsapp','email');
create type public.plan_tier as enum ('basic','intermediate','premium');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  whatsapp text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- PROFESSIONALS
create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text,
  photo_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.professionals enable row level security;

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_min int not null,
  price numeric(10,2) not null default 0,
  emoji text,
  photo_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  promo_pct int,
  promo_starts_at timestamptz,
  promo_ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.services enable row level security;

-- AVAILABILITY (singleton)
create table public.availability (
  id int primary key default 1,
  open_time time not null default '08:00',
  close_time time not null default '20:00',
  days_enabled boolean[] not null default array[false,true,true,true,true,true,true],
  lunch_start time,
  lunch_end time,
  min_lead_min int not null default 30,
  max_future_days int not null default 60,
  require_pro_selection boolean not null default true,
  business_name text default 'Ronielson Hair',
  address text,
  maps_url text,
  whatsapp_url text,
  instagram_url text,
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);
alter table public.availability enable row level security;
insert into public.availability (id) values (1);

-- BLOCKED DATES
create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text
);
alter table public.blocked_dates enable row level security;

-- BOOKINGS
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  whatsapp text not null,
  email text,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  professional_name text,
  date date not null,
  time time not null,
  duration_min int not null,
  price numeric(10,2) not null default 0,
  status booking_status not null default 'confirmed',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;

create unique index bookings_unique_slot
on public.bookings(professional_id, date, time)
where status in ('pending','confirmed');

create index bookings_date_idx on public.bookings(date);

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  stars int not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;

-- RECURRENCE
create table public.recurrence_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel campaign_channel not null,
  target_filter text not null default 'all_active',
  template text not null,
  scheduled_at timestamptz,
  status text not null default 'draft',
  plan_tier plan_tier not null default 'basic',
  created_at timestamptz not null default now()
);
alter table public.recurrence_campaigns enable row level security;

-- RLS POLICIES
-- profiles
create policy "users read own profile" on public.profiles for select using (auth.uid() = id or public.has_role(auth.uid(),'owner'));
create policy "users update own profile" on public.profiles for update using (auth.uid() = id or public.has_role(auth.uid(),'owner'));
create policy "owner inserts profiles" on public.profiles for insert with check (auth.uid() = id or public.has_role(auth.uid(),'owner'));

-- user_roles
create policy "owner manages roles" on public.user_roles for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));
create policy "users read own roles" on public.user_roles for select using (auth.uid() = user_id);

-- professionals
create policy "anyone reads active pros" on public.professionals for select using (true);
create policy "owner writes pros" on public.professionals for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

-- services
create policy "anyone reads services" on public.services for select using (true);
create policy "owner writes services" on public.services for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

-- availability
create policy "anyone reads availability" on public.availability for select using (true);
create policy "owner writes availability" on public.availability for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

-- blocked_dates
create policy "anyone reads blocked" on public.blocked_dates for select using (true);
create policy "owner writes blocked" on public.blocked_dates for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

-- bookings: public can insert; reading is restricted
create policy "anyone creates booking" on public.bookings for insert with check (true);
create policy "owner reads all bookings" on public.bookings for select using (public.has_role(auth.uid(),'owner'));
create policy "pro reads own bookings" on public.bookings for select using (
  exists(select 1 from public.professionals p where p.id = bookings.professional_id and p.user_id = auth.uid())
);
create policy "user reads own bookings" on public.bookings for select using (auth.uid() = user_id);
create policy "owner updates bookings" on public.bookings for update using (public.has_role(auth.uid(),'owner'));
create policy "owner deletes bookings" on public.bookings for delete using (public.has_role(auth.uid(),'owner'));

-- reviews
create policy "anyone reads reviews" on public.reviews for select using (true);
create policy "anyone creates review" on public.reviews for insert with check (true);

-- recurrence_campaigns
create policy "owner manages campaigns" on public.recurrence_campaigns for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

-- TRIGGER: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Realtime
alter publication supabase_realtime add table public.bookings;

-- Seed services
insert into public.services (name, duration_min, price, emoji, sort_order) values
  ('Corte Masculino', 45, 60, '✂️', 1),
  ('Barba Completa', 30, 45, '🪒', 2),
  ('Corte + Barba', 75, 95, '💈', 3),
  ('Pigmentação', 40, 80, '🎨', 4),
  ('Sobrancelha', 15, 25, '👁', 5);

-- Seed professionals
insert into public.professionals (name, role, sort_order) values
  ('Ronielson', 'Master Barber', 1),
  ('Lucas', 'Stylist', 2);
