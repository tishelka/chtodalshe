import os
from uuid import uuid4

import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql
from sqlalchemy.engine import make_url

from app.bootstrap import migrate
from app.config import Settings
from app.main import create_app
from app.seed import seed_catalog


@pytest.fixture(scope="session")
def database_url():
    source = make_url(os.environ.get("TEST_DATABASE_URL", Settings().database_url))
    database_name = f"whatnext_test_{uuid4().hex}"
    admin_url = source.set(drivername="postgresql", database="postgres").render_as_string(
        hide_password=False
    )
    with psycopg.connect(admin_url, autocommit=True) as connection:
        connection.execute(sql.SQL("create database {}").format(sql.Identifier(database_name)))
    url = source.set(database=database_name).render_as_string(hide_password=False)
    try:
        migrate(url)
        seed_catalog(url)
        yield url
    finally:
        # Удаляется только созданная самим тестовым запуском отдельная база.
        assert database_name.startswith("whatnext_test_")
        with psycopg.connect(admin_url, autocommit=True) as connection:
            connection.execute(
                sql.SQL("drop database {} with (force)").format(sql.Identifier(database_name))
            )


@pytest.fixture
def client(database_url):
    with TestClient(
        create_app(Settings(database_url=database_url)), raise_server_exceptions=False
    ) as api:
        yield api


@pytest.fixture
def auth(client):
    response = client.post("/sessions/anonymous")
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['accessToken']}"}
