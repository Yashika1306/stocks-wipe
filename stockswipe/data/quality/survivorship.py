"""Handle delisted tickers to avoid survivorship bias."""
import os

import httpx
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

POLYGON_API_KEY = os.environ["POLYGON_API_KEY"]
DATABASE_URL = os.environ["DATABASE_URL"]
BASE_URL = "https://api.polygon.io"


def fetch_ticker_details(ticker: str) -> dict:
    resp = httpx.get(
        f"{BASE_URL}/v3/reference/tickers/{ticker}",
        params={"apiKey": POLYGON_API_KEY},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json().get("results", {})


def mark_delisted(engine, ticker: str, delisted_date: str) -> None:
    with engine.connect() as conn:
        conn.execute(text("""
            UPDATE stock_metadata
            SET is_active = FALSE, updated_at = NOW()
            WHERE ticker = :ticker
        """), {"ticker": ticker})
        conn.commit()
    print(f"[survivorship] {ticker} marked delisted as of {delisted_date}")


def check_and_update(tickers: list[str]) -> None:
    engine = create_engine(DATABASE_URL)
    for ticker in tickers:
        try:
            details = fetch_ticker_details(ticker)
            active = details.get("active", True)
            if not active:
                delisted_date = details.get("delisted_utc", "unknown")
                mark_delisted(engine, ticker, delisted_date)
        except Exception as exc:
            print(f"[survivorship] {ticker}: {exc}")


def get_active_tickers() -> list[str]:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        df = pd.read_sql(text("SELECT ticker FROM stock_metadata WHERE is_active = TRUE"), conn)
    return df["ticker"].tolist()


if __name__ == "__main__":
    active = get_active_tickers()
    check_and_update(active)
