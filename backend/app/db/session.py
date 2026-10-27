from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings

settings = get_settings()

FALLBACK_DATABASE_URL = "postgresql+psycopg2://postgres.jegmxdnvwtgjtnnhxhak:Aparsetu%23database0@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres"

db_url = (settings.DATABASE_URL or "").strip().strip('"').strip("'")
# Normalise Postgres URLs to the psycopg2 driver we ship (Supabase/Render hand out
# "postgres://", "postgresql://" or sometimes "postgresql+psycopg://").
for _prefix in ("postgresql+psycopg://", "postgresql://", "postgres://"):
    if db_url.startswith(_prefix):
        db_url = "postgresql+psycopg2://" + db_url[len(_prefix):]
        break

# If db_url points to invalid/failing Singapore pooler (ap-southeast-1) or any pooler
# other than the working project database, switch to FALLBACK_DATABASE_URL:
if "ap-southeast-1" in db_url or ("pooler.supabase.com" in db_url and "jegmxdnvwtgjtnnhxhak" not in db_url):
    db_url = FALLBACK_DATABASE_URL

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

def make_engine(url: str):
    if url.startswith('sqlite'):
        return create_engine(
            url,
            connect_args={'check_same_thread': False},
            poolclass=StaticPool,
        )
    return create_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_recycle=1800,
    )

engine = make_engine(db_url)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db():
    global engine, SessionLocal, db_url
    try:
        db = SessionLocal()
        if not db_url.startswith('sqlite'):
            db.execute(text("SELECT 1"))
    except OperationalError:
        if db_url != FALLBACK_DATABASE_URL:
            db_url = FALLBACK_DATABASE_URL
            engine = make_engine(FALLBACK_DATABASE_URL)
            SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
            db = SessionLocal()
        else:
            raise

    try:
        yield db
    finally:
        db.close()
