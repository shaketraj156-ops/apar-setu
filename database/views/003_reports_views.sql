-- SNAP — 003 reporting & analytics views (run after migrations 001, 002)
-- security_invoker = on so RLS of the caller applies (institution users still see only their rows).

-- Intake utilisation per programme
create or replace view v_intake_utilization with (security_invoker = on) as
select
  p.id as programme_id, i.id as institution_id, i.name as institution_name, i.state,
  p.name as programme_name, p.academic_year,
  p.approved_intake, p.supernumerary_quota,
  count(s.id) filter (where s.enrollment_status in ('active','completed') and not s.is_supernumerary) as regular_enrolled,
  count(s.id) filter (where s.enrollment_status in ('active','completed') and s.is_supernumerary)     as supernumerary_enrolled,
  count(s.id) filter (where s.enrollment_status in ('active','completed')) as total_enrolled,
  round(100.0 * count(s.id) filter (where s.enrollment_status in ('active','completed'))
        / nullif(p.approved_intake + p.supernumerary_quota, 0), 1) as utilization_pct,
  case
    when count(s.id) filter (where s.enrollment_status in ('active','completed'))
         > p.approved_intake + p.supernumerary_quota then 'exceeded'      -- red
    when count(s.id) filter (where s.enrollment_status in ('active','completed')) > p.approved_intake then 'review'  -- purple
    when count(s.id) filter (where s.enrollment_status in ('active','completed'))
         >= 0.9 * p.approved_intake then 'near_limit'                      -- orange
    else 'safe'                                                            -- green
  end as alert_level
from programmes p
join institutions i on i.id = p.institution_id
left join student_records s on s.programme_id = p.id
group by p.id, i.id, i.name, i.state, p.name, p.academic_year, p.approved_intake, p.supernumerary_quota;

-- Cross-institution duplicates (same APAAR active in >1 institution)
create or replace view v_duplicate_enrolments with (security_invoker = on) as
select
  s.apaar_id_hash,
  count(distinct s.institution_id) as institution_count,
  array_agg(distinct i.name) as institutions,
  array_agg(s.id) as record_ids
from student_records s
join institutions i on i.id = s.institution_id
where s.apaar_id is not null and s.enrollment_status = 'active'
group by s.apaar_id_hash
having count(distinct s.institution_id) > 1;

-- Data quality per institution
create or replace view v_data_quality with (security_invoker = on) as
select
  i.id as institution_id, i.name as institution_name, i.state,
  count(distinct s.id) as total_records,
  count(distinct f.record_id) filter (where f.severity = 'error'   and not f.is_resolved) as records_with_errors,
  count(distinct f.record_id) filter (where f.severity = 'warning' and not f.is_resolved) as records_with_warnings,
  round(100.0 * (1 - count(distinct f.record_id) filter (where f.severity in ('error','warning') and not f.is_resolved)::numeric
        / nullif(count(distinct s.id), 0)), 1) as data_quality_score
from institutions i
left join student_records s on s.institution_id = i.id
left join validation_findings f on f.record_id = s.id
group by i.id, i.name, i.state;

-- Category / quota breakdown per programme
create or replace view v_category_report with (security_invoker = on) as
select
  i.name as institution_name, i.state, p.name as programme_name, p.academic_year,
  count(*) filter (where s.category = 'general') as general,
  count(*) filter (where s.category = 'obc') as obc,
  count(*) filter (where s.category = 'sc') as sc,
  count(*) filter (where s.category = 'st') as st,
  count(*) filter (where s.category = 'ews') as ews,
  count(*) filter (where s.category = 'management') as management,
  count(*) filter (where s.is_nri) as nri,
  count(*) filter (where s.is_oci) as oci,
  count(*) filter (where s.is_foreign_national) as foreign_national,
  count(*) filter (where s.is_supernumerary) as supernumerary
from programmes p
join institutions i on i.id = p.institution_id
left join student_records s on s.programme_id = p.id
group by i.name, i.state, p.name, p.academic_year;

-- Compliance report (one line per institution)
create or replace view v_compliance_report with (security_invoker = on) as
select
  i.id as institution_id, i.name as institution_name, i.state,
  count(distinct s.id) as students_recorded,
  count(distinct s.id) filter (where s.registry_status = 'VALID') as verified_apaar,
  count(distinct f.record_id) filter (where f.rule_code like 'DUPLICATE%' and not f.is_resolved) as duplicate_flags,
  count(distinct u.programme_id) filter (where u.alert_level = 'exceeded') as programmes_exceeded,
  q.data_quality_score
from institutions i
left join student_records s on s.institution_id = i.id
left join validation_findings f on f.record_id = s.id
left join v_intake_utilization u on u.institution_id = i.id
left join v_data_quality q on q.institution_id = i.id
group by i.id, i.name, i.state, q.data_quality_score;

-- National KPIs (single row)
create or replace view v_national_kpis with (security_invoker = on) as
select
  (select count(*) from institutions where is_active) as institutions_registered,
  (select count(distinct institution_id) from student_records) as institutions_reporting,
  (select count(*) from student_records) as students_recorded,
  (select count(*) from student_records where registry_status = 'VALID') as verified_apaar,
  (select count(*) from student_records where record_status = 'flagged') as flagged_records,
  (select count(*) from v_duplicate_enrolments) as duplicate_cases,
  (select count(*) from v_intake_utilization where alert_level = 'exceeded') as programmes_exceeded;

-- State → Institution drill-down
create or replace view v_state_summary with (security_invoker = on) as
select state, count(distinct institution_id) as institutions,
       sum(total_enrolled) as enrolled, sum(approved_intake) as approved_intake,
       count(*) filter (where alert_level = 'exceeded') as exceeded_programmes
from v_intake_utilization group by state;
