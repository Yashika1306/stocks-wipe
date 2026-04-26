"""Momentum factor: 12-1 month momentum, RSI(14), MACD signal."""
from __future__ import annotations

import numpy as np
import pandas as pd


def compute_rsi(prices: pd.Series, window: int = 14) -> pd.Series:
    delta = prices.diff()
    gain = delta.clip(lower=0)
    loss = (-delta).clip(lower=0)
    avg_gain = gain.ewm(com=window - 1, min_periods=window).mean()
    avg_loss = loss.ewm(com=window - 1, min_periods=window).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - 100 / (1 + rs)


def compute_macd(prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = prices.ewm(span=fast).mean()
    ema_slow = prices.ewm(span=slow).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal).mean()
    return macd_line, signal_line


def days_since_bullish_cross(macd: pd.Series, signal: pd.Series) -> int:
    crosses = (macd > signal) & (macd.shift(1) <= signal.shift(1))
    cross_indices = np.where(crosses)[0]
    if len(cross_indices) == 0:
        return 999
    return len(macd) - 1 - cross_indices[-1]


def compute_momentum_raw(prices: pd.Series) -> float:
    """
    Combines:
    - 12-1 month return (skips most recent month to avoid reversal)
    - RSI(14) bonus/penalty
    - MACD cross recency
    """
    if len(prices) < 252:
        return float("nan")

    # 12-1 month momentum: return from 252 days ago to 21 days ago
    momentum_12_1 = (prices.iloc[-21] / prices.iloc[-252]) - 1

    rsi = compute_rsi(prices).iloc[-1]
    rsi_adj = 0.0
    if rsi < 30:
        rsi_adj = 0.1
    elif rsi > 70:
        rsi_adj = -0.1

    macd_line, signal_line = compute_macd(prices)
    cross_days = days_since_bullish_cross(macd_line, signal_line)
    macd_adj = max(0.0, 0.05 * (1 - cross_days / 30)) if cross_days <= 30 else 0.0

    return momentum_12_1 + rsi_adj + macd_adj


def compute_momentum_scores(price_df: pd.DataFrame) -> pd.Series:
    """
    price_df: wide DataFrame, columns = tickers, index = dates, values = close prices.
    Returns Series of raw momentum scores per ticker.
    """
    scores = {}
    for ticker in price_df.columns:
        scores[ticker] = compute_momentum_raw(price_df[ticker].dropna())
    raw = pd.Series(scores).dropna()
    # Cross-sectional z-score
    return (raw - raw.mean()) / raw.std().replace(0, 1)
