import json

from sqlalchemy.dialects.postgresql import insert

from .config import BACKEND_ROOT, Settings
from .database import make_engine, make_session_factory
from .models import Activity
from .schemas import ActivityOut


def seed_catalog(database_url: str) -> int:
    source = json.loads((BACKEND_ROOT / "data" / "activities.json").read_text(encoding="utf-8"))
    activities = [ActivityOut.model_validate(item) for item in source]
    engine = make_engine(database_url)
    try:
        with make_session_factory(engine)() as db:
            for activity in activities:
                values = activity.model_dump()
                statement = insert(Activity).values(**values)
                db.execute(
                    statement.on_conflict_do_update(
                        index_elements=["id"],
                        set_={key: value for key, value in values.items() if key != "id"},
                    )
                )
            db.commit()
    finally:
        engine.dispose()
    return len(activities)


if __name__ == "__main__":
    print(f"Каталог загружен: {seed_catalog(Settings().database_url)} занятий.")
