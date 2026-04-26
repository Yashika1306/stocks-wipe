"""ML score + collaborative filter blend for feed ranking."""
from __future__ import annotations

import json
import os
import random

import redis.asyncio as aioredis

from api.config import settings
from ml.scoring.weights import DEFAULT_WEIGHTS

_redis = None


async def _get_redis():
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def get_candidate_tickers(exclude: set[str]) -> list[str]:
    r = await _get_redis()
    raw = await r.get("universe:top200")
    if not raw:
        return []
    top200 = json.loads(raw)
    return [t for t in top200 if t not in exclude]


async def get_card_data(ticker: str) -> dict | None:
    r = await _get_redis()
    raw = await r.get(f"card:{ticker}")
    return json.loads(raw) if raw else None


async def build_feed(
    user_id: str,
    recent_swipes: set[str],
    user_weights: dict,
    stock_metadata: dict,
    feed_size: int = 20,
) -> list[dict]:
    candidates = await get_candidate_tickers(exclude=recent_swipes)

    cards = []
    for ticker in candidates:
        card = await get_card_data(ticker)
        if card is None:
            continue
        meta = stock_metadata.get(ticker, {})
        # Re-score with user-specific weights if they differ from default
        if user_weights != DEFAULT_WEIGHTS:
            m_z = card.get("momentum_z", 0)
            v_z = card.get("value_z", 0)
            s_z = card.get("sentiment_z", 0)
            raw = (
                user_weights["momentum"] * m_z
                + user_weights["value"] * v_z
                + user_weights["sentiment"] * s_z
            )
            import numpy as np
            card["composite_score"] = round(float(50 + 25 * np.tanh(raw)), 1)

        cards.append({
            "ticker": ticker,
            "name": meta.get("name", ticker),
            "sector": meta.get("sector", "Unknown"),
            "composite_score": card["composite_score"],
            "factor_tags": card.get("factor_tags", []),
            "sparkline": card.get("sparkline", []),
            "price": meta.get("price"),
            "change_pct": meta.get("change_pct"),
        })

    cards.sort(key=lambda c: c["composite_score"], reverse=True)
    return cards[:feed_size]
