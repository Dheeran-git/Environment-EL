"""Compute anomalies and restoration verdicts over time-series artifacts."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from pathlib import Path

from bangalore_lakes.analytics.anomaly import detect_mom_anomalies
from bangalore_lakes.analytics.timeseries import LakeMonthlyObservation, write_timeseries_json
from bangalore_lakes.analytics.verdict import evaluate_restoration_verdict
from bangalore_lakes.commands._common import write_json
from bangalore_lakes.restoration.registry import events_for_lake


@dataclass(frozen=True)
class ComputeInsightsResult:
    run_dir: Path
    manifest_path: Path


def _read_obs(path: Path) -> list[LakeMonthlyObservation]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    result: list[LakeMonthlyObservation] = []
    for row in payload:
        result.append(
            LakeMonthlyObservation(
                lake_id=row["lake_id"],
                month_start=date.fromisoformat(row["month_start"]),
                month_end=date.fromisoformat(row["month_end"]),
                ndwi=float(row["ndwi"]),
                ndvi=float(row["ndvi"]),
                ndti=float(row["ndti"]),
                pollution_score=float(row["pollution_score"]),
                pixel_count=int(row["pixel_count"]),
                scene_count=int(row["scene_count"]),
                anomaly_flag=bool(row.get("anomaly_flag", False)),
                mom_change_pct=(
                    float(row["mom_change_pct"]) if row.get("mom_change_pct") is not None else None
                ),
                restoration_verdict=row.get("restoration_verdict"),
                restoration_confidence=(
                    float(row["restoration_confidence"])
                    if row.get("restoration_confidence") is not None
                    else None
                ),
            )
        )
    return result


def run_compute_insights(*, analytics_run_dir: Path) -> ComputeInsightsResult:
    lakes_root = analytics_run_dir / "lakes"
    if not lakes_root.exists():
        raise FileNotFoundError(f"Missing lakes directory in analytics run: {lakes_root}")

    summary: dict[str, object] = {"lakes": {}}
    for lake_dir in sorted([p for p in lakes_root.iterdir() if p.is_dir()]):
        timeseries_path = lake_dir / "monthly_timeseries.json"
        if not timeseries_path.exists():
            continue
        observations = detect_mom_anomalies(_read_obs(timeseries_path))
        events = events_for_lake(lake_dir.name)
        verdict_label = "insufficient_data"
        verdict_conf = 0.0
        if events:
            verdict = evaluate_restoration_verdict(
                observations,
                event_date=events[-1].event_date,
                window_months=6,
            )
            verdict_label = verdict.label
            verdict_conf = verdict.confidence
            observations = [
                LakeMonthlyObservation(
                    **{
                        **obs.__dict__,
                        "restoration_verdict": verdict.label,
                        "restoration_confidence": verdict.confidence,
                    }
                )
                for obs in observations
            ]

        write_timeseries_json(timeseries_path, observations)
        summary["lakes"][lake_dir.name] = {
            "anomaly_count": sum(1 for o in observations if o.anomaly_flag),
            "restoration_events": len(events),
            "restoration_verdict": verdict_label,
            "restoration_confidence": verdict_conf,
        }

    manifest_path = analytics_run_dir / "insights_manifest.json"
    write_json(manifest_path, summary)
    return ComputeInsightsResult(run_dir=analytics_run_dir, manifest_path=manifest_path)
