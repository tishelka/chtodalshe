from alembic import command
from alembic.config import Config

from .config import BACKEND_ROOT, Settings
from .seed import seed_catalog


def migrate(database_url: str):
    config = Config(str(BACKEND_ROOT / "alembic.ini"))
    config.attributes["database_url"] = database_url
    command.upgrade(config, "head")


if __name__ == "__main__":
    url = Settings().database_url
    migrate(url)
    print(f"Миграции применены, каталог загружен: {seed_catalog(url)} занятий.")
