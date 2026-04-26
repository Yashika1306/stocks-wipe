"""GET /leaderboard → opt-in weekly rankings by portfolio return."""
from typing import Annotated

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from api.config import settings
from api.database import get_db
from api.middleware.auth import get_current_user
from api.models.user import User
from api.services.paper_trade import compute_portfolio

router = APIRouter()

_redis = None


async def _get_redis():
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


class LeaderboardEntry(BaseModel):
    rank: int
    display_name: str
    total_return: float
    swipe_count: int


class LeaderboardResponse(BaseModel):
    entries: list[LeaderboardEntry]
    your_rank: int | None = None
    week_reset: str


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
):
    result = await db.execute(
        select(User).where(User.swipe_count > 0).order_by(User.swipe_count.desc()).limit(limit * 2)
    )
    users = result.scalars().all()

    scored = []
    for u in users:
        portfolio = await compute_portfolio(str(u.id), db)
        scored.append({
            "user_id": str(u.id),
            "display_name": u.display_name or "Anonymous",
            "total_return": portfolio["total_return"],
            "swipe_count": u.swipe_count or 0,
        })

    scored.sort(key=lambda x: x["total_return"], reverse=True)
    scored = scored[:limit]

    entries = [
        LeaderboardEntry(
            rank=i + 1,
            display_name=s["display_name"],
            total_return=s["total_return"],
            swipe_count=s["swipe_count"],
        )
        for i, s in enumerate(scored)
    ]

    your_rank = next(
        (i + 1 for i, s in enumerate(scored) if s["user_id"] == str(current_user.id)),
        None,
    )

    from datetime import date
    today = date.today()
    days_to_monday = (7 - today.weekday()) % 7 or 7
    from datetime import timedelta
    week_reset = (today + timedelta(days=days_to_monday)).isoformat()

    return LeaderboardResponse(entries=entries, your_rank=your_rank, week_reset=week_reset)
