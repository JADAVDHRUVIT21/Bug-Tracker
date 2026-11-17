
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import sessionmaker

import app.models  # Register all models with SQLAlchemy metadata
from app.core.config import settings
from app.core.limiter import limiter
from app.db.base import Base
from app.db.dependencies import get_db
from app.main import app


# Parse the original database URL before changing its database name.
original_database_url = make_url(settings.DATABASE_URL)

# Only allow local database servers for destructive test operations.
allowed_test_hosts = {"localhost", "127.0.0.1", "::1"}

if original_database_url.host not in allowed_test_hosts:
    raise RuntimeError(
        "Tests can only run against a local PostgreSQL server. "
        f"Configured host: {original_database_url.host!r}"
    )

if not original_database_url.database:
    raise RuntimeError(
        "The configured database URL must include a database name."
    )

# Always use the dedicated test database.
test_database_url = original_database_url.set(
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


@pytest.fixture(autouse=True)
def reset_rate_limits():
    # Prevent rate-limit counters from leaking between tests.
    limiter.reset()


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

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)