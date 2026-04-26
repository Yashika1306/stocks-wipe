"""Factor correlation regime change detection."""
from __future__ import annotations

import os

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

TIMESCALE_URL = os.environ["TIMESCALE_URL"]
CORR_CHANGE_THRESHOLD = 0.3  # |delta_corr| > 0.3 = regime change


def load_factor_matrix(engine, days: int = 60) -> pd.DataFrame:
    return pd.read_sql(text("""
        SELECT time, ticker, momentum_z, value_z, sentiment_z
        FROM stock_scores
        WHERE time >= NOW() - INTERVAL ':days days'
        ORDER BY time
    """).bindparams(days=days), engine)


def compute_rolling_correlations(df: pd.DataFrame, window: int = 20) -> pd.DataFrame:
    pivot = df.pivot_table(index="time", values=["momentum_z", "value_z", "sentiment_z"], aggfunc="mean")
    corrs = pivot.rolling(window).corr()
    return corrs


def detect_regime_change(engine) -> dict:
    df = load_factor_matrix(engine)
    if df.empty or len(df) < 40:
        return {"regime_change": False}

    pivot = df.pivot_table(index="time", values=["momentum_z", "value_z", "sentiment_z"], aggfunc="mean")

    recent_corr = pivot.tail(20).corr()
    baseline_corr = pivot.iloc[-40:-20].corr()

    alerts = []
    for f1 in ["momentum_z", "value_z", "sentiment_z"]:
        for f2 in ["momentum_z", "value_z", "sentiment_z"]:
            if f1 >= f2:
                continue
            delta = abs(float(recent_corr.loc[f1, f2]) - float(baseline_corr.loc[f1, f2]))
            if delta > CORR_CHANGE_THRESHOLD:
                alerts.append({"pair": f"{f1}/{f2}", "delta": delta})

    if alerts:
        print(f"[regime_alert] REGIME CHANGE DETECTED: {alerts}")
    else:
        print("[regime_alert] No regime change detected")

    return {"regime_change": len(alerts) > 0, "alerts": alerts}


if __name__ == "__main__":
    engine = create_engine(TIMESCALE_URL)
    detect_regime_change(engine)
