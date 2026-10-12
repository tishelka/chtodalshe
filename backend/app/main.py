import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from .config import Settings
from .database import Db, make_engine, make_session_factory
from .routers import activities, favorites, history, preferences, sessions

logger = logging.getLogger(__name__)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings()
    engine = make_engine(settings.database_url)

    @asynccontextmanager
    async def lifespan(application: FastAPI):
        yield
        engine.dispose()

    application = FastAPI(title="ЧтоДальше API", version="1.0.0", lifespan=lifespan)
    application.state.session_factory = make_session_factory(engine)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @application.exception_handler(RequestValidationError)
    async def validation_error(request: Request, error: RequestValidationError):
        return JSONResponse(
            status_code=422, content={"detail": "Проверь формат и значения переданных данных."}
        )

    @application.exception_handler(IntegrityError)
    async def integrity_error(request: Request, error: IntegrityError):
        return JSONResponse(
            status_code=409, content={"detail": "Данные противоречат ограничениям базы."}
        )

    @application.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, error: SQLAlchemyError):
        # В клиентский ответ не попадают SQL, параметры запросов и DSN.
        logger.error("Ошибка базы данных (%s)", type(error).__name__)
        return JSONResponse(
            status_code=503, content={"detail": "База данных временно недоступна. Повтори попытку."}
        )

    @application.get("/health", tags=["Состояние"])
    def health(db: Db):
        db.execute(text("select 1"))
        return {"status": "ok"}

    for router in (
        sessions.router,
        activities.router,
        preferences.router,
        favorites.router,
        history.router,
    ):
        application.include_router(router)
    return application


app = create_app()
