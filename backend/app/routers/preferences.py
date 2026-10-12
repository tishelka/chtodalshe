from fastapi import APIRouter
from sqlalchemy.dialects.postgresql import insert

from ..auth import CurrentUser
from ..database import Db
from ..models import UserPreferences
from ..schemas import PreferencesIn

router = APIRouter(prefix="/me/preferences", tags=["Настройки"])


@router.get("", response_model=PreferencesIn)
def get_preferences(user_id: CurrentUser, db: Db):
    preferences = db.get(UserPreferences, user_id)
    if preferences is None:
        return PreferencesIn(interests=[], onboarding_completed=False, last_filters=None)
    return preferences


@router.put("", status_code=204)
def save_preferences(body: PreferencesIn, user_id: CurrentUser, db: Db):
    values = body.model_dump(mode="json")
    values["last_filters"] = (
        body.last_filters.model_dump(mode="json", by_alias=True) if body.last_filters else None
    )
    statement = insert(UserPreferences).values(user_id=user_id, **values)
    db.execute(statement.on_conflict_do_update(index_elements=["user_id"], set_=values))
    db.commit()
