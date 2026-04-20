from __future__ import annotations

from datetime import date

from bangalore_lakes.analytics.anomaly import detect_mom_anomalies
from bangalore_lakes.analytics.scoring import compute_pollution_score
from bangalore_lakes.analytics.timeseries import LakeMonthlyObservation, monthly_windows
from bangalore_lakes.analytics.verdict import evaluate_restoration_verdict


def test_compute_pollution_score_bounds() -> None:
    score = compute_pollution_score(ndwi=0.2, ndvi=0.1, ndti=0.3)
    assert 0.0 <= score <= 100.0


def test_monthly_windows_contains_recent() -> None:
    windows = monthly_windows(2024, date(2024, 3, 1))
    assert windows[0][0] == date(2024, 1, 1)
    assert windows[-1][0] == date(2024, 3, 1)


def test_detect_mom_anomalies_flags_large_jump() -> None:
    obs = [
        LakeMonthlyObservation(
            lake_id="bellandur",
            month_start=date(2024, 1, 1),
            month_end=date(2024, 2, 1),
            ndwi=0.0,
            ndvi=0.0,
            ndti=0.0,
            pollution_score=10.0,
            pixel_count=100,
            scene_count=2,
        ),
        LakeMonthlyObservation(
            lake_id="bellandur",
            month_start=date(2024, 2, 1),
            month_end=date(2024, 3, 1),
            ndwi=0.0,
            ndvi=0.0,
            ndti=0.0,
            pollution_score=15.0,
            pixel_count=100,
            scene_count=2,
        ),
    ]
    updated = detect_mom_anomalies(obs, threshold_pct=20.0)
    assert updated[1].anomaly_flag is True


def test_restoration_verdict_improved() -> None:
    rows = []
    for i in range(1, 13):
        rows.append(
            LakeMonthlyObservation(
                lake_id="bellandur",
                month_start=date(2023, i, 1),
                month_end=date(2023, min(i + 1, 12), 1),
                ndwi=0.0,
                ndvi=0.0,
                ndti=0.0,
                pollution_score=80.0 if i <= 6 else 50.0,
                pixel_count=100,
                scene_count=2,
            )
        )
    verdict = evaluate_restoration_verdict(rows, event_date=date(2023, 7, 1), window_months=6)
    assert verdict.label == "improved"
