"""Backtest harness: evaluate model changes before deploy using historical data."""
from __future__ import annotations

import os
from datetime import date, timedelta

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from scipy.stats import spearmanr
from sqlalchemy import create_engine, text

from ml.factors.momentum import compute_momentum_scores
from ml.factors.value import compute_value_scores
from ml.scoring.composite import compute_batch_scores

load_dotenv()

TIMESCALE_URL = os.environ["TIMESCALE_URL"]
DATABASE_URL = os.environ["DATABASE_URL"]


def load_price_matrix(ts_engine, start: str, end: str) -> pd.DataFrame:
    df = pd.read_sql(text("""
        SELECT time, ticker, close FROM ohlcv
        WHERE time BETWEEN :start AND :end
        ORDER BY time
    """), ts_engine, params={"start": start, "end": end})
    return df.pivot(index="time", columns="ticker", values="close")


def compute_forward_returns(price_df: pd.DataFrame, horizon_days: int = 30) -> pd.Series:
    """30-day forward return for each ticker as of the last available date."""
    if len(price_df) < horizon_days + 20:
        return pd.Series(dtype=float)
    entry = price_df.iloc[-horizon_days - 1]
    exit_ = price_df.iloc[-1]
    return ((exit_ - entry) / entry).rename("fwd_return")


def run_backtest(
    start_date: str,
    end_date: str,
    weights: dict | None = None,
) -> dict:
    ts_engine = create_engine(TIMESCALE_URL)
    db_engine = create_engine(DATABASE_URL)

    fund_df = pd.read_sql("SELECT * FROM fundamentals", db_engine)

    # Use price data up to (end_date - 30d) as features, then compute 30d fwd return
    feature_end = (pd.Timestamp(end_date) - timedelta(days=35)).strftime("%Y-%m-%d")
    price_df = load_price_matrix(ts_engine, start_date, feature_end)

    if price_df.empty:
        return {"error": "No price data"}

    momentum_z = compute_momentum_scores(price_df)
    value_z = compute_value_scores(fund_df)
    composite = compute_batch_scores(momentum_z, value_z, pd.Series(dtype=float), weights)

    # Forward returns over the held-out window
    full_price = load_price_matrix(ts_engine, feature_end, end_date)
    fwd_returns = compute_forward_returns(full_price)

    shared = composite.index.intersection(fwd_returns.index)
    if len(shared) < 10:
        return {"error": f"Insufficient overlap: {len(shared)} tickers"}

    scores = composite.reindex(shared)
    returns = fwd_returns.reindex(shared)

    rho, pval = spearmanr(scores, returns)

    # Long-top-quintile vs short-bottom-quintile
    q80 = scores.quantile(0.80)
    q20 = scores.quantile(0.20)
    long_ret = returns[scores >= q80].mean()
    short_ret = returns[scores <= q20].mean()
    ls_return = long_ret - short_ret

    spy_fwd = fwd_returns.get("SPY", 0.0)

    result = {
        "start_date": start_date,
        "end_date": end_date,
        "n_tickers": len(shared),
        "spearman_rho": round(float(rho), 4),
        "spearman_pval": round(float(pval), 4),
        "long_quintile_return": round(float(long_ret), 4),
        "short_quintile_return": round(float(short_ret), 4),
        "long_short_return": round(float(ls_return), 4),
        "spy_return": round(float(spy_fwd), 4),
        "model_vs_spy": round(float(long_ret - spy_fwd), 4),
    }
    print(f"[backtest] {result}")
    return result


if __name__ == "__main__":
    end = date.today().isoformat()
    start = (date.today() - timedelta(days=180)).isoformat()
    run_backtest(start, end)
