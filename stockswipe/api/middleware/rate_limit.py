"""Redis-backed rate limiter: max 200 swipes/day per user."""
import os
from datetime import date

import redis.asyncio as aioredis
from fastapi import HTTPException, status

from api.config import settings

_redis = None


async def get_redis():
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def check_swipe_rate_limit(user_id: str) -> None:
    r = await get_redis()
    key = f"swipe_count:{user_id}:{date.today().isoformat()}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, 86400)  # expire at end of day (roughly)
    if count > settings.max_daily_swipes:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Daily swipe limit of {settings.max_daily_swipes} reached. Come back tomorrow!",
        )
