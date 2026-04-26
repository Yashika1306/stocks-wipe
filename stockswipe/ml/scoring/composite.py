"""Composite score: z-score blend → [0, 100] via tanh rescaling."""
from __future__ import annotations

import numpy as np
import pandas as pd

DEFAULT_WEIGHTS = {"momentum": 0.40, "value": 0.30, "sentiment": 0.30}


def composite_score(
    momentum_z: float,
    value_z: float,
    sentiment_z: float,
    weights: dict | None = None,
) -> float:
    w = weights or DEFAULT_WEIGHTS
    raw = (
        w["momentum"] * momentum_z
        + w["value"] * value_z
        + w["sentiment"] * sentiment_z
    )
    return float(50 + 25 * np.tanh(raw))


def compute_batch_scores(
    momentum_z: pd.Series,
    value_z: pd.Series,
    sentiment_z: pd.Series,
    weights: dict | None = None,
) -> pd.Series:
    """Vectorized composite score for a universe of tickers."""
    w = weights or DEFAULT_WEIGHTS
    tickers = momentum_z.index.union(value_z.index).union(sentiment_z.index)

    m = momentum_z.reindex(tickers).fillna(0.0)
    v = value_z.reindex(tickers).fillna(0.0)
    s = sentiment_z.reindex(tickers).fillna(0.0)

    raw = w["momentum"] * m + w["value"] * v + w["sentiment"] * s
    return (50 + 25 * np.tanh(raw)).rename("composite")


def generate_factor_tags(
    momentum_z: float,
    value_z: float,
    sentiment_z: float,
    max_tags: int = 3,
) -> list[str]:
    tags = []
    if momentum_z > 1.0:
        tags.append("Strong momentum")
    elif momentum_z < -1.0:
        tags.append("Weak momentum")

    if value_z > 1.0:
        tags.append("Cheap vs peers")
    elif value_z < -1.0:
        tags.append("Expensive vs peers")

    if sentiment_z > 1.0:
        tags.append("Positive buzz")
    elif sentiment_z < -1.0:
        tags.append("Negative sentiment")

    if not tags:
        tags.append("Neutral signals")

    return tags[:max_tags]
