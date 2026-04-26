"""Thompson sampling update of per-user factor weights."""
from __future__ import annotations

import json
import os

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

from ml.scoring.weights import cache_user_weights, normalize_weights

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

# Beta distribution hyperparameters per factor
FACTOR_KEYS = ["momentum", "value", "sentiment"]
PRIOR_ALPHA = 2.0
PRIOR_BETA = 2.0


def _load_user_rewards(engine, user_id: str) -> pd.DataFrame:
    return pd.read_sql(text("""
        SELECT r.ticker, r.reward, r.weight, ss.momentum_z, ss.value_z, ss.sentiment_z
        FROM swipe_rewards r
        JOIN stock_scores ss ON ss.ticker = r.ticker
            AND ss.time::date = r.swipe_date
        WHERE r.user_id = :uid
    """), engine, params={"uid": user_id})


def _update_beta_params(rewards_df: pd.DataFrame) -> dict:
    """
    Attribute reward to whichever factor had the highest absolute z-score for that stock.
    Update Beta(alpha, beta) params: positive reward → alpha++, negative → beta++.
    """
    params = {f: {"alpha": PRIOR_ALPHA, "beta": PRIOR_BETA} for f in FACTOR_KEYS}

    for _, row in rewards_df.iterrows():
        z_scores = {
            "momentum": abs(float(row.get("momentum_z", 0) or 0)),
            "value": abs(float(row.get("value_z", 0) or 0)),
            "sentiment": abs(float(row.get("sentiment_z", 0) or 0)),
        }
        dominant = max(z_scores, key=z_scores.get)
        w = float(row.get("weight", 1.0))
        if row["reward"] > 0:
            params[dominant]["alpha"] += w
        else:
            params[dominant]["beta"] += w

    return params


def thompson_sample(params: dict) -> dict:
    """Draw one sample from each Beta distribution and normalize."""
    samples = {}
    for f, p in params.items():
        samples[f] = float(np.random.beta(p["alpha"], p["beta"]))
    return normalize_weights(samples)


def update_user_weights(user_id: str) -> dict:
    engine = create_engine(DATABASE_URL)
    rewards = _load_user_rewards(engine, user_id)

    if len(rewards) < 10:
        from ml.scoring.weights import DEFAULT_WEIGHTS
        return DEFAULT_WEIGHTS.copy()

    params = _update_beta_params(rewards)
    new_weights = thompson_sample(params)

    with engine.connect() as conn:
        conn.execute(text("""
            UPDATE users SET factor_weights = :weights WHERE id = :uid
        """), {"weights": json.dumps(new_weights), "uid": user_id})
        conn.commit()

    cache_user_weights(user_id, new_weights)
    print(f"[bandit] {user_id}: {new_weights}")
    return new_weights


def run_all_users() -> None:
    engine = create_engine(DATABASE_URL)
    users = pd.read_sql(
        text("SELECT id FROM users WHERE swipe_count >= 50"),
        engine,
    )
    for user_id in users["id"]:
        try:
            update_user_weights(str(user_id))
        except Exception as exc:
            print(f"[bandit] {user_id}: {exc}")
