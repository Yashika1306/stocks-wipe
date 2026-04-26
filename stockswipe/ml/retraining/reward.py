"""Compute reward signals: 30-day forward return vs SPY benchmark."""
from __future__ import annotations

import os
from datetime import date, timedelta

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

TIMESCALE_URL = os.environ["TIMESCALE_URL"]
DATABASE_URL = os.environ["DATABASE_URL"]
SPY_TICKER = "SPY"


def get_price_on(engine, ticker: str, target_date: str) -> float | None:
    result = pd.read_sql(
        text("SELECT close FROM ohlcv WHERE ticker = :ticker AND time::date = :date LIMIT 1"),
        engine,
        params={"ticker": ticker, "date": target_date},
    )
    return float(result["close"].iloc[0]) if not result.empty else None


def compute_30d_return(ticker: str, swipe_date: str, engine) -> float | None:
    entry_price = get_price_on(engine, ticker, swipe_date)
    exit_date = (pd.Timestamp(swipe_date) + timedelta(days=42)).strftime("%Y-%m-%d")  # ~30 trading days
    exit_price = get_price_on(engine, ticker, exit_date)

    if entry_price is None or exit_price is None:
        return None
    return (exit_price - entry_price) / entry_price


def compute_rewards(as_of: str | None = None) -> pd.DataFrame:
    """
    For all right-swipes made ~30 days ago, compute reward = stock return - SPY return.
    Only processes swipes where we now have 30d of forward data.
    """
    ts_engine = create_engine(TIMESCALE_URL)
    db_engine = create_engine(DATABASE_URL)

    cutoff = as_of or (date.today() - timedelta(days=42)).isoformat()

    swipes = pd.read_sql(text("""
        SELECT id, user_id, ticker, card_score, hesitation_ms, swiped_at::date AS swipe_date
        FROM swipe_events
        WHERE direction = 'right'
          AND swiped_at::date <= :cutoff
          AND id NOT IN (SELECT swipe_id FROM swipe_rewards)
    """), db_engine, params={"cutoff": cutoff})

    if swipes.empty:
        print("[reward] No new swipes to process")
        return pd.DataFrame()

    spy_returns = {}
    rows = []
    for _, swipe in swipes.iterrows():
        swipe_date = str(swipe["swipe_date"])
        ticker_ret = compute_30d_return(swipe["ticker"], swipe_date, ts_engine)

        if swipe_date not in spy_returns:
            spy_returns[swipe_date] = compute_30d_return(SPY_TICKER, swipe_date, ts_engine)
        spy_ret = spy_returns[swipe_date]

        if ticker_ret is None or spy_ret is None:
            continue

        reward = ticker_ret - (spy_ret or 0.0)

        # Down-weight hesitant signals
        hesitation_ms = swipe.get("hesitation_ms", 1000)
        weight = 1.0
        if hesitation_ms and hesitation_ms > 4000:
            weight = 0.5
        elif hesitation_ms and hesitation_ms < 500 and reward > 0:
            weight = 1.5

        rows.append({
            "swipe_id": swipe["id"],
            "user_id": swipe["user_id"],
            "ticker": swipe["ticker"],
            "swipe_date": swipe_date,
            "ticker_return": ticker_ret,
            "spy_return": spy_ret,
            "reward": reward,
            "weight": weight,
        })

    result = pd.DataFrame(rows)
    if not result.empty:
        result.to_sql("swipe_rewards", db_engine, if_exists="append", index=False)
        print(f"[reward] Computed {len(result)} rewards")
    return result
