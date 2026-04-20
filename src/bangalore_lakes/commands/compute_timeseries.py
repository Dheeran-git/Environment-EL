"""Build historical monthly water-quality time series for lakes."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from bangalore_lakes.analytics.anomaly import detect_mom_anomalies
from bangalore_lakes.analytics.scoring import compute_pollution_score
from bangalore_lakes.analytics.timeseries import (
    LakeMonthlyObservation,
    monthly_windows,
    write_timeseries_csv,
    write_timeseries_json,
)
from bangalore_lakes.commands._common import (
    new_run_id,
    prepare_run_dir,
    safe_host_context,
    write_json,
)
from bangalore_lakes.config import Settings
from bangalore_lakes.gee.sentinel2 import monthly_index_stats
from bangalore_lakes.gee.session import ensure_initialized
from bangalore_lakes.lakes import Lake, load_collection
from bangalore_lakes.logging_setup import get_logger

log = get_logger(__name__)


@dataclass(frozen=True)
class ComputeTimeseriesResult:
    run_id: str
    run_dir: Path
    manifest_path: Path
    csv_path: Path


def _lake_geometry(lake: Lake):  # noqa: ANN001
    import ee

    return ee.Geometry(lake.geometry.model_dump())


def run_compute_timeseries(
    *,
    settings: Settings,
    lake_ids: list[str] | None,
    start_year: int,
    cloud_pct: float,
    scale_m: int,
    output_dir: Path,
) -> ComputeTimeseriesResult:
    init_info = ensure_initialized(settings)
    collection = load_collection(settings.lakes_geojson)
    selected = [lake for lake in collection.lakes if not lake_ids or lake.id in set(lake_ids)]
    if not selected:
        raise ValueError("No lakes selected for time-series computation.")

    run_id = new_run_id()
    run_dir = prepare_run_dir(output_dir, "analytics", run_id)
    end_date = datetime.now(tz=UTC).date()
    windows = monthly_windows(start_year, end_date)

    all_obs: list[LakeMonthlyObservation] = []
    lake_counts: dict[str, int] = {}
    for lake in selected:
        geom = _lake_geometry(lake)
        lake_obs: list[LakeMonthlyObservation] = []
        for start, end in windows:
            stats = monthly_index_stats(
                geom,
                start_date=start,
                end_date=end,
                cloud_pct=cloud_pct,
                scale_m=scale_m,
            )
            score = compute_pollution_score(
                ndwi=float(stats["ndwi"]),
                ndvi=float(stats["ndvi"]),
                ndti=float(stats["ndti"]),
            )
            lake_obs.append(
                LakeMonthlyObservation(
                    lake_id=lake.id,
                    month_start=start,
                    month_end=end,
                    ndwi=float(stats["ndwi"]),
                    ndvi=float(stats["ndvi"]),
                    ndti=float(stats["ndti"]),
                    pollution_score=score,
                    pixel_count=int(stats["pixel_count"]),
                    scene_count=int(stats["scene_count"]),
                )
            )
        lake_obs = detect_mom_anomalies(lake_obs)
        all_obs.extend(lake_obs)
        lake_counts[lake.id] = len(lake_obs)
        write_timeseries_json(run_dir / "lakes" / lake.id / "monthly_timeseries.json", lake_obs)

    csv_path = write_timeseries_csv(run_dir / "all_lakes_monthly.csv", all_obs)
    manifest_path = run_dir / "timeseries_manifest.json"
    write_json(
        manifest_path,
        {
            "run_id": run_id,
            "phase": "analytics-timeseries",
            "start_year": start_year,
            "end_date": end_date.isoformat(),
            "cloud_pct_threshold": cloud_pct,
            "scale_m": scale_m,
            "lake_counts": lake_counts,
            "records_total": len(all_obs),
            "artifacts": {
                "csv": csv_path.relative_to(run_dir).as_posix(),
                "lakes_dir": "lakes/",
            },
            "gee_project_id": init_info.project_id,
            "gee_account": init_info.account,
            "host": safe_host_context(),
        },
    )
    log.info("analytics.timeseries.complete", run_id=run_id, records=len(all_obs))
    return ComputeTimeseriesResult(
        run_id=run_id,
        run_dir=run_dir,
        manifest_path=manifest_path,
        csv_path=csv_path,
    )
