"""FinBERT sentiment factor: news + Reddit → rolling EWM score per ticker."""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODEL_NAME = "ProsusAI/finbert"
_tokenizer = None
_model = None


def _load_model():
    global _tokenizer, _model
    if _tokenizer is None:
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
        _model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)
        _model.eval()


def score_texts(texts: list[str], batch_size: int = 16) -> list[float]:
    """Returns list of sentiment scores in [-1, 1] (positive - negative)."""
    _load_model()
    scores = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        inputs = _tokenizer(batch, padding=True, truncation=True, max_length=512, return_tensors="pt")
        with torch.no_grad():
            logits = _model(**inputs).logits
        probs = torch.softmax(logits, dim=-1).numpy()
        # FinBERT labels: [positive, negative, neutral]
        for p in probs:
            scores.append(float(p[0] - p[1]))
    return scores


def compute_sentiment_scores(headlines_df: pd.DataFrame, stocktwits_df: pd.DataFrame) -> pd.Series:
    """
    headlines_df: ticker, text, time
    stocktwits_df: ticker, score (already [-1,1]), mention_count, time

    Returns rolling 7-day EWM sentiment z-score per ticker.
    """
    # Score headlines with FinBERT
    scored = headlines_df.copy()
    if not scored.empty:
        scored["bert_score"] = score_texts(scored["text"].tolist())
    else:
        scored["bert_score"] = []

    cutoff = datetime.now(tz=timezone.utc) - timedelta(days=7)
    scored = scored[pd.to_datetime(scored["time"], utc=True) >= cutoff]

    # EWM per ticker on headlines
    headline_means = (
        scored.groupby("ticker")["bert_score"]
        .apply(lambda s: s.ewm(halflife=3).mean().iloc[-1] if len(s) > 0 else 0.0)
        .rename("headline_score")
    )

    # Combine with StockTwits
    st = stocktwits_df.set_index("ticker")["score"].rename("st_score")
    combined = pd.concat([headline_means, st], axis=1).fillna(0.0)

    # Mention-count weight from StockTwits
    mention_weight = stocktwits_df.set_index("ticker").get("mention_count", pd.Series(dtype=float))
    mention_weight = np.log1p(mention_weight.fillna(0)).clip(0, 5) / 5  # normalize 0-1

    raw = combined["headline_score"] * 0.6 + combined["st_score"] * 0.4
    raw = raw.add(mention_weight * 0.1, fill_value=0)

    # Cross-sectional z-score, clamped to [-1, 1]
    z = (raw - raw.mean()) / raw.std().replace(0, 1)
    return z.clip(-1, 1)
