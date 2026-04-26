"""Value factor: P/E, P/B, EV/EBITDA sector-normalized."""
from __future__ import annotations

import numpy as np
import pandas as pd


def _sector_zscore(series: pd.Series, sector_map: pd.Series) -> pd.Series:
    """Z-score within each GICS sector."""
    result = pd.Series(index=series.index, dtype=float)
    for sector in sector_map.unique():
        mask = sector_map == sector
        grp = series[mask]
        mu, sigma = grp.mean(), grp.std()
        result[mask] = (grp - mu) / sigma.replace(0, 1) if sigma > 0 else 0.0
    return result


def compute_value_scores(fundamentals_df: pd.DataFrame) -> pd.Series:
    """
    fundamentals_df columns: ticker, sector, pe_ratio, pb_ratio, ev_ebitda
    Lower ratios = better value = higher z-score (we negate before z-scoring)
    Returns cross-sectional value z-score per ticker.
    """
    df = fundamentals_df.set_index("ticker").copy()
    sector_map = df["sector"]

    component_scores = []
    for col in ["pe_ratio", "pb_ratio", "ev_ebitda"]:
        if col not in df.columns:
            continue
        series = df[col].replace([np.inf, -np.inf], np.nan).dropna()
        # Winsorize at 1st/99th percentile to reduce outlier influence
        low, high = series.quantile(0.01), series.quantile(0.99)
        series = series.clip(low, high)
        # Negate: lower ratio = better value
        z = _sector_zscore(-series, sector_map.reindex(series.index))
        component_scores.append(z)

    if not component_scores:
        return pd.Series(dtype=float)

    combined = pd.concat(component_scores, axis=1).mean(axis=1)
    # Final cross-sectional z-score across universe
    return (combined - combined.mean()) / combined.std().replace(0, 1)
