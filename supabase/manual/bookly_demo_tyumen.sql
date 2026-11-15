-- BOOKLY demo catalog for manual execution in the BOOKLY SQL Editor only.
-- All names and descriptions identify fictional demonstration data.
-- Re-running adds only missing schedule windows for the next seven full local days.
begin;
set local search_path = pg_catalog;

do $preflight$
begin
  if pg_catalog.to_regclass('public.cities') is null
    or pg_catalog.to_regclass('public.services') is null
    or pg_catalog.to_regclass('public.specialists') is null
    or pg_catalog.to_regclass('public.specialist_services') is null
    or pg_catalog.to_regclass('public.specialist_availability') is null
    or pg_catalog.to_regprocedure('public.bookly_available_slots(uuid,uuid,date)') is null
    or pg_catalog.to_regprocedure('public.bookly_create_booking(uuid,uuid,timestamptz)') is null then
    raise exception 'BOOKLY booking schema is incomplete; demo catalog was not added';
  end if;
  if current_user <> 'postgres' then
    raise exception 'Run this demo catalog as postgres in the BOOKLY SQL Editor';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class
    where oid = 'public.specialist_availability'::pg_catalog.regclass
      and relrowsecurity
  ) or (
    select count(*) from pg_catalog.pg_proc
    where oid in (
      'public.bookly_available_slots(uuid,uuid,date)'::pg_catalog.regprocedure,
      'public.bookly_create_booking(uuid,uuid,timestamptz)'::pg_catalog.regprocedure
    ) and prosecdef
  ) <> 2 then
    raise exception 'BOOKLY availability RLS or booking RPC security is not as expected';
  end if;
end;
$preflight$;

insert into public.cities (id, slug, name, timezone, is_active)
values (
  'c1000000-0000-4000-8000-000000000001',
  'tyumen-demo', 'Тюмень (демо)', 'Asia/Yekaterinburg', true
)
on conflict (id) do nothing;

insert into public.specialists (id, city_id, name, title, bio, is_active)
values
  (
    'e1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'Алина Ветрова (демо)', 'Стилист-колорист (демо)',
    'Вымышленный специалист для проверки записи BOOKLY.', true
  ),
  (
    'e1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'Марк Лавров (демо)', 'Мастер по уходу за волосами (демо)',
    'Вымышленный специалист для проверки записи BOOKLY.', true
  )
on conflict (id) do nothing;

insert into public.services (
  id, city_id, name, category, description,
  duration_minutes, price_rub, image_url, is_active
)
values
  (
    'd1000000-0000-4000-8000-000000000001',
    'c1000000-0000-4000-8000-000000000001',
    'Стрижка и укладка (демо)', 'Волосы',
    'Демонстрационная услуга для проверки онлайн-записи.',
    60, 2800, '/images/bookly-services.png', true
  ),
  (
    'd1000000-0000-4000-8000-000000000002',
    'c1000000-0000-4000-8000-000000000001',
    'Окрашивание в один тон (демо)', 'Волосы',
    'Демонстрационная услуга для проверки онлайн-записи.',
    120, 5500, '/images/bookly-services.png', true
  ),
  (
    'd1000000-0000-4000-8000-000000000003',
    'c1000000-0000-4000-8000-000000000001',
    'Уход для волос (демо)', 'Волосы',
    'Демонстрационная услуга для проверки онлайн-записи.',
    45, 2200, '/images/bookly-services.png', true
  )
on conflict (id) do nothing;

-- Refuse to attach demo links or windows to rows changed by someone else.
do $verify_catalog$
begin
  if not exists (
    select 1 from public.cities
    where id = 'c1000000-0000-4000-8000-000000000001'
      and slug = 'tyumen-demo' and name = 'Тюмень (демо)'
      and timezone = 'Asia/Yekaterinburg' and is_active
  ) or (
    select count(*) from public.specialists
    where city_id = 'c1000000-0000-4000-8000-000000000001'
      and is_active
      and (id, name, title) in (
        ('e1000000-0000-4000-8000-000000000001'::uuid,
         'Алина Ветрова (демо)', 'Стилист-колорист (демо)'),
        ('e1000000-0000-4000-8000-000000000002'::uuid,
         'Марк Лавров (демо)', 'Мастер по уходу за волосами (демо)')
      )
  ) <> 2 or (
    select count(*) from public.services
    where city_id = 'c1000000-0000-4000-8000-000000000001'
      and is_active
      and (id, name, duration_minutes, price_rub) in (
        ('d1000000-0000-4000-8000-000000000001'::uuid,
         'Стрижка и укладка (демо)', 60, 2800),
        ('d1000000-0000-4000-8000-000000000002'::uuid,
         'Окрашивание в один тон (демо)', 120, 5500),
        ('d1000000-0000-4000-8000-000000000003'::uuid,
         'Уход для волос (демо)', 45, 2200)
      )
  ) <> 3 then
    raise exception 'Existing demo IDs differ from the expected catalog; no changes were committed';
  end if;
end;
$verify_catalog$;

insert into public.specialist_services (specialist_id, service_id)
values
  ('e1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002'),
  ('e1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000003'),
  ('e1000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000001'),
  ('e1000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003')
on conflict (specialist_id, service_id) do nothing;

-- 10:00-18:00 and 12:00-20:00 Tyumen time, tomorrow through day seven.
-- The deterministic UUID plus the interval check prevent duplicates on repeat runs.
with shifts (specialist_id, opens_at, closes_at) as (
  values
    ('e1000000-0000-4000-8000-000000000001'::uuid, time '10:00', time '18:00'),
    ('e1000000-0000-4000-8000-000000000002'::uuid, time '12:00', time '20:00')
), windows as (
  select
    sh.specialist_id,
    (pg_catalog.now() at time zone 'Asia/Yekaterinburg')::date + d.day_offset as work_day,
    sh.opens_at,
    sh.closes_at
  from shifts sh
  cross join pg_catalog.generate_series(1, 7) as d(day_offset)
), intervals as (
  select
    w.specialist_id,
    pg_catalog.md5('bookly-demo-tyumen:' || w.specialist_id::text || ':' || w.work_day::text)::uuid as id,
    ((w.work_day + w.opens_at) at time zone 'Asia/Yekaterinburg') as starts_at,
    ((w.work_day + w.closes_at) at time zone 'Asia/Yekaterinburg') as ends_at
  from windows w
)
insert into public.specialist_availability (id, specialist_id, starts_at, ends_at)
select i.id, i.specialist_id, i.starts_at, i.ends_at
from intervals i
where not exists (
  select 1 from public.specialist_availability existing
  where existing.specialist_id = i.specialist_id
    and existing.starts_at = i.starts_at
    and existing.ends_at = i.ends_at
)
on conflict (id) do nothing;

do $verify_schedule$
begin
  if exists (
    select 1
    from (
      values
        ('e1000000-0000-4000-8000-000000000001'::uuid, time '10:00', time '18:00'),
        ('e1000000-0000-4000-8000-000000000002'::uuid, time '12:00', time '20:00')
    ) as sh(specialist_id, opens_at, closes_at)
    cross join pg_catalog.generate_series(1, 7) as d(day_offset)
    where not exists (
      select 1 from public.specialist_availability a
      where a.specialist_id = sh.specialist_id
        and a.starts_at = (
          ((pg_catalog.now() at time zone 'Asia/Yekaterinburg')::date
            + d.day_offset + sh.opens_at) at time zone 'Asia/Yekaterinburg'
        )
        and a.ends_at = (
          ((pg_catalog.now() at time zone 'Asia/Yekaterinburg')::date
            + d.day_offset + sh.closes_at) at time zone 'Asia/Yekaterinburg'
        )
    )
  ) then
    raise exception 'BOOKLY demo schedule is incomplete; no changes were committed';
  end if;
end;
$verify_schedule$;

commit;
