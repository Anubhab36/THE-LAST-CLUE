from logging.config import fileConfig
import os
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from sqlalchemy.engine import make_url

from app.db import Base
from app.models.game import GeneratedCase, GameSession

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError("DATABASE_URL is missing from backend/.env")

# Validate the target before Alembic can make schema changes.
url = make_url(database_url)

if url.drivername != "postgresql+psycopg":
    raise RuntimeError(
        "Alembic requires the postgresql+psycopg driver."
    )

if not (
    url.host
    and url.host.endswith(".neon.tech")
    and url.database == "neondb"
):
    raise RuntimeError(
        "Alembic is restricted to the configured Neon neondb database."
    )

config.set_main_option(
    "sqlalchemy.url",
    database_url.replace("%", "%%"),
)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
