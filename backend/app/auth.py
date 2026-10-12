from hashlib import sha256
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select

from .database import Db
from .models import UserSession

bearer = HTTPBearer(auto_error=False)


def token_digest(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def current_user_id(
    db: Db, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> UUID:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(401, "Нужен токен доступа", headers={"WWW-Authenticate": "Bearer"})
    user_id = db.scalar(
        select(UserSession.user_id).where(
            UserSession.token_hash == token_digest(credentials.credentials)
        )
    )
    if user_id is None:
        raise HTTPException(401, "Сессия недействительна", headers={"WWW-Authenticate": "Bearer"})
    return user_id


CurrentUser = Annotated[UUID, Depends(current_user_id)]
