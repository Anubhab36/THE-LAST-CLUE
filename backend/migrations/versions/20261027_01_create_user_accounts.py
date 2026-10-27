"""Create player account table.

Revision ID: 20261027_01
Revises: 9ce6f8b0687b
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261027_01"
down_revision: Union[str, Sequence[str], None] = "9ce6f8b0687b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_accounts",
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("email", sa.String(length=254), nullable=False),
        sa.Column("display_name", sa.String(length=60), nullable=False),
        sa.Column("password_hash", sa.String(length=256), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("email", name="uq_user_accounts_email"),
    )
    op.create_index("ix_user_accounts_email", "user_accounts", ["email"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_user_accounts_email", table_name="user_accounts")
    op.drop_table("user_accounts")
