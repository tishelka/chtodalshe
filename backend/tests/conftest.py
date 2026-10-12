import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, update

from app.config import Settings
from app.database import make_engine, make_session_factory
from app.main import create_app
from app.models import Favorite, RecommendationHistory, UserPreferences
from app.profile import SHARED_USER_ID
from tests.database import temporary_database


@pytest.fixture(scope="session")
def database_url():
    with temporary_database() as url:
        yield url


@pytest.fixture
def client(database_url):
    engine = make_engine(database_url)
    try:
        with make_session_factory(engine)() as db:
            db.execute(delete(Favorite).where(Favorite.user_id == SHARED_USER_ID))
            db.execute(
                delete(RecommendationHistory).where(RecommendationHistory.user_id == SHARED_USER_ID)
            )
            db.execute(
                update(UserPreferences)
                .where(UserPreferences.user_id == SHARED_USER_ID)
                .values(
                    interests=[],
                    onboarding_completed=False,
                    last_filters=None,
                )
            )
            db.commit()
    finally:
        engine.dispose()
    with TestClient(
        create_app(Settings(database_url=database_url)), raise_server_exceptions=False
    ) as api:
        yield api
