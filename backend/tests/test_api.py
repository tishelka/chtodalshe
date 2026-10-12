from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.bootstrap import migrate
from app.config import Settings
from app.database import make_engine, make_session_factory
from app.main import create_app
from app.models import Activity, User
from app.profile import SHARED_USER_ID
from app.seed import seed_catalog

ACTIVITY = "10000000-0000-4000-8000-000000000001"
FILTERS = {
    "participants": 3,
    "availableMinutes": 120,
    "budgetPerPerson": 500,
    "location": "home",
    "mood": "calm",
}
PREFERENCES = {
    "interests": ["walks", "reading"],
    "onboardingCompleted": True,
    "lastFilters": FILTERS,
}


def history(**overrides):
    return {
        "id": str(uuid4()),
        "activityId": ACTIVITY,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "filters": FILTERS,
        "chosen": False,
        **overrides,
    }


def test_health_and_catalog(client):
    assert client.get("/health").json() == {"status": "ok"}
    data = client.get("/activities").json()
    assert len(data) == 70
    assert len({item["id"] for item in data}) == 70
    assert len({item["category"] for item in data}) == 10
    assert all("minParticipants" in item and "estimatedCostPerPerson" in item for item in data)
    assert client.get(f"/activities/{ACTIVITY}").json()["id"] == ACTIVITY
    assert client.get(f"/activities/{uuid4()}").status_code == 404
    assert client.get("/activities/not-a-uuid").status_code == 422
    assert client.post("/activities", json={}).status_code == 405


def test_shared_profile_exists_without_registration(client, database_url):
    assert client.get("/preferences").status_code == 200
    assert client.get("/favorites").json() == []
    assert client.get("/history").json() == []
    assert client.post("/sessions/anonymous").status_code == 404
    engine = make_engine(database_url)
    try:
        with make_session_factory(engine)() as db:
            assert db.get(User, SHARED_USER_ID) is not None
            assert db.scalar(text("select to_regclass('public.user_sessions')")) is None
    finally:
        engine.dispose()


def test_preferences_round_trip(client):
    assert client.get("/preferences").json() == {
        "interests": [],
        "onboardingCompleted": False,
        "lastFilters": None,
    }
    body = {**PREFERENCES, "interests": ["walks", "walks", "reading"]}
    assert client.put("/preferences", json=body).status_code == 204
    assert client.get("/preferences").json() == PREFERENCES
    assert (
        client.put(
            "/preferences", json={**PREFERENCES, "interests": [], "lastFilters": None}
        ).status_code
        == 204
    )


@pytest.mark.parametrize(
    "override",
    [
        {"participants": 0},
        {"participants": 11},
        {"participants": 1.5},
        {"availableMinutes": 0},
        {"budgetPerPerson": -1},
        {"location": "unknown"},
        {"mood": "unknown"},
    ],
)
def test_invalid_filters(client, override):
    response = client.put(
        "/preferences", json={**PREFERENCES, "lastFilters": {**FILTERS, **override}}
    )
    assert response.status_code == 422
    assert set(response.json()) == {"detail"}


def test_unknown_categories_and_extra_fields_rejected(client):
    assert (
        client.put("/preferences", json={**PREFERENCES, "interests": ["unknown"]}).status_code
        == 422
    )
    assert (
        client.put("/preferences", json={**PREFERENCES, "userId": str(uuid4())}).status_code == 422
    )


def test_favorites_idempotency_and_delete(client):
    path = f"/favorites/{ACTIVITY}"
    assert client.put(path).status_code == 204
    assert client.put(path).status_code == 204
    assert client.get("/favorites").json() == [ACTIVITY]
    assert client.delete(path).status_code == 204
    assert client.delete(path).status_code == 204
    assert client.get("/favorites").json() == []
    assert client.put(f"/favorites/{uuid4()}").status_code == 404


def test_history_retries_do_not_duplicate_or_reset_chosen(client):
    entry = history()
    path = f"/history/{entry['id']}"
    assert client.put(path, json=entry).status_code == 204
    assert client.patch(path, json={"chosen": True}).status_code == 204
    assert client.put(path, json=entry).status_code == 204
    records = client.get("/history").json()
    assert len(records) == 1
    assert records[0]["chosen"] is True
    assert records[0]["filters"] == FILTERS
    assert records[0]["id"] == entry["id"]


def test_history_order_pagination_and_repeated_activity(client):
    newer = history()
    older = history(createdAt=(datetime.now(timezone.utc) - timedelta(days=1)).isoformat())
    for entry in (newer, older):
        assert client.put(f"/history/{entry['id']}", json=entry).status_code == 204
    assert [item["id"] for item in client.get("/history").json()] == [newer["id"], older["id"]]
    assert client.get("/history?offset=1&limit=1").json()[0]["id"] == older["id"]
    assert client.get("/history?limit=501").status_code == 422
    assert client.get("/activities?offset=69&limit=1").json()[0]["id"].endswith("70")


def test_history_validation(client):
    entry = history()
    assert client.put(f"/history/{uuid4()}", json=entry).status_code == 422
    entry = history(activityId=str(uuid4()))
    assert client.put(f"/history/{entry['id']}", json=entry).status_code == 404
    entry = history(createdAt="2026-10-12T12:00:00")
    assert client.put(f"/history/{entry['id']}", json=entry).status_code == 422
    assert client.patch(f"/history/{uuid4()}", json={"chosen": True}).status_code == 404


def test_another_client_and_server_restart_see_shared_data(client, database_url):
    entry = history()
    client.put("/preferences", json=PREFERENCES)
    client.put(f"/favorites/{ACTIVITY}")
    client.put(f"/history/{entry['id']}", json=entry)
    with TestClient(create_app(Settings(database_url=database_url))) as reopened:
        assert reopened.get("/preferences").json() == PREFERENCES
        assert reopened.get("/favorites").json() == [ACTIVITY]
        assert reopened.get("/history").json()[0]["id"] == entry["id"]
        assert reopened.patch(f"/history/{entry['id']}", json={"chosen": True}).status_code == 204
        assert client.get("/history").json()[0]["chosen"] is True


def test_clear_history_preserves_other_data(client):
    entry = history()
    client.put("/preferences", json=PREFERENCES)
    client.put(f"/favorites/{ACTIVITY}")
    client.put(f"/history/{entry['id']}", json=entry)
    assert client.delete("/history").status_code == 204
    assert client.get("/history").json() == []
    assert client.get("/favorites").json() == [ACTIVITY]
    assert client.get("/preferences").json() == PREFERENCES


def test_seed_and_migration_are_repeatable(client, database_url):
    client.put(f"/favorites/{ACTIVITY}")
    client.put("/preferences", json=PREFERENCES)
    migrate(database_url)
    assert seed_catalog(database_url) == 70
    assert len(client.get("/activities").json()) == 70
    assert client.get("/favorites").json() == [ACTIVITY]
    assert client.get("/preferences").json() == PREFERENCES


def test_database_constraints(database_url):
    engine = make_engine(database_url)
    try:
        with make_session_factory(engine)() as db:
            assert len(db.scalars(select(Activity)).all()) == 70
            with pytest.raises(IntegrityError):
                db.execute(
                    text("update activities set min_participants = 0 where id = :id"),
                    {"id": ACTIVITY},
                )
            db.rollback()
            with pytest.raises(IntegrityError):
                db.execute(
                    text("update activities set locations = '{}' where id = :id"), {"id": ACTIVITY}
                )
            db.rollback()
    finally:
        engine.dispose()


def test_unavailable_database_is_a_sanitized_503():
    settings = Settings(database_url="postgresql+psycopg://test:test@127.0.0.1:1/missing")
    with TestClient(create_app(settings), raise_server_exceptions=False) as api:
        response = api.get("/health")
        assert response.status_code == 503
        assert "postgresql" not in response.text
        assert "traceback" not in response.text.lower()


def test_cors(client):
    response = client.options(
        "/preferences",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"
