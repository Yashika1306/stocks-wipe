"""Paper trading: open positions, compute returns vs SPY."""
from __future__ import annotations

import json
from datetime import date

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from api.config import settings
from api.models.user import PaperPosition

_redis = None


async def _get_redis():
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def _get_current_price(ticker: str) -> float | None:
    r = await _get_redis()
    raw = await r.get(f"card:{ticker}")
    if not raw:
        return None
    card = json.loads(raw)
    return card.get("price")


async def open_paper_position(db: AsyncSession, user_id: str, ticker: str) -> None:
    price = await _get_current_price(ticker)
    if price is None:
        return

    existing = await db.execute(
        select(PaperPosition).where(
            PaperPosition.user_id == user_id,
            PaperPosition.ticker == ticker,
        )
    )
    if existing.scalar_one_or_none():
        return  # already in portfolio

    position = PaperPosition(
        user_id=user_id,
        ticker=ticker,
        entry_price=str(price),
        entry_date=date.today().isoformat(),
        shares="1.0",
    )
    db.add(position)


async def compute_portfolio(user_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        select(PaperPosition).where(PaperPosition.user_id == user_id)
    )
    positions = result.scalars().all()

    if not positions:
        return {"positions": [], "total_return": 0.0, "hit_rate": 0.0}

    rows = []
    winners = 0
    for pos in positions:
        current_price = await _get_current_price(pos.ticker)
        entry_price = float(pos.entry_price)
        if current_price and entry_price > 0:
            ret = (current_price - entry_price) / entry_price
            rows.append({
                "ticker": pos.ticker,
                "entry_price": entry_price,
                "current_price": current_price,
                "return_pct": round(ret * 100, 2),
                "entry_date": pos.entry_date,
            })
            if ret > 0:
                winners += 1

    total_return = sum(r["return_pct"] for r in rows) / len(rows) if rows else 0.0
    hit_rate = winners / len(rows) if rows else 0.0

    best = max(rows, key=lambda r: r["return_pct"]) if rows else None
    worst = min(rows, key=lambda r: r["return_pct"]) if rows else None

    return {
        "positions": rows,
        "total_return": round(total_return, 2),
        "hit_rate": round(hit_rate, 3),
        "best_call": best,
        "worst_call": worst,
    }
