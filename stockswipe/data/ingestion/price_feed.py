"""Polygon.io OHLCV ingestion into TimescaleDB."""
import argparse
import os
from datetime import date, timedelta

import httpx
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

POLYGON_API_KEY = os.environ["POLYGON_API_KEY"]
TIMESCALE_URL = os.environ["TIMESCALE_URL"]
BASE_URL = "https://api.polygon.io"

# S&P 500-ish universe — extend as needed
DEFAULT_TICKERS = [
    "AAPL", "MSFT", "NVDA", "GOOGL", "AMZN", "META", "TSLA", "BRK.B", "JPM", "V",
    "UNH", "XOM", "LLY", "JNJ", "MA", "AVGO", "PG", "HD", "MRK", "COST",
    "ABBV", "CVX", "PEP", "KO", "ADBE", "WMT", "BAC", "CRM", "MCD", "NFLX",
    "AMD", "TMO", "CSCO", "ABT", "ACN", "ORCL", "LIN", "TXN", "WFC", "DHR",
    "NKE", "PM", "NEE", "INTC", "UPS", "HON", "AMGN", "IBM", "LOW", "QCOM",
]


def fetch_ohlcv(ticker: str, from_date: str, to_date: str) -> list[dict]:
    url = f"{BASE_URL}/v2/aggs/ticker/{ticker}/range/1/day/{from_date}/{to_date}"
    resp = httpx.get(url, params={"apiKey": POLYGON_API_KEY, "adjusted": "true", "limit": 50000})
    resp.raise_for_status()
    results = resp.json().get("results", [])
    rows = []
    for r in results:
        rows.append({
            "time": pd.Timestamp(r["t"], unit="ms", tz="UTC"),
            "ticker": ticker,
            "open": r["o"],
            "high": r["h"],
            "low": r["l"],
            "close": r["c"],
            "volume": r["v"],
            "vwap": r.get("vw"),
        })
    return rows


def ingest(tickers: list[str], from_date: str, to_date: str) -> None:
    engine = create_engine(TIMESCALE_URL)
    for ticker in tickers:
        try:
            rows = fetch_ohlcv(ticker, from_date, to_date)
            if not rows:
                print(f"[price_feed] no data for {ticker}")
                continue
            df = pd.DataFrame(rows)
            df.to_sql("ohlcv", engine, if_exists="append", index=False, method="multi")
            print(f"[price_feed] {ticker}: {len(df)} rows")
        except Exception as exc:
            print(f"[price_feed] ERROR {ticker}: {exc}")

    with engine.connect() as conn:
        conn.execute(text(
            "DELETE FROM ohlcv a USING ohlcv b "
            "WHERE a.ctid < b.ctid AND a.ticker = b.ticker AND a.time = b.time"
        ))
        conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["backfill", "daily"], default="daily")
    parser.add_argument("--days", type=int, default=5)
    parser.add_argument("--tickers", nargs="*", default=DEFAULT_TICKERS)
    args = parser.parse_args()

    to_date = date.today().isoformat()
    if args.mode == "backfill":
        from_date = (date.today() - timedelta(days=args.days)).isoformat()
    else:
        from_date = (date.today() - timedelta(days=args.days)).isoformat()

    print(f"[price_feed] Ingesting {len(args.tickers)} tickers from {from_date} to {to_date}")
    ingest(args.tickers, from_date, to_date)


if __name__ == "__main__":
    main()
