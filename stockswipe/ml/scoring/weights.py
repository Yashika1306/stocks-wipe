"""Per-user factor weight management."""
from __future__ import annotations

import json
import os

import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
DEFAULT_WEIGHTS = {"momentum": 0.40, "value": 0.30, "sentiment": 0.30}
PERSONALIZATION_THRESHOLD = 50  # swipes needed before personalization activates

_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    return _redis_client


def get_user_weights(user_id: str, swipe_count: int, db_weights: dict | None = None) -> dict:
    if swipe_count < PERSONALIZATION_THRESHOLD:
        return DEFAULT_WEIGHTS.copy()

    r = _get_redis()
    cached = r.get(f"weights:{user_id}")
    if cached:
        return json.loads(cached)

    if db_weights:
        return db_weights

    return DEFAULT_WEIGHTS.copy()


def cache_user_weights(user_id: str, weights: dict, ttl_seconds: int = 86400) -> None:
    r = _get_redis()
    r.setex(f"weights:{user_id}", ttl_seconds, json.dumps(weights))


def normalize_weights(weights: dict) -> dict:
    total = sum(weights.values())
    if total == 0:
        return DEFAULT_WEIGHTS.copy()
    return {k: v / total for k, v in weights.items()}
