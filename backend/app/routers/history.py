from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert

from ..database import Db
from ..models import Activity, RecommendationHistory
from ..profile import SHARED_USER_ID
from ..schemas import HistoryIn, HistoryPatch

router = APIRouter(prefix="/history", tags=["История"])


@router.get("", response_model=list[HistoryIn])
def list_history(
    db: Db,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return db.scalars(
        select(RecommendationHistory)
        .where(RecommendationHistory.user_id == SHARED_USER_ID)
        .order_by(RecommendationHistory.created_at.desc(), RecommendationHistory.id)
        .offset(offset)
        .limit(limit)
    ).all()


@router.put("/{entry_id}", status_code=204)
def save_history(entry_id: UUID, body: HistoryIn, db: Db):
    if entry_id != body.id:
        raise HTTPException(422, "ID в адресе и в записи должны совпадать")
    if db.get(Activity, body.activity_id) is None:
        raise HTTPException(404, "Занятие не найдено")
    values = body.model_dump(exclude={"filters"})
    values["filters"] = body.filters.model_dump(mode="json", by_alias=True)
    # Повторная доставка записи не снимает уже установленную отметку chosen.
    db.execute(
        insert(RecommendationHistory)
        .values(user_id=SHARED_USER_ID, **values)
        .on_conflict_do_nothing(index_elements=["user_id", "id"])
    )
    db.commit()


@router.patch("/{entry_id}", status_code=204)
def choose_history(entry_id: UUID, body: HistoryPatch, db: Db):
    statement = (
        update(RecommendationHistory)
        .where(
            RecommendationHistory.user_id == SHARED_USER_ID,
            RecommendationHistory.id == entry_id,
        )
        .values(chosen=body.chosen)
        .returning(RecommendationHistory.id)
    )
    if db.scalar(statement) is None:
        raise HTTPException(404, "Запись истории не найдена")
    db.commit()


@router.delete("", status_code=204)
def clear_history(db: Db):
    db.execute(delete(RecommendationHistory).where(RecommendationHistory.user_id == SHARED_USER_ID))
    db.commit()
