"""Restoration verdict heuristics over score time series."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

from bangalore_lakes.analytics.timeseries import LakeMonthlyObservation


@dataclass(frozen=True)
class RestorationVerdict:
    label: str
    confidence: float
    pre_avg: float
    post_avg: float


def evaluate_restoration_verdict(
    observations: list[LakeMonthlyObservation],
    *,
    event_date: date,
    window_months: int = 6,
) -> RestorationVerdict:
    pre = [o.pollution_score for o in observations if o.month_start < event_date][-window_months:]
    post = [o.pollution_score for o in observations if o.month_start >= event_date][:window_months]
    if not pre or not post:
        return RestorationVerdict(
            label="insufficient_data", confidence=0.0, pre_avg=0.0, post_avg=0.0
        )
    pre_avg = sum(pre) / len(pre)
    post_avg = sum(post) / len(post)
    diff = pre_avg - post_avg
    if diff > 5:
        label = "improved"
    elif diff < -5:
        label = "worsened"
    else:
        label = "unchanged"
    confidence = min(1.0, abs(diff) / 25.0)
    return RestorationVerdict(
        label=label,
        confidence=round(confidence, 2),
        pre_avg=round(pre_avg, 2),
        post_avg=round(post_avg, 2),
    )
