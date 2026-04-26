"""Scrape Reddit/StockTwits/news headlines and store raw sentiment inputs."""
import os
import time
from datetime import datetime, timezone

import httpx
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

NEWSAPI_KEY = os.environ["NEWSAPI_KEY"]
TIMESCALE_URL = os.environ["TIMESCALE_URL"]
NEWSAPI_BASE = "https://newsapi.org/v2"
STOCKTWITS_BASE = "https://api.stocktwits.com/api/2"


def fetch_news_headlines(ticker: str, days_back: int = 7) -> list[dict]:
    resp = httpx.get(
        f"{NEWSAPI_BASE}/everything",
        params={
            "q": ticker,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 50,
            "apiKey": NEWSAPI_KEY,
        },
        timeout=20,
    )
    resp.raise_for_status()
    articles = resp.json().get("articles", [])
    return [{"ticker": ticker, "source": "newsapi", "text": a["title"], "published_at": a["publishedAt"]} for a in articles]


def fetch_stocktwits_sentiment(ticker: str) -> dict:
    try:
        resp = httpx.get(f"{STOCKTWITS_BASE}/streams/symbol/{ticker}.json", timeout=10)
        resp.raise_for_status()
        data = resp.json()
        messages = data.get("messages", [])
        bullish = sum(1 for m in messages if m.get("entities", {}).get("sentiment", {}).get("basic") == "Bullish")
        bearish = sum(1 for m in messages if m.get("entities", {}).get("sentiment", {}).get("basic") == "Bearish")
        total = bullish + bearish
        score = (bullish - bearish) / total if total > 0 else 0.0
        return {"ticker": ticker, "score": score, "mention_count": len(messages), "source": "stocktwits"}
    except Exception as exc:
        print(f"[sentiment_feed] stocktwits {ticker}: {exc}")
        return {"ticker": ticker, "score": 0.0, "mention_count": 0, "source": "stocktwits"}


def store_raw_headlines(headlines: list[dict]) -> None:
    if not headlines:
        return
    engine = create_engine(TIMESCALE_URL)
    df = pd.DataFrame(headlines)
    df["time"] = pd.to_datetime(df["published_at"], utc=True)
    df = df.drop(columns=["published_at"])
    df.to_sql("raw_headlines", engine, if_exists="append", index=False)


def store_sentiment_scores(scores: list[dict]) -> None:
    if not scores:
        return
    engine = create_engine(TIMESCALE_URL)
    df = pd.DataFrame(scores)
    df["time"] = datetime.now(tz=timezone.utc)
    df.to_sql("sentiment_scores", engine, if_exists="append", index=False)


def run(tickers: list[str]) -> None:
    all_headlines = []
    all_scores = []
    for ticker in tickers:
        try:
            headlines = fetch_news_headlines(ticker)
            all_headlines.extend(headlines)
            score = fetch_stocktwits_sentiment(ticker)
            all_scores.append(score)
            time.sleep(0.2)
        except Exception as exc:
            print(f"[sentiment_feed] {ticker}: {exc}")

    store_raw_headlines(all_headlines)
    store_sentiment_scores(all_scores)
    print(f"[sentiment_feed] {len(all_headlines)} headlines, {len(all_scores)} scores stored")


if __name__ == "__main__":
    from price_feed import DEFAULT_TICKERS
    run(DEFAULT_TICKERS)
