"""Unusual options activity feed via Polygon.io options endpoint."""
import os
from datetime import date, timedelta

import httpx
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

POLYGON_API_KEY = os.environ["POLYGON_API_KEY"]
DATABASE_URL = os.environ["DATABASE_URL"]
BASE_URL = "https://api.polygon.io"

UNUSUAL_VOLUME_THRESHOLD = 2.0  # OI ratio: current volume / avg 30d volume


def fetch_options_snapshot(ticker: str) -> list[dict]:
    resp = httpx.get(
        f"{BASE_URL}/v3/snapshot/options/{ticker}",
        params={"apiKey": POLYGON_API_KEY, "limit": 250},
        timeout=20,
    )
    resp.raise_for_status()
    results = resp.json().get("results", [])
    unusual = []
    for r in results:
        details = r.get("details", {})
        day = r.get("day", {})
        greeks = r.get("greeks", {})
        oi = r.get("open_interest", 0)
        vol = day.get("volume", 0)
        ratio = vol / max(oi, 1)
        if ratio >= UNUSUAL_VOLUME_THRESHOLD:
            unusual.append({
                "ticker": ticker,
                "contract": details.get("ticker"),
                "expiry": details.get("expiration_date"),
                "strike": details.get("strike_price"),
                "contract_type": details.get("contract_type"),
                "volume": vol,
                "open_interest": oi,
                "vol_oi_ratio": ratio,
                "implied_vol": r.get("implied_volatility"),
                "delta": greeks.get("delta"),
                "fetched_at": date.today().isoformat(),
            })
    return unusual


def ingest(tickers: list[str]) -> None:
    engine = create_engine(DATABASE_URL)
    all_rows = []
    for ticker in tickers:
        try:
            rows = fetch_options_snapshot(ticker)
            all_rows.extend(rows)
            print(f"[options_flow] {ticker}: {len(rows)} unusual contracts")
        except Exception as exc:
            print(f"[options_flow] {ticker}: {exc}")

    if all_rows:
        df = pd.DataFrame(all_rows)
        df.to_sql("unusual_options", engine, if_exists="replace", index=False)
        print(f"[options_flow] Stored {len(all_rows)} unusual options rows")


if __name__ == "__main__":
    from price_feed import DEFAULT_TICKERS
    ingest(DEFAULT_TICKERS)
