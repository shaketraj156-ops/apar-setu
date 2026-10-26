"""Generate deterministic synthetic seed data for SNAP.

Outputs:
  database/seed/seed_data.sql                           institutions, programmes, batches, students, findings
  mock_apaar_registry/app/data/synthetic_apaar_records.json   synthetic APAAR IDs -> registry status
  samples/full_upload_template.csv                      header + 1 example row (superset of student_upload_template.csv)
  samples/validation_demo.csv                           valid / invalid / duplicate demo rows for one institution

Run:  python database/seed/generate_seed.py
Only synthetic APAAR IDs (prefix 90) are produced. Never use real Aadhaar/APAAR data.
"""
import csv
import json
import random
import uuid
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]      # database/
REPO = ROOT.parent
rng = random.Random(42)
NS = uuid.UUID("a1a2a3a4-0000-4000-8000-00000000a2a2")


def uid(name: str) -> str:
    return str(uuid.uuid5(NS, name))


def q(v) -> str:
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


FIRST = ["Aarav", "Vivaan", "Aditya", "Ishaan", "Rohan", "Kabir", "Arjun", "Sai", "Riya", "Ananya", "Diya",
         "Meera", "Priya", "Kavya", "Neha", "Sneha", "Isha", "Tanvi", "Rahul", "Karan", "Nikhil", "Pooja"]
LAST = ["Sharma", "Verma", "Patel", "Singh", "Gupta", "Mishra", "Reddy", "Nair", "Iyer", "Joshi", "Kulkarni",
        "Yadav", "Chauhan", "Das", "Pillai", "Rao"]

INSTITUTIONS = [
    ("EIT", "AICTE-MP-0001", "Example Institute of Technology", "Madhya Pradesh", "Bhopal"),
    ("VIE", "AICTE-MP-0002", "Vindhya Institute of Engineering", "Madhya Pradesh", "Indore"),
    ("SCE", "AICTE-MH-0003", "Sunrise College of Engineering", "Maharashtra", "Pune"),
    ("CTI", "AICTE-TN-0004", "Coastal Tech Institute", "Tamil Nadu", "Chennai"),
]
AY = "2026-30"
SESSION_START, SESSION_END = date(2026, 7, 1), date(2026, 10, 31)

# (inst, programme, approved, super, nri, oci, fn, admit_count)
PROGRAMMES = [
    ("EIT", "B.Tech Computer Science", 12, 2, 2, 1, 1, 12),   # at limit
    ("EIT", "B.Tech Mechanical", 10, 1, 1, 1, 1, 14),         # intake exceeded (red)
    ("VIE", "B.Tech Computer Science", 12, 2, 2, 1, 1, 11),   # near limit (orange)
    ("VIE", "B.Tech Civil", 10, 1, 1, 1, 1, 6),                # safe (green)
    ("SCE", "B.Tech Electronics", 10, 1, 1, 1, 1, 8),
    ("SCE", "B.Tech Information Technology", 12, 2, 2, 1, 1, 9),
    ("CTI", "B.Tech Computer Science", 12, 2, 2, 1, 1, 7),
    ("CTI", "B.Tech Electrical", 10, 1, 1, 1, 1, 12),         # exceeded via supernumerary abuse
]

inst_id = {c: uid("inst-" + c) for c, *_ in INSTITUTIONS}
prog_id = {(i, n): uid(f"prog-{i}-{n}") for i, n, *_ in PROGRAMMES}
batch_id = {c: uid("batch-" + c) for c, *_ in INSTITUTIONS}

# ── APAAR pool ──
used = set()


def new_apaar() -> str:
    while True:
        a = "90" + "".join(str(rng.randint(0, 9)) for _ in range(10))
        if a not in used:
            used.add(a)
            return a


records = []  # dicts
registry = {}
sid_counter = {}


def add_record(inst, prog, apaar, status="submitted", category="general", sup=False, nri=False, oci=False, fn=False,
               admit=None, enrol="active", name=None):
    n = sid_counter.get(inst, 0) + 1
    sid_counter[inst] = n
    admit = admit or (SESSION_START + timedelta(days=rng.randint(0, 100)))
    rec = dict(
        id=uid(f"rec-{inst}-{n}"), apaar_id=apaar, institution=inst, programme=prog, sid=f"{inst}{AY[:4]}{n:03d}",
        name=name or f"{rng.choice(FIRST)} {rng.choice(LAST)}", gender=rng.choice(["M", "F"]),
        dob=date(2007, 1, 1) + timedelta(days=rng.randint(0, 600)), admit=admit, category=category,
        sup=sup, nri=nri, oci=oci, fn=fn, enrol=enrol, status=status,
    )
    records.append(rec)
    return rec


for inst, prog, approved, sup_q, nri_q, oci_q, fn_q, count in PROGRAMMES:
    for i in range(count):
        a = new_apaar()
        registry[a] = "VALID"
        flags = dict(category="general", sup=False, nri=False, oci=False, fn=False)
        if i >= approved:                      # beyond approved intake -> supernumerary / flagged
            flags.update(sup=True, category="management")
        elif i == 1:
            flags.update(category="nri", nri=True)
        elif i == 2:
            flags.update(category="oci", oci=True)
        elif i == 3:
            flags.update(category="foreign_national", fn=True)
        elif i % 4 == 0:
            flags.update(category="obc")
        elif i % 5 == 0:
            flags.update(category="sc")
        add_record(inst, prog, a, **flags)

# ── injected anomalies ──
# 1) cross-institution duplicate: same APAAR active in EIT-CS and SCE-Electronics
dup = new_apaar(); registry[dup] = "VALID"
add_record("EIT", "B.Tech Computer Science", dup, status="flagged", name="Rohan Mishra")
add_record("SCE", "B.Tech Electronics", dup, status="flagged", name="Rohan Mishra")
# 2) second cross-institution duplicate
dup2 = new_apaar(); registry[dup2] = "VALID"
add_record("VIE", "B.Tech Civil", dup2, status="flagged", name="Ananya Joshi")
add_record("CTI", "B.Tech Electrical", dup2, status="flagged", name="Ananya Joshi")
# 3) registry problems
for st, inst, prog in [("INVALID", "EIT", "B.Tech Mechanical"), ("NOT_FOUND", "VIE", "B.Tech Computer Science"),
                       ("PENDING", "SCE", "B.Tech Information Technology"), ("NOT_FOUND", "CTI", "B.Tech Computer Science")]:
    a = new_apaar(); registry[a] = st
    add_record(inst, prog, a, status="flagged")
# 4) category conflict: NRI flag on general category
a = new_apaar(); registry[a] = "VALID"
add_record("EIT", "B.Tech Computer Science", a, status="flagged", category="general", nri=True)
# 5) date outside session
a = new_apaar(); registry[a] = "VALID"
add_record("SCE", "B.Tech Electronics", a, status="flagged", admit=date(2025, 12, 1))

for _a in ("900000000099", "900000000098", "900000000097"):
    registry[_a] = "VALID"

# extra registry-only IDs for testing (not enrolled anywhere)
for st in ["VALID", "VALID", "INVALID", "NOT_FOUND", "PENDING"]:
    a = new_apaar(); registry[a] = st

# registry status on records
for r in records:
    r["registry"] = registry.get(r["apaar_id"])

# ── build SQL ──
out = ["-- SNAP — synthetic seed data (generated by database/seed/generate_seed.py)",
       "-- SYNTHETIC ONLY. Run after migrations 001, 002. Safe to re-run (ON CONFLICT DO NOTHING).", ""]

out.append("insert into institutions (id, aicte_code, name, state, district) values")
out.append(",\n".join(f"({q(inst_id[c])},{q(code)},{q(name)},{q(state)},{q(dist)})"
                      for c, code, name, state, dist in INSTITUTIONS) + "\non conflict do nothing;\n")

out.append("insert into programmes (id, institution_id, name, academic_year, approved_intake, supernumerary_quota, nri_quota, oci_quota, fn_quota, session_start, session_end) values")
out.append(",\n".join(
    f"({q(prog_id[(i, n)])},{q(inst_id[i])},{q(n)},{q(AY)},{a},{s},{nr},{oc},{fn},{q(str(SESSION_START))},{q(str(SESSION_END))})"
    for i, n, a, s, nr, oc, fn, _ in PROGRAMMES) + "\non conflict do nothing;\n")

counts = {}
for r in records:
    counts.setdefault(r["institution"], []).append(r)
out.append("insert into upload_batches (id, institution_id, file_name, total_rows, valid_rows, error_rows, warning_rows, status) values")
rows = []
for c, *_ in INSTITUTIONS:
    rs = counts.get(c, [])
    bad = sum(1 for r in rs if r["status"] == "flagged")
    rows.append(f"({q(batch_id[c])},{q(inst_id[c])},{q(c.lower() + '_admissions_2026.csv')},{len(rs)},{len(rs) - bad},{bad},0,'has_errors')")
out.append(",\n".join(rows) + "\non conflict do nothing;\n")

out.append("insert into student_records (id, apaar_id, institution_id, programme_id, batch_id, academic_year, student_institution_id, full_name, gender, dob, admission_date, category, is_supernumerary, is_nri, is_oci, is_foreign_national, enrollment_status, record_status, registry_status) values")
out.append(",\n".join(
    "({},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{})".format(
        q(r["id"]), q(r["apaar_id"]), q(inst_id[r["institution"]]), q(prog_id[(r["institution"], r["programme"])]),
        q(batch_id[r["institution"]]), q(AY), q(r["sid"]), q(r["name"]), q(r["gender"]), q(str(r["dob"])),
        q(str(r["admit"])), q(r["category"]), q(r["sup"]), q(r["nri"]), q(r["oci"]), q(r["fn"]), q(r["enrol"]),
        q(r["status"]), q(r["registry"]))
    for r in records) + "\non conflict do nothing;\n")

# findings for flagged records
findings = []
by_apaar = {}
for r in records:
    by_apaar.setdefault(r["apaar_id"], []).append(r)
for r in records:
    b = batch_id[r["institution"]]
    if len(by_apaar[r["apaar_id"]]) > 1:
        others = [x["institution"] for x in by_apaar[r["apaar_id"]] if x is not r]
        findings.append((b, r["id"], "DUPLICATE_ACROSS_INSTITUTIONS", "review",
                         "Same APAAR ID is active in more than one institution",
                         {"other_institutions": others}, "Investigate and confirm which enrolment is genuine"))
    if r["registry"] in ("INVALID", "NOT_FOUND", "PENDING"):
        findings.append((b, r["id"], "APAAR_NOT_VERIFIED", "error" if r["registry"] != "PENDING" else "warning",
                         f"APAAR registry returned {r['registry']}", {"registry_status": r["registry"]},
                         "Ask the student to re-check APAAR ID in DigiLocker"))
    if r["nri"] and r["category"] == "general":
        findings.append((b, r["id"], "CATEGORY_CONFLICT", "warning", "NRI flag set but category is general",
                         {"category": r["category"], "is_nri": True}, "Correct admission category or NRI flag"))
    if not (SESSION_START <= r["admit"] <= SESSION_END):
        findings.append((b, r["id"], "DATE_INVALID", "error", "Admission date is outside the academic session",
                         {"admission_date": str(r["admit"]), "session": [str(SESSION_START), str(SESSION_END)]},
                         "Correct the admission date"))
for inst, prog, approved, *_rest, count in PROGRAMMES:
    if count > approved:
        extra = [r for r in records if r["institution"] == inst and r["programme"] == prog and r["sup"]]
        for r in extra:
            findings.append((batch_id[inst], r["id"], "INTAKE_EXCEEDED", "error",
                             f"Admissions ({count}) exceed approved intake ({approved})",
                             {"approved_intake": approved, "actual": count}, "Review excess admissions with the institution"))

out.append("insert into validation_findings (batch_id, record_id, rule_code, severity, message, evidence, recommended_action) values")
out.append(",\n".join(
    f"({q(b)},{q(rid)},{q(rc)},{q(sv)},{q(msg)},{q(json.dumps(ev))}::jsonb,{q(act)})"
    for b, rid, rc, sv, msg, ev, act in findings) + ";\n")

out.append("""-- NOTE: profiles need real auth.users rows. Create demo users in Supabase Auth, then run:
--   update profiles set role='institution_admin', institution_id='<EIT institution id>' where email='eit.admin@demo.test';
--   update profiles set role='aicte_officer' where email='aicte@demo.test';
--   update profiles set role='verifier' where email='verifier@demo.test';
--   update profiles set role='student', apaar_id_hash=encode(digest('<synthetic apaar id>','sha256'),'hex') where email='student@demo.test';
""")
(ROOT / "seed" / "seed_data.sql").write_text("\n".join(out), encoding="utf-8")

# registry JSON: keep the 3 original demo IDs, add all synthetic IDs
reg_path = REPO / "mock_apaar_registry" / "app" / "data" / "synthetic_apaar_records.json"
reg = {"111111111111": {"status": "VALID"}, "222222222222": {"status": "INVALID"}, "333333333333": {"status": "PENDING"}}
reg.update({a: {"status": st} for a, st in sorted(registry.items())})
reg_path.write_text(json.dumps(reg, indent=2) + "\n", encoding="utf-8")

# ── CSV templates ──
# First four columns match samples/student_upload_template.csv; institution comes from the logged-in user.
HEADER = ["student_name", "programme", "academic_year", "apaar_id", "student_institution_id", "gender", "dob",
          "admission_date", "category", "is_supernumerary", "is_nri", "is_oci", "is_foreign_national",
          "enrollment_status"]
(REPO / "samples").mkdir(exist_ok=True)
with open(REPO / "samples" / "full_upload_template.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(HEADER)
    w.writerow(["Sample Student", "B.Tech Computer Science", AY, "900000000001", "EIT2026901", "F",
                "2008-03-14", "2026-07-20", "general", "false", "false", "false", "false", "active"])

eit_ok = [r for r in records if r["institution"] == "EIT" and r["programme"] == "B.Tech Computer Science"
          and r["status"] == "submitted"][:8]
rows = [[r["name"], r["programme"], AY, r["apaar_id"], r["sid"], r["gender"], r["dob"], r["admit"],
         r["category"], str(r["sup"]).lower(), str(r["nri"]).lower(), str(r["oci"]).lower(), str(r["fn"]).lower(),
         r["enrol"]] for r in eit_ok]
P = "B.Tech Computer Science"
def row(apaar, sid, name, dob, adm, cat="general", nri="false", gender="M"):
    return [name, P, AY, apaar, sid, gender, dob, adm, cat, "false", nri, "false", "false", "active"]


bad = [
    row("", "EIT2026951", "Missing Apaar", "2008-01-01", "2026-07-21"),
    row("9000000012", "EIT2026952", "Short Format", "2008-02-02", "2026-07-21", gender="F"),
    row(eit_ok[0]["apaar_id"], "EIT2026953", "Duplicate In Batch", "2008-03-03", "2026-07-22"),
    row(dup, "EIT2026954", "Cross Institution Dup", "2008-04-04", "2026-07-22"),
    row("900000000099", "EIT2026955", "Late Admission", "2008-05-05", "2025-12-01", gender="F"),
    row("900000000098", "EIT2026956", "Category Conflict", "2008-06-06", "2026-07-25", nri="true"),
    row("900000000097", "", "", "", "2026-07-25", gender="F"),
]
with open(REPO / "samples" / "validation_demo.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(HEADER)
    w.writerows(rows + bad)

print(f"records={len(records)} registry={len(registry)} findings={len(findings)}")
