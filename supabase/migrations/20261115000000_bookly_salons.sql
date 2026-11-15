-- BOOKLY salon tenancy. Run as postgres in the BOOKLY SQL Editor only after review.
-- Preserves every existing row and ID. Legacy catalog rows stay public but unclaimed.
begin;
set local search_path = pg_catalog;
set local lock_timeout = '5s';

do $preflight$
begin
  if current_user <> 'postgres' or not exists (
    select 1 from pg_catalog.pg_roles
    where rolname = current_user and rolbypassrls
  ) then
    raise exception 'BOOKLY salon migration requires the postgres BYPASSRLS owner';
  end if;
  if pg_catalog.to_regclass('public.salons') is not null
    or pg_catalog.to_regclass('public.salon_memberships') is not null
    or pg_catalog.to_regnamespace('bookly_private') is not null then
    raise exception 'BOOKLY salon migration is already applied or partially present';
  end if;
  if pg_catalog.to_regclass('public.cities') is null
    or pg_catalog.to_regclass('public.services') is null
    or pg_catalog.to_regclass('public.specialists') is null
    or pg_catalog.to_regclass('public.specialist_services') is null
    or pg_catalog.to_regclass('public.specialist_availability') is null
    or pg_catalog.to_regclass('public.bookings') is null
    or pg_catalog.to_regclass('public.profiles') is null
    or pg_catalog.to_regprocedure('public.bookly_available_slots(uuid,uuid,date)') is null
    or pg_catalog.to_regprocedure('public.bookly_create_booking(uuid,uuid,timestamptz)') is null then
    raise exception 'BOOKLY booking schema is incomplete';
  end if;
  if exists (
    select 1 from pg_catalog.pg_class t
    where t.oid in (
      'public.cities'::pg_catalog.regclass,
      'public.services'::pg_catalog.regclass,
      'public.specialists'::pg_catalog.regclass,
      'public.specialist_services'::pg_catalog.regclass,
      'public.specialist_availability'::pg_catalog.regclass,
      'public.bookings'::pg_catalog.regclass,
      'public.profiles'::pg_catalog.regclass
    ) and not t.relrowsecurity
  ) or exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid in (
      'public.bookly_available_slots(uuid,uuid,date)'::pg_catalog.regprocedure,
      'public.bookly_create_booking(uuid,uuid,timestamptz)'::pg_catalog.regprocedure
    ) and (not p.prosecdef or pg_catalog.pg_get_userbyid(p.proowner) <> 'postgres')
  ) then
    raise exception 'BOOKLY RLS or booking RPC ownership differs from the reviewed schema';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.bookings'::pg_catalog.regclass
      and conname = 'bookings_specialist_no_overlap' and contype = 'x'
  ) or (select count(*) from pg_catalog.pg_policy
    where polrelid = 'public.bookings'::pg_catalog.regclass) <> 2
    or not exists (
      select 1 from pg_catalog.pg_policy
      where polrelid = 'public.bookings'::pg_catalog.regclass
        and polname = 'bookings_read_own' and polcmd = 'r'
    )
    or not exists (
      select 1 from pg_catalog.pg_policy
      where polrelid = 'public.bookings'::pg_catalog.regclass
        and polname = 'bookings_cancel_own_future' and polcmd = 'w'
    ) then
    raise exception 'BOOKLY booking constraint or policies differ from the reviewed schema';
  end if;
  if (select count(*) from pg_catalog.pg_policy
      where polrelid = 'public.services'::pg_catalog.regclass) <> 1
    or not exists (select 1 from pg_catalog.pg_policy
      where polrelid = 'public.services'::pg_catalog.regclass
        and polname = 'services_read_active' and polcmd = 'r')
    or (select count(*) from pg_catalog.pg_policy
      where polrelid = 'public.specialists'::pg_catalog.regclass) <> 1
    or not exists (select 1 from pg_catalog.pg_policy
      where polrelid = 'public.specialists'::pg_catalog.regclass
        and polname = 'specialists_read_active' and polcmd = 'r')
    or (select count(*) from pg_catalog.pg_policy
      where polrelid = 'public.specialist_services'::pg_catalog.regclass) <> 1
    or not exists (select 1 from pg_catalog.pg_policy
      where polrelid = 'public.specialist_services'::pg_catalog.regclass
        and polname = 'specialist_services_read_available' and polcmd = 'r')
    or exists (select 1 from pg_catalog.pg_policy
      where polrelid = 'public.specialist_availability'::pg_catalog.regclass) then
    raise exception 'BOOKLY catalog or availability policies differ from the reviewed schema';
  end if;
  if exists (
    select 1 from pg_catalog.pg_trigger t
    where t.tgrelid in (
      'public.services'::pg_catalog.regclass,
      'public.specialists'::pg_catalog.regclass,
      'public.specialist_services'::pg_catalog.regclass,
      'public.specialist_availability'::pg_catalog.regclass,
      'public.bookings'::pg_catalog.regclass
    ) and not t.tgisinternal and (
      t.tgenabled <> 'O' or
      (t.tgrelid = 'public.services'::pg_catalog.regclass
        and t.tgname <> 'services_set_updated_at') or
      (t.tgrelid = 'public.specialists'::pg_catalog.regclass
        and t.tgname <> 'specialists_set_updated_at') or
      (t.tgrelid = 'public.bookings'::pg_catalog.regclass
        and t.tgname <> 'bookings_set_updated_at') or
      t.tgrelid in (
        'public.specialist_services'::pg_catalog.regclass,
        'public.specialist_availability'::pg_catalog.regclass
      )
    )
  ) or (select count(*) from pg_catalog.pg_trigger
    where tgrelid in (
      'public.services'::pg_catalog.regclass,
      'public.specialists'::pg_catalog.regclass,
      'public.bookings'::pg_catalog.regclass
    ) and not tgisinternal) <> 3 then
    raise exception 'BOOKLY catalog or booking triggers differ from the reviewed schema';
  end if;
  if exists (
    select 1 from public.specialist_services ss
    join public.specialists sp on sp.id = ss.specialist_id
    join public.services s on s.id = ss.service_id
    where sp.city_id <> s.city_id
  ) or exists (
    select 1 from public.bookings b
    join public.services s on s.id = b.service_id
    join public.specialists sp on sp.id = b.specialist_id
    where b.city_id <> s.city_id or b.city_id <> sp.city_id
  ) then
    raise exception 'BOOKLY has cross-city links or bookings; inspect before assigning salons';
  end if;
end;
$preflight$;

create table public.salons (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,100}$'),
  name text not null check (pg_catalog.char_length(name) between 2 and 120),
  description text not null default '' check (pg_catalog.char_length(description) <= 2000),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'legacy_unclaimed')),
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint salons_id_city_unique unique (id, city_id)
);

create trigger salons_set_updated_at before update on public.salons
for each row execute function public.set_updated_at();

create table public.salon_memberships (
  salon_id uuid not null references public.salons(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'specialist')),
  created_at timestamptz not null default pg_catalog.now(),
  primary key (salon_id, user_id)
);
create index salon_memberships_user_idx on public.salon_memberships (user_id, role, salon_id);

alter table public.services add column salon_id uuid;
alter table public.specialists add column salon_id uuid;
alter table public.specialist_services add column salon_id uuid;
alter table public.specialist_availability add column salon_id uuid;
alter table public.bookings add column salon_id uuid;

-- One unclaimed container per city prevents any user from inheriting old bookings.
insert into public.salons (id, city_id, slug, name, status)
select pg_catalog.md5('bookly-legacy-city:' || c.id::text)::uuid,
  c.id,
  'legacy-' || pg_catalog.substr(pg_catalog.md5(c.id::text), 1, 24),
  pg_catalog.left('Служебный каталог BOOKLY — ' || c.name, 120),
  'legacy_unclaimed'
from public.cities c
where exists (select 1 from public.services s where s.city_id = c.id)
   or exists (select 1 from public.specialists sp where sp.city_id = c.id)
   or exists (select 1 from public.bookings b where b.city_id = c.id);

-- Suspend only the timestamp triggers while assigning tenant IDs; restore them
-- before commit so existing updated_at values and future behavior are preserved.
alter table public.services disable trigger services_set_updated_at;
alter table public.specialists disable trigger specialists_set_updated_at;
alter table public.bookings disable trigger bookings_set_updated_at;

update public.services s set salon_id = sal.id
from public.salons sal where sal.city_id = s.city_id and sal.status = 'legacy_unclaimed';
update public.specialists sp set salon_id = sal.id
from public.salons sal where sal.city_id = sp.city_id and sal.status = 'legacy_unclaimed';
update public.specialist_services ss set salon_id = s.salon_id
from public.services s where s.id = ss.service_id;
update public.specialist_availability a set salon_id = sp.salon_id
from public.specialists sp where sp.id = a.specialist_id;
update public.bookings b set salon_id = s.salon_id
from public.services s where s.id = b.service_id;

alter table public.services enable trigger services_set_updated_at;
alter table public.specialists enable trigger specialists_set_updated_at;
alter table public.bookings enable trigger bookings_set_updated_at;

do $backfill_guard$
begin
  if exists (select 1 from public.services where salon_id is null)
    or exists (select 1 from public.specialists where salon_id is null)
    or exists (select 1 from public.specialist_services where salon_id is null)
    or exists (select 1 from public.specialist_availability where salon_id is null)
    or exists (select 1 from public.bookings where salon_id is null) then
    raise exception 'BOOKLY salon backfill is incomplete; entire transaction will roll back';
  end if;
end;
$backfill_guard$;

alter table public.services alter column salon_id set not null;
alter table public.specialists alter column salon_id set not null;
alter table public.specialist_services alter column salon_id set not null;
alter table public.specialist_availability alter column salon_id set not null;
alter table public.bookings alter column salon_id set not null;

alter table public.services add constraint services_id_salon_unique unique (id, salon_id);
alter table public.specialists add constraint specialists_id_salon_unique unique (id, salon_id);
alter table public.services add constraint services_salon_city_fk
  foreign key (salon_id, city_id) references public.salons(id, city_id);
alter table public.specialists add constraint specialists_salon_city_fk
  foreign key (salon_id, city_id) references public.salons(id, city_id);
alter table public.specialist_services add constraint specialist_services_service_salon_fk
  foreign key (service_id, salon_id) references public.services(id, salon_id);
alter table public.specialist_services add constraint specialist_services_specialist_salon_fk
  foreign key (specialist_id, salon_id) references public.specialists(id, salon_id);
alter table public.specialist_availability add constraint availability_specialist_salon_fk
  foreign key (specialist_id, salon_id) references public.specialists(id, salon_id);
alter table public.bookings add constraint bookings_service_salon_fk
  foreign key (service_id, salon_id) references public.services(id, salon_id);
alter table public.bookings add constraint bookings_specialist_salon_fk
  foreign key (specialist_id, salon_id) references public.specialists(id, salon_id);
alter table public.bookings add constraint bookings_salon_city_fk
  foreign key (salon_id, city_id) references public.salons(id, city_id);

create index services_salon_idx on public.services (salon_id);
create index specialists_salon_idx on public.specialists (salon_id);
create index specialist_services_salon_idx on public.specialist_services (salon_id);
create index availability_salon_start_idx on public.specialist_availability (salon_id, starts_at);
create index bookings_salon_start_idx on public.bookings (salon_id, starts_at desc);

-- Ownership of catalog rows and historical bookings cannot be reassigned.
create function public.bookly_reject_salon_reassignment()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  if new.salon_id is distinct from old.salon_id then
    raise exception using errcode = '23514', message = 'salon_id_immutable';
  end if;
  return new;
end;
$$;
create trigger services_salon_immutable before update on public.services
for each row execute function public.bookly_reject_salon_reassignment();
create trigger specialists_salon_immutable before update on public.specialists
for each row execute function public.bookly_reject_salon_reassignment();
create trigger specialist_services_salon_immutable before update on public.specialist_services
for each row execute function public.bookly_reject_salon_reassignment();
create trigger availability_salon_immutable before update on public.specialist_availability
for each row execute function public.bookly_reject_salon_reassignment();
create trigger bookings_salon_immutable before update on public.bookings
for each row execute function public.bookly_reject_salon_reassignment();
revoke all on function public.bookly_reject_salon_reassignment() from public, anon, authenticated, service_role;

create schema bookly_private;
revoke all on schema bookly_private from public, anon, service_role;
grant usage on schema bookly_private to authenticated;

create function bookly_private.is_salon_owner(p_salon_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog as $$
  select exists (
    select 1 from public.salon_memberships m
    where m.salon_id = p_salon_id
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;
revoke all on function bookly_private.is_salon_owner(uuid) from public, anon, authenticated, service_role;
grant execute on function bookly_private.is_salon_owner(uuid) to authenticated;

alter table public.salons enable row level security;
alter table public.salon_memberships enable row level security;
-- Existing tables retain their enabled RLS state.
revoke all on public.salons, public.salon_memberships from public, anon, authenticated;
grant select on public.salons to anon, authenticated;
grant update (name, description, status) on public.salons to authenticated;
grant select on public.salon_memberships to authenticated;

create policy salons_public_read on public.salons for select to anon, authenticated
using (status in ('published', 'legacy_unclaimed'));
create policy salons_owner_read on public.salons for select to authenticated
using (bookly_private.is_salon_owner(id));
create policy salons_owner_update on public.salons for update to authenticated
using (bookly_private.is_salon_owner(id) and status in ('draft', 'published'))
with check (bookly_private.is_salon_owner(id) and status in ('draft', 'published'));
create policy memberships_read_own on public.salon_memberships for select to authenticated
using (user_id = (select auth.uid()));

revoke all on public.services, public.specialists, public.specialist_services
  from public, anon, authenticated;
grant select on public.services, public.specialists, public.specialist_services
  to anon, authenticated;
grant insert (salon_id, city_id, name, category, description, duration_minutes,
  price_rub, image_url, is_active) on public.services to authenticated;
grant update (name, category, description, duration_minutes, price_rub, image_url, is_active)
  on public.services to authenticated;
grant insert (salon_id, city_id, name, title, bio, experience_years, is_active)
  on public.specialists to authenticated;
grant update (name, title, bio, experience_years, is_active)
  on public.specialists to authenticated;
grant insert (salon_id, specialist_id, service_id) on public.specialist_services to authenticated;
grant delete on public.specialist_services to authenticated;

drop policy services_read_active on public.services;
drop policy specialists_read_active on public.specialists;
drop policy specialist_services_read_available on public.specialist_services;

create policy services_public_read on public.services for select to anon, authenticated
using (is_active and exists (
  select 1 from public.salons sal join public.cities c on c.id = sal.city_id
  where sal.id = services.salon_id and sal.status in ('published', 'legacy_unclaimed')
    and c.is_active
));
create policy services_owner_read on public.services for select to authenticated
using (bookly_private.is_salon_owner(salon_id));
create policy services_owner_insert on public.services for insert to authenticated
with check (bookly_private.is_salon_owner(salon_id)
  and (image_url is null or image_url ~ '^/images/[A-Za-z0-9/_-]+[.](png|jpe?g|webp)$'));
create policy services_owner_update on public.services for update to authenticated
using (bookly_private.is_salon_owner(salon_id))
with check (bookly_private.is_salon_owner(salon_id)
  and (image_url is null or image_url ~ '^/images/[A-Za-z0-9/_-]+[.](png|jpe?g|webp)$'));

create policy specialists_public_read on public.specialists for select to anon, authenticated
using (is_active and exists (
  select 1 from public.salons sal join public.cities c on c.id = sal.city_id
  where sal.id = specialists.salon_id and sal.status in ('published', 'legacy_unclaimed')
    and c.is_active
));
create policy specialists_owner_read on public.specialists for select to authenticated
using (bookly_private.is_salon_owner(salon_id));
create policy specialists_owner_insert on public.specialists for insert to authenticated
with check (bookly_private.is_salon_owner(salon_id));
create policy specialists_owner_update on public.specialists for update to authenticated
using (bookly_private.is_salon_owner(salon_id))
with check (bookly_private.is_salon_owner(salon_id));

create policy specialist_services_public_read on public.specialist_services
for select to anon, authenticated using (
  exists (
    select 1 from public.services s
    join public.specialists sp on sp.id = specialist_services.specialist_id
      and sp.salon_id = s.salon_id and sp.is_active
    join public.salons sal on sal.id = s.salon_id
      and sal.status in ('published', 'legacy_unclaimed')
    join public.cities c on c.id = sal.city_id and c.is_active
    where s.id = specialist_services.service_id
      and s.salon_id = specialist_services.salon_id and s.is_active
  )
);
create policy specialist_services_owner_read on public.specialist_services
for select to authenticated using (bookly_private.is_salon_owner(salon_id));
create policy specialist_services_owner_insert on public.specialist_services
for insert to authenticated with check (bookly_private.is_salon_owner(salon_id));
create policy specialist_services_owner_delete on public.specialist_services
for delete to authenticated using (bookly_private.is_salon_owner(salon_id));

revoke all on public.specialist_availability from public, anon, authenticated;
grant select on public.specialist_availability to authenticated;
grant insert (salon_id, specialist_id, starts_at, ends_at)
  on public.specialist_availability to authenticated;
create policy availability_owner_read on public.specialist_availability
for select to authenticated using (bookly_private.is_salon_owner(salon_id));
create policy availability_owner_insert on public.specialist_availability
for insert to authenticated with check (
  bookly_private.is_salon_owner(salon_id) and starts_at > pg_catalog.now()
);

-- Reassert the original customer rules before adding an owner SELECT rule.
-- SELECT policies combine with OR; the sole UPDATE rule remains customer-only.
revoke all on public.bookings from public, anon, authenticated;
grant select on public.bookings to authenticated;
grant update (status) on public.bookings to authenticated;
drop policy bookings_read_own on public.bookings;
create policy bookings_read_own on public.bookings for select to authenticated
using (customer_id = (select auth.uid()));
drop policy bookings_cancel_own_future on public.bookings;
create policy bookings_cancel_own_future on public.bookings for update to authenticated
using (
  customer_id = (select auth.uid())
  and starts_at > pg_catalog.clock_timestamp()
  and status in ('pending', 'confirmed')
)
with check (customer_id = (select auth.uid()) and status = 'cancelled');
create policy bookings_owner_read on public.bookings for select to authenticated
using (bookly_private.is_salon_owner(salon_id));

create function public.bookly_create_salon(
  p_city_id uuid, p_slug text, p_name text, p_description text default ''
) returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_user_id uuid := auth.uid();
  v_salon_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_slug is null or p_slug !~ '^[a-z0-9-]{3,100}$'
    or p_slug like 'legacy-%'
    or p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 2 and 120
    or p_description is null or pg_catalog.char_length(p_description) > 2000 then
    raise exception using errcode = '22023', message = 'invalid_salon_details';
  end if;
  if not exists (select 1 from public.cities where id = p_city_id and is_active) then
    raise exception using errcode = '22023', message = 'city_unavailable';
  end if;
  insert into public.salons (city_id, slug, name, description, status)
  values (p_city_id, p_slug, pg_catalog.btrim(p_name), p_description, 'draft')
  returning id into v_salon_id;
  insert into public.salon_memberships (salon_id, user_id, role)
  values (v_salon_id, v_user_id, 'owner');
  return v_salon_id;
end;
$$;
revoke all on function public.bookly_create_salon(uuid,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.bookly_create_salon(uuid,text,text,text) to authenticated;

create function public.bookly_confirm_booking(p_salon_id uuid, p_booking_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_booking public.bookings%rowtype;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  select b.* into v_booking from public.bookings b
  where b.id = p_booking_id and b.salon_id = p_salon_id
    and exists (
      select 1 from public.salon_memberships m
      where m.salon_id = b.salon_id and m.user_id = auth.uid() and m.role = 'owner'
    )
  for update of b;
  if not found then
    raise exception using errcode = 'P0001', message = 'booking_not_found';
  end if;
  if v_booking.status <> 'pending' or v_booking.starts_at <= pg_catalog.clock_timestamp() then
    raise exception using errcode = 'P0001', message = 'booking_not_confirmable';
  end if;
  update public.bookings set status = 'confirmed' where id = v_booking.id;
  return v_booking.id;
end;
$$;
revoke all on function public.bookly_confirm_booking(uuid,uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.bookly_confirm_booking(uuid,uuid) to authenticated;

-- Replace booking RPCs without changing their signatures or client callers.
create or replace function public.bookly_available_slots(
  p_service_id uuid, p_specialist_id uuid, p_day date
) returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = pg_catalog as $$
  select distinct slot.starts_at,
    slot.starts_at + pg_catalog.make_interval(mins => s.duration_minutes::integer)
  from public.services s
  join public.salons sal on sal.id = s.salon_id and sal.city_id = s.city_id
    and sal.status in ('published', 'legacy_unclaimed')
  join public.cities c on c.id = sal.city_id and c.is_active
  join pg_catalog.pg_timezone_names tz on tz.name = c.timezone
  join public.specialists sp on sp.id = p_specialist_id
    and sp.salon_id = sal.id and sp.is_active
  join public.specialist_services ss on ss.service_id = s.id
    and ss.specialist_id = sp.id and ss.salon_id = sal.id
  join public.specialist_availability a on a.specialist_id = sp.id
    and a.salon_id = sal.id
  cross join lateral pg_catalog.generate_series(
    a.starts_at,
    a.ends_at - pg_catalog.make_interval(mins => s.duration_minutes::integer),
    interval '15 minutes'
  ) as slot(starts_at)
  where s.id = p_service_id and s.is_active
    and p_day between (pg_catalog.now() at time zone tz.name)::date
      and (pg_catalog.now() at time zone tz.name)::date + 60
    and a.starts_at < ((p_day + 1)::timestamp at time zone tz.name) + interval '24 hours'
    and a.ends_at > (p_day::timestamp at time zone tz.name) - interval '24 hours'
    and (slot.starts_at at time zone tz.name)::date = p_day
    and slot.starts_at > pg_catalog.now()
    and not exists (
      select 1 from public.bookings b
      where b.specialist_id = sp.id and b.salon_id = sal.id
        and b.status in ('pending', 'confirmed')
        and pg_catalog.tstzrange(b.starts_at, b.ends_at, '[)') &&
          pg_catalog.tstzrange(
            slot.starts_at,
            slot.starts_at + pg_catalog.make_interval(mins => s.duration_minutes::integer),
            '[)'
          )
    )
  order by 1;
$$;

create or replace function public.bookly_create_booking(
  p_service_id uuid, p_specialist_id uuid, p_starts_at timestamptz
) returns uuid language plpgsql security definer set search_path = pg_catalog as $$
declare
  v_user_id uuid := auth.uid();
  v_service public.services%rowtype;
  v_booking_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  select * into v_service from public.services
  where id = p_service_id and is_active for share;
  if not found then
    raise exception using errcode = 'P0001', message = 'service_unavailable';
  end if;
  perform 1 from public.salons sal
    join public.cities c on c.id = sal.city_id and c.is_active
    where sal.id = v_service.salon_id and sal.city_id = v_service.city_id
      and sal.status in ('published', 'legacy_unclaimed')
    for share of sal, c;
  if not found then
    raise exception using errcode = 'P0001', message = 'slot_unavailable';
  end if;
  perform 1 from public.specialists sp
    where sp.id = p_specialist_id and sp.salon_id = v_service.salon_id and sp.is_active
    for share;
  if not found then
    raise exception using errcode = 'P0001', message = 'slot_unavailable';
  end if;
  perform 1 from public.specialist_services ss
    where ss.specialist_id = p_specialist_id and ss.service_id = p_service_id
      and ss.salon_id = v_service.salon_id
    for share;
  if not found then
    raise exception using errcode = 'P0001', message = 'slot_unavailable';
  end if;
  if not exists (
    select 1 from public.bookly_available_slots(
      p_service_id, p_specialist_id,
      (p_starts_at at time zone (
        select tz.name from public.cities c
        join pg_catalog.pg_timezone_names tz on tz.name = c.timezone
        where c.id = v_service.city_id and c.is_active
      ))::date
    ) slot where slot.starts_at = p_starts_at
  ) then
    raise exception using errcode = 'P0001', message = 'slot_unavailable';
  end if;
  insert into public.bookings (
    customer_id, salon_id, city_id, service_id, specialist_id, starts_at, ends_at,
    status, service_name, price_rub, duration_minutes
  ) values (
    v_user_id, v_service.salon_id, v_service.city_id, v_service.id, p_specialist_id,
    p_starts_at,
    p_starts_at + pg_catalog.make_interval(mins => v_service.duration_minutes::integer),
    'pending', v_service.name, v_service.price_rub, v_service.duration_minutes
  ) returning id into v_booking_id;
  return v_booking_id;
end;
$$;

revoke all on function public.bookly_available_slots(uuid,uuid,date)
  from public, anon, authenticated, service_role;
grant execute on function public.bookly_available_slots(uuid,uuid,date) to anon, authenticated;
revoke all on function public.bookly_create_booking(uuid,uuid,timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.bookly_create_booking(uuid,uuid,timestamptz) to authenticated;

-- The old GiST exclusion constraint remains the final concurrent-booking guard.
do $verify_permissions$
begin
  if pg_catalog.has_function_privilege('anon', 'public.bookly_create_salon(uuid,text,text,text)', 'EXECUTE')
    or pg_catalog.has_function_privilege('anon', 'public.bookly_confirm_booking(uuid,uuid)', 'EXECUTE')
    or pg_catalog.has_function_privilege('anon', 'public.bookly_create_booking(uuid,uuid,timestamptz)', 'EXECUTE')
    or pg_catalog.has_function_privilege('anon', 'bookly_private.is_salon_owner(uuid)', 'EXECUTE')
    or pg_catalog.has_function_privilege('anon', 'public.bookly_reject_salon_reassignment()', 'EXECUTE')
    or not pg_catalog.has_function_privilege('authenticated', 'public.bookly_create_salon(uuid,text,text,text)', 'EXECUTE')
    or not pg_catalog.has_function_privilege('authenticated', 'public.bookly_confirm_booking(uuid,uuid)', 'EXECUTE')
    or not pg_catalog.has_function_privilege('authenticated', 'public.bookly_create_booking(uuid,uuid,timestamptz)', 'EXECUTE')
    or not pg_catalog.has_function_privilege('authenticated', 'public.bookly_available_slots(uuid,uuid,date)', 'EXECUTE')
    or not pg_catalog.has_function_privilege('authenticated', 'bookly_private.is_salon_owner(uuid)', 'EXECUTE')
    or pg_catalog.has_table_privilege('authenticated', 'public.salon_memberships', 'INSERT, UPDATE, DELETE')
    or pg_catalog.has_table_privilege('authenticated', 'public.salons', 'INSERT, DELETE')
    or pg_catalog.has_any_column_privilege('authenticated', 'public.bookings', 'INSERT')
    or pg_catalog.has_any_column_privilege('anon', 'public.bookings', 'SELECT, INSERT, UPDATE')
    or exists (select 1 from pg_catalog.pg_attribute a
      where a.attrelid = 'public.bookings'::pg_catalog.regclass
        and a.attnum > 0 and not a.attisdropped and a.attname <> 'status'
        and pg_catalog.has_column_privilege('authenticated', 'public.bookings', a.attname, 'UPDATE'))
    or pg_catalog.has_column_privilege('authenticated', 'public.services', 'salon_id', 'UPDATE')
    or pg_catalog.has_column_privilege('authenticated', 'public.services', 'city_id', 'UPDATE')
    or pg_catalog.has_column_privilege('authenticated', 'public.specialists', 'salon_id', 'UPDATE')
    or pg_catalog.has_column_privilege('authenticated', 'public.specialists', 'city_id', 'UPDATE')
    or pg_catalog.has_column_privilege('authenticated', 'public.salons', 'city_id', 'UPDATE')
    or not exists (
      select 1 from pg_catalog.pg_constraint
      where conrelid = 'public.bookings'::pg_catalog.regclass
        and conname = 'bookings_specialist_no_overlap' and contype = 'x'
    ) then
    raise exception 'BOOKLY salon privileges or booking exclusion constraint are unexpected';
  end if;
end;
$verify_permissions$;

notify pgrst, 'reload schema';
commit;
