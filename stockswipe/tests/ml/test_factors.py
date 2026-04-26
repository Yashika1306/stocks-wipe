import numpy as np
import pandas as pd
import pytest

from ml.factors.momentum import compute_rsi, compute_momentum_scores
from ml.factors.value import compute_value_scores
from ml.scoring.composite import composite_score, compute_batch_scores, generate_factor_tags


# ── Momentum ──────────────────────────────────────────────────────────────────

def _price_series(n: int = 300, trend: float = 0.001) -> pd.Series:
    rng = np.random.default_rng(42)
    returns = rng.normal(trend, 0.015, n)
    prices = 100 * np.exp(np.cumsum(returns))
    return pd.Series(prices)


def test_rsi_bounds():
    prices = _price_series(100)
    rsi = compute_rsi(prices)
    valid = rsi.dropna()
    assert (valid >= 0).all() and (valid <= 100).all()


def test_rsi_trending_up_above_50():
    prices = pd.Series(np.linspace(100, 200, 100))
    rsi = compute_rsi(prices).dropna()
    assert rsi.iloc[-1] > 50


def test_momentum_scores_cross_sectional():
    """Z-scores should be roughly mean-zero."""
    prices = {t: _price_series(300) for t in ["A", "B", "C", "D", "E"]}
    price_df = pd.DataFrame(prices)
    scores = compute_momentum_scores(price_df)
    assert abs(scores.mean()) < 0.5  # near zero
    assert abs(scores.std() - 1.0) < 0.5  # near unit variance


# ── Value ─────────────────────────────────────────────────────────────────────

def _fund_df():
    return pd.DataFrame([
        {"ticker": "A", "sector": "Tech", "pe_ratio": 10, "pb_ratio": 1.5, "ev_ebitda": 8},
        {"ticker": "B", "sector": "Tech", "pe_ratio": 30, "pb_ratio": 4.0, "ev_ebitda": 20},
        {"ticker": "C", "sector": "Energy", "pe_ratio": 8, "pb_ratio": 1.2, "ev_ebitda": 6},
        {"ticker": "D", "sector": "Energy", "pe_ratio": 25, "pb_ratio": 3.5, "ev_ebitda": 18},
    ])


def test_value_cheap_ranks_higher():
    scores = compute_value_scores(_fund_df())
    assert scores["A"] > scores["B"], "Cheaper stock should score higher"
    assert scores["C"] > scores["D"]


def test_value_scores_finite():
    scores = compute_value_scores(_fund_df())
    assert scores.notna().all()


# ── Composite ─────────────────────────────────────────────────────────────────

def test_composite_range():
    score = composite_score(1.0, 1.0, 1.0)
    assert 0 <= score <= 100

    low = composite_score(-2.0, -2.0, -2.0)
    high = composite_score(2.0, 2.0, 2.0)
    assert low < 50 < high


def test_composite_default_weights_sum_to_1():
    from ml.scoring.composite import DEFAULT_WEIGHTS
    assert abs(sum(DEFAULT_WEIGHTS.values()) - 1.0) < 1e-6


def test_factor_tags_max_3():
    tags = generate_factor_tags(2.0, 2.0, 2.0)
    assert len(tags) <= 3


def test_batch_scores_shape():
    tickers = ["A", "B", "C"]
    m = pd.Series([1.0, -0.5, 0.2], index=tickers)
    v = pd.Series([0.3, 1.0, -0.8], index=tickers)
    s = pd.Series([-0.1, 0.5, 0.9], index=tickers)
    scores = compute_batch_scores(m, v, s)
    assert set(scores.index) == set(tickers)
    assert scores.between(0, 100).all()
