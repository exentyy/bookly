-- BOOKLY initial schema. No existing rows or tables are dropped by this migration.
set search_path = public, extensions;

create extension if not exists btree_gist with schema extensions;

create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 120),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 2048),
  phone text check (phone is null or char_length(phone) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique check (char_length(name) between 1 and 120),
  timezone text not null default 'Europe/Moscow',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.specialists (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  title text not null check (char_length(title) between 1 and 160),
  bio text check (bio is null or char_length(bio) <= 2000),
  experience_years smallint not null default 0 check (experience_years between 0 and 60),
  rating numeric(3, 2) not null default 0 check (rating between 0 and 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  category text not null check (char_length(category) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  duration_minutes smallint not null check (duration_minutes between 1 and 720),
  price_rub integer not null check (price_rub > 0),
  image_url text check (image_url is null or char_length(image_url) <= 2048),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.specialist_services (
  specialist_id uuid not null references public.specialists (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (specialist_id, service_id)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  city_id uuid not null references public.cities (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  specialist_id uuid not null references public.specialists (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'pending',
  service_name text not null check (char_length(service_name) between 1 and 160),
  price_rub integer not null check (price_rub > 0),
  duration_minutes smallint not null check (duration_minutes between 1 and 720),
  customer_note text check (customer_note is null or char_length(customer_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_positive_duration check (ends_at > starts_at),
  constraint bookings_duration_matches_interval check (
    ends_at = starts_at + make_interval(mins => duration_minutes::integer)
  ),
  constraint bookings_specialist_no_overlap
    exclude using gist (
      specialist_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    ) where (status in ('pending', 'confirmed'))
);

create index specialists_city_active_idx on public.specialists (city_id, name) where is_active;
create index services_city_active_idx on public.services (city_id, category, name) where is_active;
create index specialist_services_service_idx on public.specialist_services (service_id, specialist_id);
create index bookings_customer_start_idx on public.bookings (customer_id, starts_at desc);
create index bookings_specialist_start_idx on public.bookings (specialist_id, starts_at);
create index bookings_city_idx on public.bookings (city_id);
create index bookings_service_idx on public.bookings (service_id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger specialists_set_updated_at before update on public.specialists
for each row execute function public.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
for each row execute function public.set_updated_at();

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(nullif(new.raw_user_meta_data ->> 'full_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgname = 'bookly_create_profile_for_auth_user'
      and tgrelid = 'auth.users'::regclass
      and not tgisinternal
  ) then
    create trigger bookly_create_profile_for_auth_user
      after insert on auth.users
      for each row execute function public.create_profile_for_auth_user();
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.cities enable row level security;
alter table public.specialists enable row level security;
alter table public.services enable row level security;
alter table public.specialist_services enable row level security;
alter table public.bookings enable row level security;

revoke all on public.profiles, public.cities, public.specialists, public.services, public.specialist_services, public.bookings from anon, authenticated;
grant select on public.cities, public.specialists, public.services, public.specialist_services to anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, phone) on public.profiles to authenticated;
grant select, insert on public.bookings to authenticated;

create policy cities_read_active on public.cities
for select to anon, authenticated using (is_active);

create policy specialists_read_active on public.specialists
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.cities c where c.id = specialists.city_id and c.is_active
  )
);

create policy services_read_active on public.services
for select to anon, authenticated using (
  is_active and exists (
    select 1 from public.cities c where c.id = services.city_id and c.is_active
  )
);

create policy specialist_services_read_available on public.specialist_services
for select to anon, authenticated using (
  exists (
    select 1
    from public.specialists sp
    join public.services s on s.id = specialist_services.service_id and s.city_id = sp.city_id
    join public.cities c on c.id = sp.city_id
    where sp.id = specialist_services.specialist_id
      and sp.is_active and s.is_active and c.is_active
  )
);

create policy profiles_read_own on public.profiles
for select to authenticated using (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy bookings_read_own on public.bookings
for select to authenticated using (customer_id = (select auth.uid()));

create policy bookings_insert_own_pending on public.bookings
for insert to authenticated
with check (
  customer_id = (select auth.uid())
  and status = 'pending'
  and starts_at > now()
  and exists (
    select 1 from public.services s
    where s.id = bookings.service_id
      and s.city_id = bookings.city_id
      and s.is_active
      and s.price_rub = bookings.price_rub
      and s.duration_minutes = bookings.duration_minutes
      and s.name = bookings.service_name
  )
  and exists (
    select 1 from public.specialists s
    where s.id = bookings.specialist_id
      and s.city_id = bookings.city_id
      and s.is_active
  )
  and exists (
    select 1 from public.specialist_services ss
    where ss.specialist_id = bookings.specialist_id
      and ss.service_id = bookings.service_id
  )
  and exists (
    select 1 from public.cities c
    where c.id = bookings.city_id and c.is_active
  )
);

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
