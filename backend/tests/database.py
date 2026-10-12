"""Отдельная PostgreSQL-база для проверок; рабочую базу тесты не меняют."""

import os
from contextlib import contextmanager
from uuid import uuid4

import psycopg
from psycopg import sql
from sqlalchemy.engine import make_url

from app.bootstrap import migrate
from app.config import Settings
from app.seed import seed_catalog


@contextmanager
def temporary_database():
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
        # Имя создано здесь, а не получено из пользовательского DATABASE_URL.
        assert database_name.startswith("whatnext_test_")
        with psycopg.connect(admin_url, autocommit=True) as connection:
            connection.execute(
                sql.SQL("drop database {} with (force)").format(sql.Identifier(database_name))
            )
