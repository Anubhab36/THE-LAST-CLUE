"""Create player account table."""
from alembic import op
import sqlalchemy as sa
revision = "20261027_01"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table("user_accounts", sa.Column("user_id", sa.String(36), primary_key=True), sa.Column("email", sa.String(254), nullable=False), sa.Column("display_name", sa.String(60), nullable=False), sa.Column("password_hash", sa.String(256), nullable=False), sa.Column("created_at", sa.DateTime(timezone=True), nullable=False), sa.UniqueConstraint("email", name="uq_user_accounts_email"))
    op.create_index("ix_user_accounts_email", "user_accounts", ["email"], unique=False)

def downgrade() -> None:
    op.drop_index("ix_user_accounts_email", table_name="user_accounts")
    op.drop_table("user_accounts")
