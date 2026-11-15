-- Read-only checks for the BOOKLY SQL Editor (project qpfltbtaxdngartdwtph).
select current_setting('server_version') as postgres_version, current_user as query_role;

select 'specialist_availability' as object_name,
       pg_catalog.to_regclass('public.specialist_availability') is not null as exists_in_database,
       pg_catalog.coalesce((
         select c.relrowsecurity from pg_catalog.pg_class c
         where c.oid = pg_catalog.to_regclass('public.specialist_availability')
       ), false) as rls_enabled;

select p.proname as function_name,
       pg_catalog.pg_get_userbyid(p.proowner) as owner_role,
       p.prosecdef as security_definer,
       p.proconfig as function_settings,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_catalog.pg_proc p
where p.oid in (
  pg_catalog.to_regprocedure('public.bookly_available_slots(uuid,uuid,date)'),
  pg_catalog.to_regprocedure('public.bookly_create_booking(uuid,uuid,timestamptz)')
)
order by p.proname;

select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_catalog.pg_policies
where schemaname = 'public'
  and tablename in ('bookings', 'specialist_availability')
order by tablename, policyname;

select pg_catalog.has_table_privilege('authenticated', 'public.specialist_availability',
         'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') as authenticated_availability_any_access,
       pg_catalog.has_table_privilege('anon', 'public.specialist_availability',
         'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER') as anon_availability_any_access,
       pg_catalog.has_table_privilege('authenticated', 'public.bookings', 'INSERT') as authenticated_direct_booking_insert,
       pg_catalog.has_table_privilege('authenticated', 'public.bookings', 'SELECT') as authenticated_booking_select,
       pg_catalog.has_column_privilege('authenticated', 'public.bookings', 'status', 'UPDATE') as authenticated_status_update,
       pg_catalog.has_column_privilege('authenticated', 'public.bookings', 'starts_at', 'UPDATE') as authenticated_time_update;
