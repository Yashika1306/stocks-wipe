"""Fundamentals ingestion via SimFin API (P/E, P/B, EV/EBITDA)."""
import os

import httpx
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv()

SIMFIN_API_KEY = os.environ["SIMFIN_API_KEY"]
DATABASE_URL = os.environ["DATABASE_URL"]
SIMFIN_BASE = "https://backend.simfin.com/api/v3"


def fetch_income_statements(tickers: list[str]) -> pd.DataFrame:
    rows = []
    for ticker in tickers:
        try:
            resp = httpx.get(
                f"{SIMFIN_BASE}/companies/statements/compact",
                params={"ticker": ticker, "statements": "PL", "period": "TTM", "api-key": SIMFIN_API_KEY},
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
            if data and isinstance(data, list):
                rows.append({"ticker": ticker, **data[0].get("data", {})})
        except Exception as exc:
            print(f"[fundamentals] income {ticker}: {exc}")
    return pd.DataFrame(rows)


def fetch_balance_sheets(tickers: list[str]) -> pd.DataFrame:
    rows = []
    for ticker in tickers:
        try:
            resp = httpx.get(
                f"{SIMFIN_BASE}/companies/statements/compact",
                params={"ticker": ticker, "statements": "BS", "period": "TTM", "api-key": SIMFIN_API_KEY},
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
            if data and isinstance(data, list):
                rows.append({"ticker": ticker, **data[0].get("data", {})})
        except Exception as exc:
            print(f"[fundamentals] balance {ticker}: {exc}")
    return pd.DataFrame(rows)


def compute_ratios(income_df: pd.DataFrame, balance_df: pd.DataFrame, prices: dict) -> pd.DataFrame:
    merged = income_df.merge(balance_df, on="ticker", suffixes=("_inc", "_bs"))
    rows = []
    for _, row in merged.iterrows():
        ticker = row["ticker"]
        price = prices.get(ticker, float("nan"))
        try:
            eps = row.get("Net Income", 0) / max(row.get("Shares (Diluted)", 1), 1)
            book_value = row.get("Total Equity", 0) / max(row.get("Shares (Diluted)", 1), 1)
            ebitda = row.get("EBITDA", 0)
            ev = price * row.get("Shares (Diluted)", 1) + row.get("Total Liabilities", 0) - row.get("Cash & Cash Equivalents", 0)
            rows.append({
                "ticker": ticker,
                "pe_ratio": price / eps if eps > 0 else None,
                "pb_ratio": price / book_value if book_value > 0 else None,
                "ev_ebitda": ev / ebitda if ebitda > 0 else None,
                "sector": row.get("sector", "Unknown"),
            })
        except Exception:
            continue
    return pd.DataFrame(rows)


def ingest(tickers: list[str], prices: dict) -> None:
    engine = create_engine(DATABASE_URL)
    income = fetch_income_statements(tickers)
    balance = fetch_balance_sheets(tickers)
    ratios = compute_ratios(income, balance, prices)
    if not ratios.empty:
        ratios.to_sql("fundamentals", engine, if_exists="replace", index=False)
        print(f"[fundamentals] Stored {len(ratios)} rows")


if __name__ == "__main__":
    from price_feed import DEFAULT_TICKERS
    ingest(DEFAULT_TICKERS, prices={})
