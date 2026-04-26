"""Detect stale or gapped data in the OHLCV hypertable."""
from __future__ import annotations

import os
from datetime import date, timedelta

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

TIMESCALE_URL = os.environ["TIMESCALE_URL"]
MAX_STALE_DAYS = 1  # >1 trading day old = stale


def get_latest_dates(engine) -> pd.DataFrame:
    query = text("""
        SELECT ticker, MAX(time::date) AS latest_date
        FROM ohlcv
        GROUP BY ticker
    """)
    with engine.connect() as conn:
        return pd.read_sql(query, conn)


def detect_stale(engine, as_of: date | None = None) -> list[str]:
    as_of = as_of or date.today()
    df = get_latest_dates(engine)
    threshold = as_of - timedelta(days=MAX_STALE_DAYS + 1)  # +1 for weekends
    stale = df[pd.to_datetime(df["latest_date"]).dt.date < threshold]["ticker"].tolist()
    return stale


def detect_gaps(engine, ticker: str, from_date: str, to_date: str) -> list[str]:
    query = text("""
        SELECT DISTINCT time::date AS trade_date
        FROM ohlcv
        WHERE ticker = :ticker AND time BETWEEN :from_date AND :to_date
        ORDER BY trade_date
    """)
    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"ticker": ticker, "from_date": from_date, "to_date": to_date})

    all_dates = pd.bdate_range(from_date, to_date)
    found_dates = set(pd.to_datetime(df["trade_date"]).dt.date)
    gaps = [str(d.date()) for d in all_dates if d.date() not in found_dates]
    return gaps


def run_check() -> dict:
    engine = create_engine(TIMESCALE_URL)
    stale = detect_stale(engine)
    report = {"stale_tickers": stale, "stale_count": len(stale)}
    if stale:
        print(f"[stale_check] WARNING: {len(stale)} stale tickers: {stale[:10]}...")
    else:
        print("[stale_check] All tickers up to date")
    return report


if __name__ == "__main__":
    run_check()
