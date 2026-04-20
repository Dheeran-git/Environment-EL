"""Anomaly detection for month-over-month score jumps."""

from __future__ import annotations

from bangalore_lakes.analytics.timeseries import LakeMonthlyObservation


def detect_mom_anomalies(
    observations: list[LakeMonthlyObservation], *, threshold_pct: float = 20.0
) -> list[LakeMonthlyObservation]:
    if not observations:
        return observations
    updated: list[LakeMonthlyObservation] = []
    prev: LakeMonthlyObservation | None = None
    for obs in observations:
        if prev is None or prev.pollution_score == 0:
            updated.append(obs)
            prev = obs
            continue
        change = ((obs.pollution_score - prev.pollution_score) / prev.pollution_score) * 100.0
        updated.append(
            LakeMonthlyObservation(
                **{
                    **obs.__dict__,
                    "mom_change_pct": round(change, 2),
                    "anomaly_flag": change > threshold_pct,
                }
            )
        )
        prev = obs
    return updated
