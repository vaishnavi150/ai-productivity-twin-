from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import QueuePool
from app.config import settings
import logging

logger = logging.getLogger(__name__)

engine = create_engine(
    settings.DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=3600,
    echo=settings.DEBUG,
)


class Base(DeclarativeBase):
    pass


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency injection for database sessions."""
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_tables():
    """Create all tables. Use Alembic for production migrations."""
    from app.models import user, activity, prediction, insight  # noqa
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")
