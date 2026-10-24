
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.db.models import Base  # noqa: E402
from app.db.session import SessionLocal  # noqa: E402

with SessionLocal() as db:
    for name, table in Base.metadata.tables.items():
        try:
            db.execute(select(table).limit(1)).all()
            print(f'OK    {name}')
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            print(f'FAIL  {name}: {str(exc).splitlines()[0]}')
