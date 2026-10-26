from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings

settings = get_settings()

db_url = settings.DATABASE_URL
if not db_url:
    backend_dir = Path(__file__).resolve().parents[2]
    db_file = backend_dir / "apar_setu.db"
    db_url = f"sqlite:///{db_file}"
elif db_url.startswith("sqlite:///") and not db_url.startswith("sqlite:///:memory:"):
    raw_path = db_url.replace("sqlite:///", "")
    p = Path(raw_path)
    if not p.is_absolute():
        backend_dir = Path(__file__).resolve().parents[2]
        db_url = f"sqlite:///{backend_dir / p}"

if db_url.startswith('sqlite'):
    # Used for local dev / pytest. StaticPool keeps one in-memory DB across threads.
    engine = create_engine(
        db_url,
        connect_args={'check_same_thread': False},
        poolclass=StaticPool,
    )
else:
    engine = create_engine(
        db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_recycle=1800,
    )

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
