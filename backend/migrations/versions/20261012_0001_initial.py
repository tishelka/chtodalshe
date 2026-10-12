"""Каталог, анонимные сессии и личные данные."""

from alembic import op

revision = "20261012_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""
    create function public.valid_recommendation_filters(value jsonb)
    returns boolean language plpgsql immutable set search_path = '' as $$
    begin
      if jsonb_typeof(value) is distinct from 'object'
        or not (value ?& array['participants', 'availableMinutes', 'budgetPerPerson', 'location', 'mood']) then return false; end if;
      if value -> 'participants' <> 'null'::jsonb then
        if jsonb_typeof(value -> 'participants') <> 'number' then return false; end if;
        if (value ->> 'participants')::numeric not between 1 and 10
          or trunc((value ->> 'participants')::numeric) <> (value ->> 'participants')::numeric then return false; end if;
      end if;
      if value -> 'availableMinutes' <> 'null'::jsonb then
        if jsonb_typeof(value -> 'availableMinutes') <> 'number' then return false; end if;
        if (value ->> 'availableMinutes')::numeric <= 0 then return false; end if;
      end if;
      if value -> 'budgetPerPerson' <> 'null'::jsonb then
        if jsonb_typeof(value -> 'budgetPerPerson') <> 'number' then return false; end if;
        if (value ->> 'budgetPerPerson')::numeric < 0 then return false; end if;
      end if;
      return coalesce((value ->> 'location') in ('home', 'outdoors', 'venue', 'any')
        and (value ->> 'mood') in ('calm', 'active', 'social', 'creative', 'any'), false);
    end;
    $$;

    create table users (
      id uuid primary key,
      created_at timestamptz not null default now()
    );
    create table user_sessions (
      token_hash varchar(64) primary key check (token_hash ~ '^[a-f0-9]{64}$'),
      user_id uuid not null references users(id) on delete cascade,
      created_at timestamptz not null default now()
    );
    create index user_sessions_user_idx on user_sessions(user_id);
    create table activities (
      id uuid primary key,
      title text not null check (length(trim(title)) between 1 and 200),
      description text not null check (length(trim(description)) > 0),
      category text not null check (category in ('movies', 'video_games', 'board_games', 'walks', 'sport', 'creativity', 'cooking', 'reading', 'culture', 'social')),
      locations text[] not null check (cardinality(locations) > 0 and locations <@ array['home', 'outdoors', 'venue']::text[] and array_position(locations, null) is null),
      min_participants integer not null check (min_participants between 1 and 10),
      max_participants integer not null check (max_participants between min_participants and 10),
      duration_minutes integer not null check (duration_minutes > 0),
      estimated_cost_per_person integer not null check (estimated_cost_per_person >= 0),
      moods text[] not null check (cardinality(moods) > 0 and moods <@ array['calm', 'active', 'social', 'creative']::text[] and array_position(moods, null) is null),
      tags text[] not null default '{}' check (array_position(tags, null) is null),
      preparation text,
      is_active boolean not null default true
    );
    create index activities_active_category_idx on activities(category) where is_active;
    create table user_preferences (
      user_id uuid primary key references users(id) on delete cascade,
      interests text[] not null default '{}' check (interests <@ array['movies', 'video_games', 'board_games', 'walks', 'sport', 'creativity', 'cooking', 'reading', 'culture', 'social']::text[] and array_position(interests, null) is null),
      onboarding_completed boolean not null default false,
      last_filters jsonb check (last_filters is null or public.valid_recommendation_filters(last_filters))
    );
    create table favorites (
      user_id uuid not null references users(id) on delete cascade,
      activity_id uuid not null references activities(id) on delete restrict,
      created_at timestamptz not null default now(),
      primary key (user_id, activity_id)
    );
    create index favorites_activity_idx on favorites(activity_id);
    create table recommendation_history (
      user_id uuid not null references users(id) on delete cascade,
      id uuid not null,
      activity_id uuid not null references activities(id) on delete restrict,
      created_at timestamptz not null default now(),
      filters jsonb not null check (public.valid_recommendation_filters(filters)),
      chosen boolean not null default false,
      primary key (user_id, id)
    );
    create index history_user_created_idx on recommendation_history(user_id, created_at desc, id);
    create index history_activity_idx on recommendation_history(activity_id);
    """)


def downgrade():
    for table in (
        "recommendation_history",
        "favorites",
        "user_preferences",
        "activities",
        "user_sessions",
        "users",
    ):
        op.drop_table(table)
    op.execute("drop function public.valid_recommendation_filters(jsonb)")
