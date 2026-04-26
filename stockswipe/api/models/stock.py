from sqlalchemy import Column, Text, Float, Integer, Boolean
from sqlalchemy.dialects.postgresql import TIMESTAMPTZ, JSONB
from sqlalchemy.sql import func

from api.models.base import Base


class StockMetadata(Base):
    __tablename__ = "stock_metadata"

    ticker = Column(Text, primary_key=True)
    name = Column(Text, nullable=False)
    sector = Column(Text)
    industry = Column(Text)
    market_cap = Column(Float)
    is_active = Column(Boolean, default=True)
    updated_at = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now())


class DailyScore(Base):
    __tablename__ = "daily_scores"

    ticker = Column(Text, primary_key=True)
    score_date = Column(Text, primary_key=True)
    momentum_z = Column(Float)
    value_z = Column(Float)
    sentiment_z = Column(Float)
    composite = Column(Float)
    factor_weights = Column(JSONB)
    price = Column(Float)
    change_pct = Column(Float)
    sparkline = Column(JSONB)
    factor_tags = Column(JSONB)
    computed_at = Column(TIMESTAMPTZ, server_default=func.now())
