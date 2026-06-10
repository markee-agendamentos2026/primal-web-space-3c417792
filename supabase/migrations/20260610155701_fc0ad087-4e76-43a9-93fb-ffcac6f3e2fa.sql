-- ENUMS
create type public.app_role as enum ('owner','professional','client');
create type public.booking_status as enum ('pending','confirmed','cancelled','done');
create type public.campaign_channel as enum ('whatsapp','email');
create type public.plan_tier as enum ('basic','intermediate','premium');

-- PROFILES
create table public.profiles (
  id uuid primary key,
  name text,
  whatsapp text,
  email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT ON public.profiles TO anon;
alter table public.profiles enable row level security;

-- USER ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique(user_id, role)
);
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
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
GRANT ALL ON public.professionals TO authenticated;
GRANT ALL ON public.professionals TO service_role;
GRANT SELECT ON public.professionals TO anon;
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
  description text,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
GRANT SELECT ON public.services TO anon;
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
GRANT ALL ON public.availability TO authenticated;
GRANT ALL ON public.availability TO service_role;
GRANT SELECT ON public.availability TO anon;
alter table public.availability enable row level security;
insert into public.availability (id) values (1) on conflict do nothing;

-- BLOCKED DATES
create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text
);
GRANT ALL ON public.blocked_dates TO authenticated;
GRANT ALL ON public.blocked_dates TO service_role;
GRANT SELECT ON public.blocked_dates TO anon;
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
  client_name_snapshot text,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
GRANT ALL ON public.bookings TO anon;
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
GRANT ALL ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
GRANT ALL ON public.reviews TO anon;
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
GRANT ALL ON public.recurrence_campaigns TO authenticated;
GRANT ALL ON public.recurrence_campaigns TO service_role;
alter table public.recurrence_campaigns enable row level security;

-- FUNCTIONS & RPCs

-- Normalize phone
CREATE OR REPLACE FUNCTION public.normalize_phone(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g')
$$;

-- Ensure client profile
CREATE OR REPLACE FUNCTION public.ensure_client_profile(_whatsapp text, _name text, _email text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _id uuid;
BEGIN
  IF _wa IS NULL OR length(_wa) < 10 THEN
    RAISE EXCEPTION 'whatsapp invalido';
  END IF;
  SELECT id INTO _id FROM public.profiles WHERE whatsapp = _wa LIMIT 1;
  IF _id IS NULL THEN
    INSERT INTO public.profiles (id, name, email, whatsapp, active)
    VALUES (gen_random_uuid(), _name, _email, _wa, true)
    RETURNING id INTO _id;
  END IF;
  RETURN _id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ensure_client_profile(text, text, text) TO anon, authenticated;

-- Get taken slots
CREATE OR REPLACE FUNCTION public.get_taken_slots(_date date, _professional_id uuid DEFAULT NULL)
RETURNS TABLE("time" time, duration_min int, professional_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.time, b.duration_min, b.professional_id
  FROM public.bookings b
  WHERE b.date = _date
    AND b.status IN ('pending','confirmed')
    AND (_professional_id IS NULL OR b.professional_id = _professional_id);
$$;
GRANT EXECUTE ON FUNCTION public.get_taken_slots(date, uuid) TO anon, authenticated;

-- Get bookings by whatsapp
CREATE OR REPLACE FUNCTION public.get_bookings_by_whatsapp(_whatsapp text)
RETURNS SETOF public.bookings LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT *
  FROM public.bookings
  WHERE whatsapp = public.normalize_phone(_whatsapp)
    AND length(public.normalize_phone(_whatsapp)) >= 10
  ORDER BY date DESC, time DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_bookings_by_whatsapp(text) TO anon, authenticated;

-- Cancel booking
CREATE OR REPLACE FUNCTION public.cancel_booking(_id uuid, _whatsapp text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _wa text := public.normalize_phone(_whatsapp);
  _rows int;
BEGIN
  IF _wa IS NULL OR length(_wa) < 10 THEN
    RETURN false;
  END IF;
  UPDATE public.bookings
     SET status = 'cancelled'
   WHERE id = _id
     AND whatsapp = _wa
     AND status IN ('pending','confirmed');
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN _rows > 0;
END;
$$;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO anon, authenticated;

-- RLS POLICIES
create policy "users read own profile" on public.profiles for select using (auth.uid() = id or public.has_role(auth.uid(),'owner'));
create policy "users update own profile" on public.profiles for update using (auth.uid() = id or public.has_role(auth.uid(),'owner'));
create policy "anyone inserts profiles" on public.profiles for insert with check (true);

create policy "owner manages roles" on public.user_roles for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));
create policy "users read own roles" on public.user_roles for select using (auth.uid() = user_id);

create policy "anyone reads active pros" on public.professionals for select using (true);
create policy "owner writes pros" on public.professionals for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create policy "anyone reads services" on public.services for select using (true);
create policy "owner writes services" on public.services for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create policy "anyone reads availability" on public.availability for select using (true);
create policy "owner writes availability" on public.availability for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create policy "anyone reads blocked" on public.blocked_dates for select using (true);
create policy "owner writes blocked" on public.blocked_dates for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

create policy "anyone creates booking" on public.bookings for insert with check (true);
create policy "anyone reads bookings" on public.bookings for select using (true);
create policy "owner updates bookings" on public.bookings for update using (public.has_role(auth.uid(),'owner'));
create policy "owner deletes bookings" on public.bookings for delete using (public.has_role(auth.uid(),'owner'));

create policy "anyone reads reviews" on public.reviews for select using (true);
create policy "review for existing booking" on public.reviews for insert with check (
    booking_id IS NOT NULL AND stars BETWEEN 1 AND 5
    AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.status IN ('confirmed','done'))
);

create policy "owner manages campaigns" on public.recurrence_campaigns for all using (public.has_role(auth.uid(),'owner')) with check (public.has_role(auth.uid(),'owner'));

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
