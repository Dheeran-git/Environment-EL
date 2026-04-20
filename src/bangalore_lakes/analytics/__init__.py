"""Analytics modules for spectral indices, scoring, and time series."""

from bangalore_lakes.analytics.anomaly import detect_mom_anomalies
from bangalore_lakes.analytics.indices import normalize_index_value
from bangalore_lakes.analytics.scoring import compute_pollution_score
from bangalore_lakes.analytics.timeseries import (
    LakeMonthlyObservation,
    monthly_windows,
    write_timeseries_csv,
    write_timeseries_json,
)
from bangalore_lakes.analytics.verdict import RestorationVerdict, evaluate_restoration_verdict

__all__ = [
    "LakeMonthlyObservation",
    "RestorationVerdict",
    "compute_pollution_score",
    "detect_mom_anomalies",
    "evaluate_restoration_verdict",
    "monthly_windows",
    "normalize_index_value",
    "write_timeseries_csv",
    "write_timeseries_json",
]
