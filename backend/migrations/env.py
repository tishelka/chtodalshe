from logging.config import fileConfig

from alembic import context

from app import models  # noqa: F401
from app.config import Settings
from app.database import Base, make_engine

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# config.attributes позволяет тестам использовать отдельную созданную ими базу.
database_url = config.attributes.get("database_url") or Settings().database_url
target_metadata = Base.metadata

if context.is_offline_mode():
    context.configure(url=database_url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = make_engine(database_url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()
