"""User sector/factor preference model derived from swipe history."""
from __future__ import annotations

import json
from collections import defaultdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from api.models.user import SwipeEvent
from api.models.stock import StockMetadata


async def compute_sector_weights(user_id: str, db: AsyncSession) -> dict:
    swipes = await db.execute(
        select(SwipeEvent).where(
            SwipeEvent.user_id == user_id,
            SwipeEvent.direction == "right",
        )
    )
    right_swipes = swipes.scalars().all()

    tickers = list({s.ticker for s in right_swipes})
    if not tickers:
        return {}

    meta_result = await db.execute(
        select(StockMetadata).where(StockMetadata.ticker.in_(tickers))
    )
    meta = {m.ticker: m.sector for m in meta_result.scalars()}

    sector_counts: dict[str, int] = defaultdict(int)
    for s in right_swipes:
        sector = meta.get(s.ticker, "Unknown")
        if sector:
            sector_counts[sector] += 1

    total = sum(sector_counts.values())
    if total == 0:
        return {}

    return {sector: count / total for sector, count in sector_counts.items()}
