from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.auth import token_digest
from app.bootstrap import migrate
from app.config import Settings
from app.database import make_engine, make_session_factory
from app.main import create_app
from app.models import Activity, UserSession
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


def history(entry_id=None, **overrides):
    return {
        "id": entry_id or str(uuid4()),
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


def test_session_is_persistent_and_token_is_hashed(client, database_url):
    result = client.post("/sessions/anonymous")
    session = result.json()
    assert result.headers["cache-control"] == "no-store"
    assert len(session["accessToken"]) >= 40
    with make_session_factory(make_engine(database_url))() as db:
        row = db.get(UserSession, token_digest(session["accessToken"]))
        assert str(row.user_id) == session["userId"]
        assert row.token_hash != session["accessToken"]
    headers = {"Authorization": f"Bearer {session['accessToken']}"}
    with TestClient(create_app(Settings(database_url=database_url))) as reopened:
        assert reopened.get("/me/preferences", headers=headers).status_code == 200


@pytest.mark.parametrize("path", ["/me/preferences", "/me/favorites", "/me/history"])
def test_private_reads_require_session(client, path):
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"Authorization": "Bearer invalid"}).status_code == 401


def test_preferences_round_trip(client, auth):
    assert client.get("/me/preferences", headers=auth).json() == {
        "interests": [],
        "onboardingCompleted": False,
        "lastFilters": None,
    }
    body = {**PREFERENCES, "interests": ["walks", "walks", "reading"]}
    assert client.put("/me/preferences", headers=auth, json=body).status_code == 204
    assert client.get("/me/preferences", headers=auth).json() == PREFERENCES
    assert (
        client.put(
            "/me/preferences",
            headers=auth,
            json={**PREFERENCES, "interests": [], "lastFilters": None},
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
def test_invalid_filters(client, auth, override):
    response = client.put(
        "/me/preferences",
        headers=auth,
        json={**PREFERENCES, "lastFilters": {**FILTERS, **override}},
    )
    assert response.status_code == 422
    assert set(response.json()) == {"detail"}


def test_unknown_categories_and_extra_identity_rejected(client, auth):
    assert (
        client.put(
            "/me/preferences", headers=auth, json={**PREFERENCES, "interests": ["unknown"]}
        ).status_code
        == 422
    )
    assert (
        client.put(
            "/me/preferences", headers=auth, json={**PREFERENCES, "userId": str(uuid4())}
        ).status_code
        == 422
    )


def test_favorites_idempotency_and_delete(client, auth):
    path = f"/me/favorites/{ACTIVITY}"
    assert client.put(path, headers=auth).status_code == 204
    assert client.put(path, headers=auth).status_code == 204
    assert client.get("/me/favorites", headers=auth).json() == [ACTIVITY]
    assert client.delete(path, headers=auth).status_code == 204
    assert client.delete(path, headers=auth).status_code == 204
    assert client.get("/me/favorites", headers=auth).json() == []
    assert client.put(f"/me/favorites/{uuid4()}", headers=auth).status_code == 404


def test_history_retries_do_not_duplicate_or_reset_chosen(client, auth):
    entry = history()
    path = f"/me/history/{entry['id']}"
    assert client.put(path, headers=auth, json=entry).status_code == 204
    assert client.patch(path, headers=auth, json={"chosen": True}).status_code == 204
    assert client.put(path, headers=auth, json=entry).status_code == 204
    records = client.get("/me/history", headers=auth).json()
    assert len(records) == 1
    assert records[0]["chosen"] is True
    assert records[0]["filters"] == FILTERS
    assert records[0]["id"] == entry["id"]


def test_history_order_pagination_and_repeated_activity(client, auth):
    newer = history()
    older = history(createdAt=(datetime.now(timezone.utc) - timedelta(days=1)).isoformat())
    for entry in (newer, older):
        assert client.put(f"/me/history/{entry['id']}", headers=auth, json=entry).status_code == 204
    assert [item["id"] for item in client.get("/me/history", headers=auth).json()] == [
        newer["id"],
        older["id"],
    ]
    assert client.get("/me/history?offset=1&limit=1", headers=auth).json()[0]["id"] == older["id"]
    assert client.get("/me/history?limit=501", headers=auth).status_code == 422
    assert client.get("/activities?offset=69&limit=1").json()[0]["id"].endswith("70")


def test_history_validation(client, auth):
    entry = history()
    assert client.put(f"/me/history/{uuid4()}", headers=auth, json=entry).status_code == 422
    entry = history(activityId=str(uuid4()))
    assert client.put(f"/me/history/{entry['id']}", headers=auth, json=entry).status_code == 404
    entry = history(createdAt="2026-10-12T12:00:00")
    assert client.put(f"/me/history/{entry['id']}", headers=auth, json=entry).status_code == 422
    assert (
        client.patch(f"/me/history/{uuid4()}", headers=auth, json={"chosen": True}).status_code
        == 404
    )


def test_two_users_cannot_read_update_or_clear_each_others_data(client, auth):
    other = {"Authorization": f"Bearer {client.post('/sessions/anonymous').json()['accessToken']}"}
    entry = history()
    client.put("/me/preferences", headers=auth, json=PREFERENCES)
    client.put(f"/me/favorites/{ACTIVITY}", headers=auth)
    client.put(f"/me/history/{entry['id']}", headers=auth, json=entry)
    assert client.get("/me/preferences", headers=other).json()["interests"] == []
    assert client.get("/me/favorites", headers=other).json() == []
    assert client.get("/me/history", headers=other).json() == []
    assert (
        client.patch(f"/me/history/{entry['id']}", headers=other, json={"chosen": True}).status_code
        == 404
    )
    client.delete(f"/me/favorites/{ACTIVITY}", headers=other)
    client.delete("/me/history", headers=other)
    assert client.get("/me/favorites", headers=auth).json() == [ACTIVITY]
    assert len(client.get("/me/history", headers=auth).json()) == 1
    # Даже одинаковые клиентские UUID относятся к разным пользователям.
    assert client.put(f"/me/history/{entry['id']}", headers=other, json=entry).status_code == 204
    assert len(client.get("/me/history", headers=other).json()) == 1
    assert client.get("/me/history", headers=auth).json()[0]["chosen"] is False


def test_clear_history_preserves_other_data(client, auth):
    entry = history()
    client.put("/me/preferences", headers=auth, json=PREFERENCES)
    client.put(f"/me/favorites/{ACTIVITY}", headers=auth)
    client.put(f"/me/history/{entry['id']}", headers=auth, json=entry)
    assert client.delete("/me/history", headers=auth).status_code == 204
    assert client.get("/me/history", headers=auth).json() == []
    assert client.get("/me/favorites", headers=auth).json() == [ACTIVITY]
    assert client.get("/me/preferences", headers=auth).json() == PREFERENCES


def test_seed_and_migration_are_repeatable(client, auth, database_url):
    client.put(f"/me/favorites/{ACTIVITY}", headers=auth)
    migrate(database_url)
    assert seed_catalog(database_url) == 70
    assert len(client.get("/activities").json()) == 70
    assert client.get("/me/favorites", headers=auth).json() == [ACTIVITY]


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
        "/me/preferences",
        headers={
            "Origin": "http://localhost:8081",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:8081"
