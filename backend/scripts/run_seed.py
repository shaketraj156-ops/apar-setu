import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import re
import hashlib
from app.db.session import engine
from sqlalchemy import text

seed_path = os.path.join(os.path.dirname(__file__), '..', '..', 'database', 'seed', 'seed_data.sql')
sql = open(seed_path, encoding='utf-8').read()
cleaned_sql = re.sub(r'--.*$', '', sql, flags=re.MULTILINE)
statements = [s.strip() for s in cleaned_sql.split(';') if s.strip()]

with engine.connect() as conn:
    for i, stmt in enumerate(statements):
        print(f"Executing statement {i+1}/{len(statements)}...")
        conn.execute(text(stmt))
    
    rows = conn.execute(text("SELECT id, apaar_id FROM student_records WHERE apaar_id IS NOT NULL AND apaar_id_hash IS NULL")).fetchall()
    print(f"Updating apaar_id_hash for {len(rows)} students...")
    for row in rows:
        h = hashlib.sha256(row[1].encode('utf-8')).hexdigest()
        conn.execute(text("UPDATE student_records SET apaar_id_hash = :h WHERE id = :id"), {"h": h, "id": row[0]})
    
    conn.commit()
print("All seed data and hashes committed successfully!")
