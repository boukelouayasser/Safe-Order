"""
Safe Order — Database Connection
SQLAlchemy session factory and base model.
Supports both SQLite (local dev) and PostgreSQL (production / Railway).
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings


def _normalize_database_url(url: str) -> str:
    """
    Railway and Heroku expose PostgreSQL via the legacy ``postgres://`` scheme.
    SQLAlchemy 1.4+ requires ``postgresql://`` (or a driver-qualified form).
    Normalize the URL so the same env var works everywhere.
    """
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://"):]
    return url


DATABASE_URL = _normalize_database_url(settings.DATABASE_URL)
is_sqlite = DATABASE_URL.startswith("sqlite")

if is_sqlite:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
