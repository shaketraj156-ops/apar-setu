-- SNAP — 001 schema
-- Run order: migrations/001, migrations/002, views/003, seed/seed_data.sql. Synthetic data only.
-- (The mock APAAR registry is a separate service: mock_apaar_registry/.)

create extension if not exists "pgcrypto";

-- ───────── Enums ─────────
create type user_role as enum
  ('student','institution_staff','institution_admin','aicte_officer','verifier','auditor','system_admin');
create type record_status as enum ('draft','validated','flagged','submitted','verified');
create type enrollment_status as enum ('active','withdrawn','transferred','completed');
create type batch_status as enum ('uploaded','validating','validated','has_errors','submitted','failed');
create type finding_severity as enum ('error','warning','review');
create type consent_status as enum ('PENDING','GRANTED','REJECTED','EXPIRED','REVOKED');
create type apaar_registry_status as enum ('VALID','INVALID','NOT_FOUND','PENDING');
create type admission_category as enum ('general','obc','sc','st','ews','management','nri','oci','foreign_national');

-- ───────── updated_at trigger ─────────
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ───────── institutions ─────────
create table institutions (
  id uuid primary key default gen_random_uuid(),
  aicte_code text unique not null,
  name text not null,
  state text not null,
  district text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────── profiles (1:1 with auth.users) ─────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  role user_role not null default 'student',
  institution_id uuid references institutions(id),
  apaar_id_hash text,            -- sha256 of APAAR ID; links a student user to their records
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on profiles(institution_id);
create index on profiles(apaar_id_hash);

-- ───────── programmes ─────────
create table programmes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  name text not null,
  academic_year text not null,                   -- e.g. 2026-30
  approved_intake int not null check (approved_intake >= 0),
  supernumerary_quota int not null default 0 check (supernumerary_quota >= 0),
  nri_quota int not null default 0 check (nri_quota >= 0),
  oci_quota int not null default 0 check (oci_quota >= 0),
  fn_quota int not null default 0 check (fn_quota >= 0),
  session_start date not null,
  session_end date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, name, academic_year)
);
create index on programmes(institution_id);

-- ───────── upload_batches ─────────
create table upload_batches (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references institutions(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  file_name text not null,
  total_rows int not null default 0,
  valid_rows int not null default 0,
  error_rows int not null default 0,
  warning_rows int not null default 0,
  status batch_status not null default 'uploaded',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on upload_batches(institution_id, created_at desc);

-- ───────── student_records ─────────
create table student_records (
  id uuid primary key default gen_random_uuid(),
  apaar_id text,                                  -- 12 digits (synthetic only)
  apaar_id_hash text generated always as (
    case when apaar_id is null then null else encode(digest(apaar_id,'sha256'),'hex') end
  ) stored,
  institution_id uuid not null references institutions(id) on delete cascade,
  programme_id uuid not null references programmes(id) on delete restrict,
  batch_id uuid references upload_batches(id) on delete set null,
  academic_year text not null,
  student_institution_id text not null,
  full_name text not null,
  gender text,
  dob date,
  admission_date date,
  category admission_category not null default 'general',
  is_supernumerary boolean not null default false,
  is_nri boolean not null default false,
  is_oci boolean not null default false,
  is_foreign_national boolean not null default false,
  enrollment_status enrollment_status not null default 'active',
  record_status record_status not null default 'draft',
  registry_status apaar_registry_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, student_institution_id, academic_year)
);
create index on student_records(institution_id);
create index on student_records(programme_id);
create index on student_records(apaar_id);
create index on student_records(apaar_id_hash);
create index on student_records(batch_id);
create index on student_records(record_status);

-- ───────── validation_findings ─────────
create table validation_findings (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references upload_batches(id) on delete cascade,
  record_id uuid references student_records(id) on delete cascade,
  row_number int,
  rule_code text not null,
  severity finding_severity not null,
  message text not null,
  evidence jsonb not null default '{}'::jsonb,
  recommended_action text,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on validation_findings(batch_id);
create index on validation_findings(record_id);
create index on validation_findings(rule_code);

-- ───────── verification_requests ─────────
create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  verification_ref text unique not null default ('VER-' || to_char(now(),'YYYY') || '-' || lpad((floor(random()*1000000))::int::text,6,'0')),
  requester_id uuid not null references profiles(id),
  record_id uuid not null references student_records(id) on delete cascade,
  purpose text,
  result_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on verification_requests(requester_id);
create index on verification_requests(record_id);

-- ───────── consent_records ─────────
create table consent_records (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references student_records(id) on delete cascade,
  student_id uuid not null references profiles(id),
  requester_id uuid not null references profiles(id),
  verification_request_id uuid references verification_requests(id) on delete set null,
  status consent_status not null default 'PENDING',
  scope text[] not null default array['institution','programme','academic_year','status'],
  expires_at timestamptz not null default (now() + interval '30 days'),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on consent_records(student_id, status);
create index on consent_records(requester_id);

-- ───────── audit_logs (append-only) ─────────
create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);
create index on audit_logs(entity_type, entity_id);
create index on audit_logs(actor_id);

create or replace function block_audit_mutation() returns trigger as $$
begin raise exception 'audit_logs is append-only'; end;
$$ language plpgsql;
create trigger audit_no_update before update or delete on audit_logs
  for each row execute function block_audit_mutation();

-- ───────── updated_at triggers ─────────
do $$
declare t text;
begin
  foreach t in array array['institutions','profiles','programmes','upload_batches','student_records',
                           'validation_findings','verification_requests','consent_records']
  loop
    execute format('create trigger trg_%I_updated before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
