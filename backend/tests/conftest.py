
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # Register all models with SQLAlchemy metadata
from app.core.config import settings
from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app


# Always use the dedicated test database.
test_database_url = settings.DATABASE_URL

from sqlalchemy.engine import make_url

test_database_url = make_url(test_database_url).set(
    database="bug_tracker_test_db"
)

if test_database_url.database != "bug_tracker_test_db":
    raise RuntimeError("Tests must use bug_tracker_test_db only.")

test_engine = create_engine(
    test_database_url,
    pool_pre_ping=True,
)

TestingSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture
def db_session():
    # Reset only the dedicated test database before each test.
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
