from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserSession(Base):
    __tablename__ = "user_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Activity(Base):
    __tablename__ = "activities"
    id: Mapped[UUID] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(Text)
    locations: Mapped[list[str]] = mapped_column(ARRAY(Text))
    min_participants: Mapped[int] = mapped_column(Integer)
    max_participants: Mapped[int] = mapped_column(Integer)
    duration_minutes: Mapped[int] = mapped_column(Integer)
    estimated_cost_per_person: Mapped[int] = mapped_column(Integer)
    moods: Mapped[list[str]] = mapped_column(ARRAY(Text))
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text))
    preparation: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class UserPreferences(Base):
    __tablename__ = "user_preferences"
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    interests: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    last_filters: Mapped[dict | None] = mapped_column(JSONB(none_as_null=True))


class Favorite(Base):
    __tablename__ = "favorites"
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    activity_id: Mapped[UUID] = mapped_column(
        ForeignKey("activities.id", ondelete="RESTRICT"), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class RecommendationHistory(Base):
    __tablename__ = "recommendation_history"
    # ID уникален внутри пользователя: чужой UUID нельзя использовать для перезаписи.
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    id: Mapped[UUID] = mapped_column(primary_key=True)
    activity_id: Mapped[UUID] = mapped_column(ForeignKey("activities.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    filters: Mapped[dict] = mapped_column(JSONB)
    chosen: Mapped[bool] = mapped_column(Boolean, default=False)


Index("user_sessions_user_idx", UserSession.user_id)
Index("activities_active_category_idx", Activity.category, postgresql_where=text("is_active"))
Index("favorites_activity_idx", Favorite.activity_id)
Index(
    "history_user_created_idx",
    RecommendationHistory.user_id,
    RecommendationHistory.created_at.desc(),
    RecommendationHistory.id,
)
Index("history_activity_idx", RecommendationHistory.activity_id)
