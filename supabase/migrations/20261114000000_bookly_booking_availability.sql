-- Review before applying. Explicit availability windows are entered by an operator.
-- No windows are created here, so no appointment is advertised without a schedule.
-- Run the whole file once in SQL Editor. Any error rolls back every statement.
begin;
set local search_path = pg_catalog;

do $guard$
begin
  if pg_catalog.to_regclass('public.cities') is null
    or pg_catalog.to_regclass('public.specialists') is null
    or pg_catalog.to_regclass('public.services') is null
    or pg_catalog.to_regclass('public.specialist_services') is null
    or pg_catalog.to_regclass('public.bookings') is null
    or pg_catalog.to_regclass('public.profiles') is null then
    raise exception 'BOOKLY initial schema is missing; stop before applying availability migration';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.bookings'::pg_catalog.regclass
      and conname = 'bookings_specialist_no_overlap' and contype = 'x'
  ) then
    raise exception 'BOOKLY booking overlap constraint is missing';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_class t
    where t.oid in (
      'public.cities'::pg_catalog.regclass,
      'public.specialists'::pg_catalog.regclass,
      'public.services'::pg_catalog.regclass,
      'public.specialist_services'::pg_catalog.regclass,
      'public.bookings'::pg_catalog.regclass,
      'public.profiles'::pg_catalog.regclass
    ) and not t.relrowsecurity
  ) then
    raise exception 'BOOKLY initial schema has a table without RLS';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_roles
    where rolname = current_user and (rolsuper or rolbypassrls)
  ) then
    raise exception 'BOOKLY SECURITY DEFINER functions must be created by a BYPASSRLS owner';
  end if;
  if pg_catalog.to_regclass('public.specialist_availability') is not null
    or pg_catalog.to_regprocedure('public.bookly_available_slots(uuid,uuid,date)') is not null
    or pg_catalog.to_regprocedure('public.bookly_create_booking(uuid,uuid,timestamptz)') is not null
    or exists (select 1 from pg_catalog.pg_policy where polname = 'bookings_cancel_own_future'
      and polrelid = 'public.bookings'::pg_catalog.regclass) then
    raise exception 'BOOKLY availability migration is already applied or partially present; inspect before retrying';
  end if;
  if (select count(*) from pg_catalog.pg_policy
      where polrelid = 'public.bookings'::pg_catalog.regclass) <> 2
    or not exists (
      select 1 from pg_catalog.pg_policy
      where polrelid = 'public.bookings'::pg_catalog.regclass
        and polname = 'bookings_read_own' and polcmd = 'r' and polpermissive
        and polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]
    )
    or not exists (
      select 1 from pg_catalog.pg_policy
      where polrelid = 'public.bookings'::pg_catalog.regclass
        and polname = 'bookings_insert_own_pending' and polcmd = 'a' and polpermissive
        and polroles = array[(select oid from pg_catalog.pg_roles where rolname = 'authenticated')]
    ) then
    raise exception 'BOOKLY bookings policies differ from the initial migration';
  end if;
end;
$guard$;

create table public.specialist_availability (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  specialist_id uuid not null references public.specialists (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint specialist_availability_positive_duration check (
    ends_at > starts_at and ends_at <= starts_at + interval '24 hours'
  )
);

create index specialist_availability_specialist_start_idx
  on public.specialist_availability (specialist_id, starts_at);

alter table public.specialist_availability enable row level security;
revoke all on public.specialist_availability from public, anon, authenticated;

-- SECURITY DEFINER reads other customers' occupied intervals without exposing bookings.
create function public.bookly_available_slots(
  p_service_id uuid,
  p_specialist_id uuid,
  p_day date
)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select distinct slot.starts_at,
    slot.starts_at + pg_catalog.make_interval(mins => s.duration_minutes::integer)
  from public.services s
  join public.cities c on c.id = s.city_id and c.is_active
  join pg_catalog.pg_timezone_names tz on tz.name = c.timezone
  join public.specialists sp on sp.id = p_specialist_id
    and sp.city_id = s.city_id and sp.is_active
  join public.specialist_services ss on ss.service_id = s.id
    and ss.specialist_id = sp.id
  join public.specialist_availability a on a.specialist_id = sp.id
  cross join lateral pg_catalog.generate_series(
    a.starts_at,
    a.ends_at - pg_catalog.make_interval(mins => s.duration_minutes::integer),
    interval '15 minutes'
  ) as slot(starts_at)
  where s.id = p_service_id and s.is_active
    and p_day between (pg_catalog.now() at time zone tz.name)::date
      and (pg_catalog.now() at time zone tz.name)::date + 60
    -- Wide bounds only prune windows; the local-date test below is authoritative at DST shifts.
    and a.starts_at < ((p_day + 1)::timestamp at time zone tz.name) + interval '24 hours'
    and a.ends_at > (p_day::timestamp at time zone tz.name) - interval '24 hours'
    and (slot.starts_at at time zone tz.name)::date = p_day
    and slot.starts_at > pg_catalog.now()
    and not exists (
      select 1 from public.bookings b
      where b.specialist_id = sp.id
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

revoke all on function public.bookly_available_slots(uuid, uuid, date) from public, anon, authenticated, service_role;
grant execute on function public.bookly_available_slots(uuid, uuid, date) to anon, authenticated;

-- The server and database derive city, price, duration and customer from trusted rows.
-- The existing exclusion constraint remains the final concurrency guard.
create function public.bookly_create_booking(
  p_service_id uuid,
  p_specialist_id uuid,
  p_starts_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_service public.services%rowtype;
  v_booking_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;

  select * into v_service from public.services
  where id = p_service_id and is_active
  for share;
  if not found then
    raise exception using errcode = 'P0001', message = 'service_unavailable';
  end if;

  if not exists (
    select 1 from public.bookly_available_slots(
      p_service_id,
      p_specialist_id,
      (p_starts_at at time zone
        (select tz.name from public.cities c
         join pg_catalog.pg_timezone_names tz on tz.name = c.timezone
         where c.id = v_service.city_id and c.is_active))::date
    ) slot where slot.starts_at = p_starts_at
  ) then
    raise exception using errcode = 'P0001', message = 'slot_unavailable';
  end if;

  insert into public.bookings (
    customer_id, city_id, service_id, specialist_id, starts_at, ends_at,
    status, service_name, price_rub, duration_minutes
  ) values (
    v_user_id, v_service.city_id, v_service.id, p_specialist_id,
    p_starts_at,
    p_starts_at + pg_catalog.make_interval(mins => v_service.duration_minutes::integer),
    'pending', v_service.name, v_service.price_rub, v_service.duration_minutes
  ) returning id into v_booking_id;
  return v_booking_id;
end;
$$;

revoke all on function public.bookly_create_booking(uuid, uuid, timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.bookly_create_booking(uuid, uuid, timestamptz) to authenticated;
revoke insert on public.bookings from public, anon, authenticated;
-- A future accidental INSERT grant must not revive the old schedule-free path.
drop policy bookings_insert_own_pending on public.bookings;

-- Only the owner may cancel a future active booking. No other column is writable.
revoke update on public.bookings from public, anon, authenticated;
grant update (status) on public.bookings to authenticated;
create policy bookings_cancel_own_future on public.bookings
for update to authenticated
using (
  customer_id = (select auth.uid())
  and starts_at > pg_catalog.clock_timestamp()
  and status in ('pending', 'confirmed')
)
with check (
  customer_id = (select auth.uid())
  and status = 'cancelled'
);

-- Effective privileges include grants inherited through other roles.
do $verify_privileges$
begin
  if pg_catalog.has_function_privilege('anon',
      'public.bookly_create_booking(uuid,uuid,timestamptz)', 'EXECUTE')
    or pg_catalog.has_function_privilege('service_role',
      'public.bookly_create_booking(uuid,uuid,timestamptz)', 'EXECUTE')
    or not pg_catalog.has_function_privilege('authenticated',
      'public.bookly_create_booking(uuid,uuid,timestamptz)', 'EXECUTE')
    or pg_catalog.has_function_privilege('service_role',
      'public.bookly_available_slots(uuid,uuid,date)', 'EXECUTE')
    or not pg_catalog.has_function_privilege('anon',
      'public.bookly_available_slots(uuid,uuid,date)', 'EXECUTE')
    or not pg_catalog.has_function_privilege('authenticated',
      'public.bookly_available_slots(uuid,uuid,date)', 'EXECUTE') then
    raise exception 'BOOKLY RPC effective EXECUTE privileges are unexpected';
  end if;
  if pg_catalog.has_table_privilege('anon', 'public.specialist_availability',
      'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
    or pg_catalog.has_table_privilege('authenticated', 'public.specialist_availability',
      'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')
    or pg_catalog.has_table_privilege('anon', 'public.bookings',
      'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER')
    or pg_catalog.has_table_privilege('authenticated', 'public.bookings',
      'INSERT, DELETE, TRUNCATE, TRIGGER')
    or not pg_catalog.has_table_privilege('authenticated', 'public.bookings', 'SELECT')
    or exists (
      select 1 from pg_catalog.pg_attribute a
      where a.attrelid = 'public.bookings'::pg_catalog.regclass
        and a.attnum > 0 and not a.attisdropped
        and (pg_catalog.has_column_privilege('anon', 'public.bookings', a.attname, 'SELECT')
          or pg_catalog.has_column_privilege('anon', 'public.bookings', a.attname, 'INSERT')
          or pg_catalog.has_column_privilege('anon', 'public.bookings', a.attname, 'UPDATE')
          or pg_catalog.has_column_privilege('authenticated', 'public.bookings', a.attname, 'INSERT')
          or (a.attname <> 'status' and pg_catalog.has_column_privilege(
            'authenticated', 'public.bookings', a.attname, 'UPDATE')))
    )
    or not pg_catalog.has_column_privilege('authenticated', 'public.bookings',
      'status', 'UPDATE') then
    raise exception 'BOOKLY table effective privileges are unexpected';
  end if;
  if exists (
    select 1 from pg_catalog.pg_policy
    where polrelid = 'public.bookings'::pg_catalog.regclass
      and polcmd in ('a', '*')
  ) then
    raise exception 'BOOKLY direct INSERT must have no applicable RLS policy';
  end if;
end;
$verify_privileges$;

commit;
