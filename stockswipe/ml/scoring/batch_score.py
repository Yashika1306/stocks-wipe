"""Daily batch scoring job — runs at 6am ET. Scores all active tickers and caches feeds."""
from __future__ import annotations

import argparse
import json
import os
from datetime import date

import pandas as pd
import redis
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

from ml.factors.momentum import compute_momentum_scores
from ml.factors.value import compute_value_scores
from ml.factors.sentiment import compute_sentiment_scores
from ml.scoring.composite import compute_batch_scores, generate_factor_tags
from ml.scoring.weights import DEFAULT_WEIGHTS

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
TIMESCALE_URL = os.environ["TIMESCALE_URL"]
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
MIN_MARKET_CAP = 500_000_000


def load_price_matrix(engine, lookback_days: int = 280) -> pd.DataFrame:
    df = pd.read_sql(text("""
        SELECT time, ticker, close FROM ohlcv
        WHERE time >= NOW() - INTERVAL ':days days'
        ORDER BY time
    """).bindparams(days=lookback_days), engine)
    return df.pivot(index="time", columns="ticker", values="close")


def load_fundamentals(engine) -> pd.DataFrame:
    return pd.read_sql("SELECT * FROM fundamentals", engine)


def load_headlines(ts_engine, lookback_days: int = 7) -> pd.DataFrame:
    return pd.read_sql(text("""
        SELECT ticker, text, time FROM raw_headlines
        WHERE time >= NOW() - INTERVAL '7 days'
    """), ts_engine)


def load_stocktwits(ts_engine) -> pd.DataFrame:
    return pd.read_sql(text("""
        SELECT ticker, score, mention_count, time
        FROM sentiment_scores
        WHERE source = 'stocktwits' AND time >= NOW() - INTERVAL '1 day'
    """), ts_engine)


def load_active_tickers(engine) -> list[str]:
    df = pd.read_sql(
        "SELECT ticker FROM stock_metadata WHERE is_active = TRUE AND market_cap >= :cap",
        engine,
        params={"cap": MIN_MARKET_CAP},
    )
    return df["ticker"].tolist()


def store_scores(engine, ts_engine, scores_df: pd.DataFrame, score_date: str) -> None:
    ts_rows = scores_df[["momentum_z", "value_z", "sentiment_z", "composite"]].copy()
    ts_rows["time"] = score_date
    ts_rows["ticker"] = ts_rows.index
    ts_rows["factor_weights"] = json.dumps(DEFAULT_WEIGHTS)
    ts_rows.to_sql("stock_scores", ts_engine, if_exists="append", index=False)

    daily_rows = scores_df.copy()
    daily_rows["score_date"] = score_date
    daily_rows["ticker"] = daily_rows.index
    daily_rows.to_sql("daily_scores", engine, if_exists="replace", index=False)


def cache_feeds(redis_client, scores_df: pd.DataFrame, price_df: pd.DataFrame) -> None:
    top_tickers = scores_df.nlargest(200, "composite").index.tolist()
    for ticker in top_tickers:
        try:
            row = scores_df.loc[ticker]
            sparkline = price_df[ticker].dropna().tail(30).tolist() if ticker in price_df else []
            card = {
                "ticker": ticker,
                "composite_score": round(float(row["composite"]), 1),
                "momentum_z": round(float(row.get("momentum_z", 0)), 3),
                "value_z": round(float(row.get("value_z", 0)), 3),
                "sentiment_z": round(float(row.get("sentiment_z", 0)), 3),
                "sparkline": sparkline,
                "factor_tags": generate_factor_tags(
                    row.get("momentum_z", 0),
                    row.get("value_z", 0),
                    row.get("sentiment_z", 0),
                ),
            }
            redis_client.setex(f"card:{ticker}", 86400, json.dumps(card))
        except Exception as exc:
            print(f"[batch_score] cache {ticker}: {exc}")

    redis_client.setex("universe:top200", 86400, json.dumps(top_tickers))
    print(f"[batch_score] Cached {len(top_tickers)} cards")


def run(score_date: str | None = None) -> None:
    score_date = score_date or date.today().isoformat()
    engine = create_engine(DATABASE_URL)
    ts_engine = create_engine(TIMESCALE_URL)
    r = redis.from_url(REDIS_URL, decode_responses=True)

    print(f"[batch_score] Scoring for {score_date}")

    active = load_active_tickers(engine)
    price_df = load_price_matrix(ts_engine)
    price_df = price_df[[t for t in active if t in price_df.columns]]

    fund_df = load_fundamentals(engine)
    fund_df = fund_df[fund_df["ticker"].isin(active)]

    headlines = load_headlines(ts_engine)
    stocktwits = load_stocktwits(ts_engine)

    momentum_z = compute_momentum_scores(price_df)
    value_z = compute_value_scores(fund_df)
    sentiment_z = compute_sentiment_scores(headlines, stocktwits)

    composite = compute_batch_scores(momentum_z, value_z, sentiment_z)

    scores_df = pd.DataFrame({
        "momentum_z": momentum_z,
        "value_z": value_z,
        "sentiment_z": sentiment_z,
        "composite": composite,
    })

    store_scores(engine, ts_engine, scores_df, score_date)
    cache_feeds(r, scores_df, price_df)
    print(f"[batch_score] Done. Scored {len(scores_df)} tickers.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=None)
    args = parser.parse_args()
    run(args.date)
