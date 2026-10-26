-- SNAP — 002 Row Level Security
-- Principle: institution users see only their institution_id; students see only their own records;
-- AICTE/auditor/system_admin read nationally; verifiers never read raw student_records
-- (they go through the backend verification API using the service role).

-- ───────── helper functions (security definer so they bypass RLS on profiles) ─────────
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function auth_institution() returns uuid
language sql stable security definer set search_path = public as $$
  select institution_id from profiles where id = auth.uid()
$$;

create or replace function auth_apaar_hash() returns text
language sql stable security definer set search_path = public as $$
  select apaar_id_hash from profiles where id = auth.uid()
$$;

create or replace function is_national_reader() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('aicte_officer','auditor','system_admin'), false)
$$;

create or replace function is_institution_user() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('institution_staff','institution_admin'), false)
$$;

-- ───────── enable RLS ─────────
alter table institutions          enable row level security;
alter table profiles              enable row level security;
alter table programmes            enable row level security;
alter table upload_batches        enable row level security;
alter table student_records       enable row level security;
alter table validation_findings   enable row level security;
alter table verification_requests enable row level security;
alter table consent_records       enable row level security;
alter table audit_logs            enable row level security;

-- ───────── institutions ─────────
create policy inst_read_national on institutions for select using (is_national_reader());
create policy inst_read_own on institutions for select using (id = auth_institution());
create policy inst_admin_all on institutions for all
  using (auth_role() = 'system_admin') with check (auth_role() = 'system_admin');

-- ───────── profiles ─────────
create policy profile_self_read on profiles for select using (id = auth.uid());
create policy profile_self_update on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = auth_role());           -- cannot self-promote
create policy profile_national_read on profiles for select using (is_national_reader());
create policy profile_inst_admin_read on profiles for select
  using (auth_role() = 'institution_admin' and institution_id = auth_institution());
create policy profile_sysadmin_all on profiles for all
  using (auth_role() = 'system_admin') with check (auth_role() = 'system_admin');

-- ───────── programmes ─────────
create policy prog_read_national on programmes for select using (is_national_reader());
create policy prog_inst_all on programmes for all
  using (is_institution_user() and institution_id = auth_institution())
  with check (is_institution_user() and institution_id = auth_institution());

-- ───────── upload_batches ─────────
create policy batch_read_national on upload_batches for select using (is_national_reader());
create policy batch_inst_all on upload_batches for all
  using (is_institution_user() and institution_id = auth_institution())
  with check (is_institution_user() and institution_id = auth_institution());

-- ───────── student_records ─────────
create policy rec_read_national on student_records for select using (is_national_reader());
create policy rec_inst_all on student_records for all
  using (is_institution_user() and institution_id = auth_institution())
  with check (is_institution_user() and institution_id = auth_institution());
create policy rec_student_own on student_records for select
  using (auth_role() = 'student' and apaar_id_hash is not null and apaar_id_hash = auth_apaar_hash());

-- ───────── validation_findings ─────────
create policy find_read_national on validation_findings for select using (is_national_reader());
create policy find_inst_all on validation_findings for all
  using (is_institution_user() and exists (
    select 1 from upload_batches b where b.id = batch_id and b.institution_id = auth_institution()))
  with check (is_institution_user() and exists (
    select 1 from upload_batches b where b.id = batch_id and b.institution_id = auth_institution()));

-- ───────── verification_requests ─────────
create policy ver_requester_all on verification_requests for all
  using (requester_id = auth.uid()) with check (requester_id = auth.uid() and auth_role() in ('verifier','aicte_officer'));
create policy ver_national_read on verification_requests for select using (is_national_reader());

-- ───────── consent_records ─────────
create policy consent_student_read on consent_records for select using (student_id = auth.uid());
create policy consent_student_decide on consent_records for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid() and status in ('GRANTED','REJECTED','REVOKED'));
create policy consent_requester_read on consent_records for select using (requester_id = auth.uid());
create policy consent_requester_insert on consent_records for insert
  with check (requester_id = auth.uid() and auth_role() in ('verifier','aicte_officer') and status = 'PENDING');
create policy consent_national_read on consent_records for select using (is_national_reader());

-- ───────── audit_logs: read for auditors/admins; writes only via service role ─────────
create policy audit_read on audit_logs for select
  using (auth_role() in ('auditor','system_admin','aicte_officer'));

-- ───────── auto-create profile on signup ─────────
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email, 'student');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
