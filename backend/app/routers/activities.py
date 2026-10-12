from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from ..database import Db
from ..models import Activity
from ..schemas import ActivityOut

router = APIRouter(prefix="/activities", tags=["Каталог"])


@router.get("", response_model=list[ActivityOut], response_model_exclude_none=True)
def list_activities(db: Db, offset: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=500)):
    # Архивные записи нужны для открытия старой истории; движок исключает их из подбора.
    return db.scalars(select(Activity).order_by(Activity.id).offset(offset).limit(limit)).all()


@router.get("/{activity_id}", response_model=ActivityOut, response_model_exclude_none=True)
def get_activity(activity_id: UUID, db: Db):
    activity = db.get(Activity, activity_id)
    if activity is None:
        raise HTTPException(404, "Занятие не найдено")
    return activity
