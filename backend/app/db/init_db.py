from sqlalchemy import text

from app.db.models import Base
from app.db.session import engine


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    # create_all only creates missing tables, not new columns on ones that already exist.
    # No Alembic in this project (hackathon scope), so patch the users table directly.
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_hash VARCHAR(64) UNIQUE"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_last4 VARCHAR(4)"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE"))


if __name__ == "__main__":
    init_db()
    print("Tables created.")
