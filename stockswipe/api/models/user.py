from sqlalchemy import Column, String, Integer, Text, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB, TIMESTAMPTZ
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from api.models.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(Text, unique=True, nullable=False)
    hashed_password = Column(Text, nullable=False)
    display_name = Column(Text)
    created_at = Column(TIMESTAMPTZ, server_default=func.now())
    sector_weights = Column(JSONB, default=dict)
    factor_weights = Column(JSONB, default=lambda: {"momentum": 0.40, "value": 0.30, "sentiment": 0.30})
    swipe_count = Column(Integer, default=0)
    streak_days = Column(Integer, default=0)
    last_active_date = Column(TIMESTAMPTZ)

    swipes = relationship("SwipeEvent", back_populates="user", lazy="dynamic")
    positions = relationship("PaperPosition", back_populates="user", lazy="dynamic")


class SwipeEvent(Base):
    __tablename__ = "swipe_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    ticker = Column(Text, nullable=False)
    direction = Column(Text, nullable=False)
    hesitation_ms = Column(Integer)
    card_score = Column(Text)
    swiped_at = Column(TIMESTAMPTZ, server_default=func.now())

    __table_args__ = (
        CheckConstraint("direction IN ('right','left','up')", name="chk_direction"),
    )

    user = relationship("User", back_populates="swipes")


class PaperPosition(Base):
    __tablename__ = "paper_positions"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), primary_key=True)
    ticker = Column(Text, primary_key=True)
    entry_date = Column(Text, primary_key=True)
    entry_price = Column(Text, nullable=False)
    shares = Column(Text, default="1.0")

    user = relationship("User", back_populates="positions")
