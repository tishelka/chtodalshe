from uuid import uuid4

from alembic import command
from alembic.config import Config
from sqlalchemy import text

from app.bootstrap import migrate
from app.config import BACKEND_ROOT
from app.database import make_engine
from app.profile import SHARED_USER_ID
from tests.database import temporary_database


def test_upgrade_preserves_old_profiles_and_their_data():
    with temporary_database() as url:
        config = Config(str(BACKEND_ROOT / "alembic.ini"))
        config.attributes["database_url"] = url
        command.downgrade(config, "20261012_0001")
        old_user = uuid4()
        activity = "10000000-0000-4000-8000-000000000001"
        entry = uuid4()
        engine = make_engine(url)
        try:
            with engine.begin() as db:
                db.execute(text("insert into users (id) values (:id)"), {"id": old_user})
                db.execute(
                    text(
                        "insert into user_preferences (user_id, interests) values (:id, '{walks}')"
                    ),
                    {"id": old_user},
                )
                db.execute(
                    text("insert into user_sessions (token_hash, user_id) values (:token, :id)"),
                    {"token": "a" * 64, "id": old_user},
                )
                db.execute(
                    text("insert into favorites (user_id, activity_id) values (:id, :activity)"),
                    {"id": old_user, "activity": activity},
                )
                db.execute(
                    text("""
                    insert into recommendation_history (user_id, id, activity_id, created_at, filters, chosen)
                    values (:user_id, :entry, :activity, now(),
                        '{"participants": 1, "availableMinutes": 60, "budgetPerPerson": 0, "location": "any", "mood": "any"}', true)
                """),
                    {"user_id": old_user, "entry": entry, "activity": activity},
                )
            migrate(url)
            with engine.connect() as db:
                assert db.scalar(
                    text("select interests from user_preferences where user_id = :id"),
                    {"id": old_user},
                ) == ["walks"]
                assert (
                    db.scalar(
                        text("select count(*) from favorites where user_id = :id"), {"id": old_user}
                    )
                    == 1
                )
                assert (
                    db.scalar(
                        text("select chosen from recommendation_history where user_id = :id"),
                        {"id": old_user},
                    )
                    is True
                )
                assert (
                    db.scalar(
                        text("select count(*) from users where id = :id"), {"id": SHARED_USER_ID}
                    )
                    == 1
                )
                assert db.scalar(text("select to_regclass('public.user_sessions')")) is None
        finally:
            engine.dispose()
