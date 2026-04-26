"""Adjust OHLCV data for splits and dividends using Polygon corporate actions."""
import os
from datetime import date

import httpx
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

POLYGON_API_KEY = os.environ["POLYGON_API_KEY"]
TIMESCALE_URL = os.environ["TIMESCALE_URL"]
BASE_URL = "https://api.polygon.io"


def fetch_splits(ticker: str) -> list[dict]:
    resp = httpx.get(
        f"{BASE_URL}/v3/reference/splits",
        params={"ticker": ticker, "apiKey": POLYGON_API_KEY},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json().get("results", [])


def fetch_dividends(ticker: str) -> list[dict]:
    resp = httpx.get(
        f"{BASE_URL}/v3/reference/dividends",
        params={"ticker": ticker, "apiKey": POLYGON_API_KEY},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json().get("results", [])


def apply_split_adjustment(engine, ticker: str, split_date: str, ratio: float) -> None:
    """Multiply all pre-split prices by 1/ratio and volume by ratio."""
    with engine.connect() as conn:
        conn.execute(text("""
            UPDATE ohlcv
            SET open  = open  / :ratio,
                high  = high  / :ratio,
                low   = low   / :ratio,
                close = close / :ratio,
                vwap  = vwap  / :ratio,
                volume = volume * :ratio
            WHERE ticker = :ticker AND time < :split_date
        """), {"ticker": ticker, "split_date": split_date, "ratio": ratio})
        conn.commit()
    print(f"[corp_actions] {ticker} split {ratio}x applied before {split_date}")


def process_ticker(ticker: str) -> None:
    engine = create_engine(TIMESCALE_URL)
    splits = fetch_splits(ticker)
    for s in splits:
        ratio = s["split_to"] / s["split_from"]
        apply_split_adjustment(engine, ticker, s["execution_date"], ratio)


def run(tickers: list[str]) -> None:
    for ticker in tickers:
        try:
            process_ticker(ticker)
        except Exception as exc:
            print(f"[corp_actions] {ticker}: {exc}")


if __name__ == "__main__":
    from data.ingestion.price_feed import DEFAULT_TICKERS
    run(DEFAULT_TICKERS)
