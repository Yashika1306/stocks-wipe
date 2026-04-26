"""GET /feed/{user_id} → ranked card queue."""
from typing import Annotated
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from api.database import get_db
from api.middleware.auth import get_current_user
from api.models.user import User, SwipeEvent
from api.models.stock import StockMetadata
from api.services.recommendation import build_feed
from ml.scoring.weights import get_user_weights

router = APIRouter()


class StockCard(BaseModel):
    ticker: str
    name: str
    sector: str
    composite_score: float
    factor_tags: list[str]
    sparkline: list[float]
    price: float | None
    change_pct: float | None


class FeedResponse(BaseModel):
    cards: list[StockCard]
    disclaimer: str = "This is not investment advice. All portfolios are simulated. Past performance does not guarantee future results."


@router.get("/{user_id}", response_model=FeedResponse)
async def get_feed(
    user_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=30)
    recent_result = await db.execute(
        select(SwipeEvent.ticker)
        .where(SwipeEvent.user_id == current_user.id, SwipeEvent.swiped_at >= cutoff)
    )
    recent_swipes = {row[0] for row in recent_result.fetchall()}

    meta_result = await db.execute(select(StockMetadata))
    stock_meta = {m.ticker: {"name": m.name, "sector": m.sector or "Unknown"} for m in meta_result.scalars()}

    user_weights = get_user_weights(
        user_id=user_id,
        swipe_count=current_user.swipe_count or 0,
        db_weights=current_user.factor_weights,
    )

    cards = await build_feed(
        user_id=user_id,
        recent_swipes=recent_swipes,
        user_weights=user_weights,
        stock_metadata=stock_meta,
        feed_size=20,
    )

    return FeedResponse(cards=cards)
