"""Persistent player account model."""
from datetime import datetime, timezone
from sqlalchemy import DateTime, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class UserAccount(Base):
    __tablename__ = "user_accounts"
    __table_args__ = (UniqueConstraint("email", name="uq_user_accounts_email"),)
    user_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(60), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(256), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
