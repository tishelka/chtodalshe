from secrets import token_urlsafe
from uuid import uuid4

from fastapi import APIRouter, Response

from ..auth import token_digest
from ..database import Db
from ..models import User, UserPreferences, UserSession
from ..schemas import AnonymousSessionOut

router = APIRouter(prefix="/sessions", tags=["Сессии"])


@router.post("/anonymous", response_model=AnonymousSessionOut, status_code=201)
def create_anonymous_session(db: Db, response: Response):
    user_id = uuid4()
    token = token_urlsafe(32)
    db.add(User(id=user_id))
    db.flush()
    db.add(
        UserPreferences(
            user_id=user_id, interests=[], onboarding_completed=False, last_filters=None
        )
    )
    db.add(UserSession(user_id=user_id, token_hash=token_digest(token)))
    db.commit()
    response.headers["Cache-Control"] = "no-store"
    return AnonymousSessionOut(access_token=token, user_id=user_id)
