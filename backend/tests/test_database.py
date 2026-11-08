
from sqlalchemy import text

from app.db.base import Base


def test_test_database_connection(db_session):
    database_name = db_session.execute(
        text("SELECT current_database()")
    ).scalar_one()

    assert database_name == "bug_tracker_test_db"


def test_all_database_tables_created(db_session):
    expected_tables = {
        "users",
        "projects",
        "project_members",
        "tickets",
        "comments",
        "attachments",
    }

    actual_tables = set(Base.metadata.tables.keys())

    assert expected_tables.issubset(actual_tables)