"""Time-series data models and writers."""

from __future__ import annotations

import csv
import json
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path


@dataclass(frozen=True)
class LakeMonthlyObservation:
    lake_id: str
    month_start: date
    month_end: date
    ndwi: float
    ndvi: float
    ndti: float
    pollution_score: float
    pixel_count: int
    scene_count: int
    anomaly_flag: bool = False
    mom_change_pct: float | None = None
    restoration_verdict: str | None = None
    restoration_confidence: float | None = None


def monthly_windows(start_year: int, end_inclusive: date) -> list[tuple[date, date]]:
    windows: list[tuple[date, date]] = []
    y = start_year
    m = 1
    while True:
        start = date(y, m, 1)
        if start > end_inclusive:
            break
        nxt = date(y + 1, 1, 1) if m == 12 else date(y, m + 1, 1)
        end = min(nxt, end_inclusive)
        windows.append((start, end))
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return windows


def write_timeseries_json(path: Path, observations: list[LakeMonthlyObservation]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = [
        {
            **asdict(obs),
            "month_start": obs.month_start.isoformat(),
            "month_end": obs.month_end.isoformat(),
        }
        for obs in observations
    ]
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def write_timeseries_csv(path: Path, observations: list[LakeMonthlyObservation]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    fields = (
        list(asdict(observations[0]).keys())
        if observations
        else list(
            asdict(
                LakeMonthlyObservation(
                    lake_id="",
                    month_start=date(2000, 1, 1),
                    month_end=date(2000, 2, 1),
                    ndwi=0.0,
                    ndvi=0.0,
                    ndti=0.0,
                    pollution_score=0.0,
                    pixel_count=0,
                    scene_count=0,
                )
            ).keys()
        )
    )
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for obs in observations:
            row = asdict(obs)
            row["month_start"] = obs.month_start.isoformat()
            row["month_end"] = obs.month_end.isoformat()
            writer.writerow(row)
    return path
