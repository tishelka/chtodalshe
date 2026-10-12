from datetime import datetime, timezone
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from pydantic.alias_generators import to_camel


class Category(StrEnum):
    MOVIES = "movies"
    VIDEO_GAMES = "video_games"
    BOARD_GAMES = "board_games"
    WALKS = "walks"
    SPORT = "sport"
    CREATIVITY = "creativity"
    COOKING = "cooking"
    READING = "reading"
    CULTURE = "culture"
    SOCIAL = "social"


class Location(StrEnum):
    HOME = "home"
    OUTDOORS = "outdoors"
    VENUE = "venue"


class Mood(StrEnum):
    CALM = "calm"
    ACTIVE = "active"
    SOCIAL = "social"
    CREATIVE = "creative"


class ApiModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="forbid",
        allow_inf_nan=False,
    )


class Filters(ApiModel):
    participants: int | None = Field(ge=1, le=10)
    available_minutes: float | None = Field(gt=0)
    budget_per_person: float | None = Field(ge=0)
    location: Location | str
    mood: Mood | str

    @field_validator("location")
    @classmethod
    def valid_location(cls, value: str) -> str:
        if value != "any" and value not in Location:
            raise ValueError("Недопустимое место")
        return value

    @field_validator("mood")
    @classmethod
    def valid_mood(cls, value: str) -> str:
        if value != "any" and value not in Mood:
            raise ValueError("Недопустимое настроение")
        return value


class ActivityOut(ApiModel):
    id: UUID
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1)
    category: Category
    locations: list[Location] = Field(min_length=1)
    min_participants: int = Field(ge=1, le=10)
    max_participants: int = Field(ge=1, le=10)
    duration_minutes: int = Field(gt=0)
    estimated_cost_per_person: int = Field(ge=0)
    moods: list[Mood] = Field(min_length=1)
    tags: list[str]
    preparation: str | None = None
    is_active: bool

    @model_validator(mode="after")
    def valid_participants(self):
        if self.max_participants < self.min_participants:
            raise ValueError("Неверный диапазон участников")
        return self


class PreferencesIn(ApiModel):
    interests: list[Category]
    onboarding_completed: bool
    last_filters: Filters | None

    @field_validator("interests")
    @classmethod
    def unique_interests(cls, values: list[Category]):
        return list(dict.fromkeys(values))


class HistoryIn(ApiModel):
    id: UUID
    activity_id: UUID
    created_at: datetime
    filters: Filters
    chosen: bool = False

    @field_validator("created_at")
    @classmethod
    def utc_timestamp(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            raise ValueError("Дата должна содержать часовой пояс")
        return value.astimezone(timezone.utc)


class HistoryPatch(ApiModel):
    chosen: bool


class AnonymousSessionOut(ApiModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID
