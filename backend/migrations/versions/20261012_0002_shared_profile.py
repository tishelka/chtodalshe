"""Один общий профиль для учебного приложения, без авторизации."""

from alembic import op

revision = "20261012_0002"
down_revision = "20261012_0001"
branch_labels = None
depends_on = None


def upgrade():
    # Старые профили и их данные сохраняются. Новый API обращается к общему профилю.
    op.execute("""
        INSERT INTO users (id) VALUES ('00000000-0000-4000-8000-000000000001')
        ON CONFLICT (id) DO NOTHING;
        INSERT INTO user_preferences (user_id)
        VALUES ('00000000-0000-4000-8000-000000000001')
        ON CONFLICT (user_id) DO NOTHING;
    """)
    op.drop_table("user_sessions")


def downgrade():
    # Токены из старой версии восстановить невозможно; профили и данные остаются.
    op.execute("""
        CREATE TABLE user_sessions (
            token_hash varchar(64) PRIMARY KEY CHECK (token_hash ~ '^[a-f0-9]{64}$'),
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX user_sessions_user_idx ON user_sessions(user_id);
    """)
