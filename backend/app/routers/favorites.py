from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert

from ..auth import CurrentUser
from ..database import Db
from ..models import Activity, Favorite

router = APIRouter(prefix="/me/favorites", tags=["Избранное"])


@router.get("", response_model=list[UUID])
def list_favorites(
    user_id: CurrentUser,
    db: Db,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return db.scalars(
        select(Favorite.activity_id)
        .where(Favorite.user_id == user_id)
        .order_by(Favorite.created_at.desc(), Favorite.activity_id)
        .offset(offset)
        .limit(limit)
    ).all()


@router.put("/{activity_id}", status_code=204)
def save_favorite(activity_id: UUID, user_id: CurrentUser, db: Db):
    if db.get(Activity, activity_id) is None:
        raise HTTPException(404, "Занятие не найдено")
    db.execute(
        insert(Favorite)
        .values(user_id=user_id, activity_id=activity_id)
        .on_conflict_do_nothing(index_elements=["user_id", "activity_id"])
    )
    db.commit()


@router.delete("/{activity_id}", status_code=204)
def remove_favorite(activity_id: UUID, user_id: CurrentUser, db: Db):
    db.execute(
        delete(Favorite).where(Favorite.user_id == user_id, Favorite.activity_id == activity_id)
    )
    db.commit()
