"""PSI-based feature distribution drift detection."""
from __future__ import annotations

import os

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

TIMESCALE_URL = os.environ["TIMESCALE_URL"]
PSI_THRESHOLD = 0.2  # PSI > 0.2 = significant drift
N_BINS = 10


def _psi(expected: np.ndarray, actual: np.ndarray, n_bins: int = N_BINS) -> float:
    bins = np.percentile(expected, np.linspace(0, 100, n_bins + 1))
    bins[0] = -np.inf
    bins[-1] = np.inf

    exp_counts = np.histogram(expected, bins=bins)[0]
    act_counts = np.histogram(actual, bins=bins)[0]

    exp_pct = (exp_counts + 1e-6) / len(expected)
    act_pct = (act_counts + 1e-6) / len(actual)

    return float(np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct)))


def load_factor_distributions(engine, lookback_days: int, baseline_days: int = 90) -> tuple[pd.DataFrame, pd.DataFrame]:
    baseline = pd.read_sql(text("""
        SELECT momentum_z, value_z, sentiment_z FROM stock_scores
        WHERE time BETWEEN NOW() - INTERVAL ':baseline days' AND NOW() - INTERVAL ':lookback days'
    """).bindparams(baseline=baseline_days, lookback=lookback_days), engine)

    recent = pd.read_sql(text("""
        SELECT momentum_z, value_z, sentiment_z FROM stock_scores
        WHERE time >= NOW() - INTERVAL ':lookback days'
    """).bindparams(lookback=lookback_days), engine)

    return baseline, recent


def run_drift_check(lookback_days: int = 7) -> dict:
    engine = create_engine(TIMESCALE_URL)
    baseline, recent = load_factor_distributions(engine, lookback_days)

    results = {}
    for col in ["momentum_z", "value_z", "sentiment_z"]:
        if baseline[col].dropna().empty or recent[col].dropna().empty:
            results[col] = None
            continue
        psi = _psi(baseline[col].dropna().values, recent[col].dropna().values)
        results[col] = psi
        status = "DRIFT" if psi > PSI_THRESHOLD else "OK"
        print(f"[drift] {col}: PSI={psi:.4f} [{status}]")

    return results
