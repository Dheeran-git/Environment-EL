"""Day 1 orchestration — Sentinel-2 cloud-filtered composite over Bangalore."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from bangalore_lakes.commands._common import (
    new_run_id,
    prepare_run_dir,
    safe_host_context,
    write_json,
)
from bangalore_lakes.config import Settings
from bangalore_lakes.gee import export as gee_export
from bangalore_lakes.gee import sentinel2
from bangalore_lakes.gee.session import ensure_initialized
from bangalore_lakes.logging_setup import get_logger
from bangalore_lakes.maps.render import build_bangalore_map, save_map_html

log = get_logger(__name__)


@dataclass(frozen=True)
class HelloBangaloreResult:
    run_id: str
    run_dir: Path
    html_path: Path
    thumb_path: Path
    metadata_path: Path


def run_hello_bangalore(
    *,
    settings: Settings,
    days: int,
    cloud_pct: float,
    output_dir: Path,
) -> HelloBangaloreResult:
    """Run the Day 1 pipeline and return paths to the generated artifacts."""
    init_info = ensure_initialized(settings)
    run_id = new_run_id()
    run_dir = prepare_run_dir(output_dir, "day1", run_id)

    log.info(
        "day1.start",
        run_id=run_id,
        run_dir=str(run_dir),
        days=days,
        cloud_pct=cloud_pct,
    )

    import ee

    west, south, east, north = settings.bangalore_bbox()
    aoi = ee.Geometry.Rectangle([west, south, east, north], proj="EPSG:4326", geodesic=False)

    composite, descriptor = sentinel2.recent_composite(aoi, days=days, cloud_pct=cloud_pct)

    html_path = run_dir / "bangalore_s2_composite.html"
    thumb_path = run_dir / "bangalore_s2_composite_thumb.png"
    metadata_path = run_dir / "run_metadata.json"

    save_map_html(
        build_bangalore_map(
            composite,
            center_lon=settings.bangalore_center_lon,
            center_lat=settings.bangalore_center_lat,
        ),
        html_path,
    )

    thumb_artifact = gee_export.clipped_thumb_png(
        composite.clip(aoi),
        region=aoi,
        out_path=thumb_path,
        dimensions=1024,
    )

    metadata = {
        "run_id": run_id,
        "phase": "day1",
        "aoi_bbox_wgs84": [west, south, east, north],
        "days": days,
        "cloud_pct_threshold": cloud_pct,
        "start_date": descriptor.start_date.isoformat(),
        "end_date": descriptor.end_date.isoformat(),
        "collection_size_prefilter": descriptor.collection_size_prefilter,
        "collection_size_postfilter": descriptor.collection_size_postfilter,
        "median_acquisition_date": (
            descriptor.median_acquisition_date.isoformat()
            if descriptor.median_acquisition_date
            else None
        ),
        "image_ids": descriptor.image_ids,
        "scale_m": settings.default_scale_m,
        "crs": settings.default_crs,
        "vis_params": sentinel2.RGB_VIS,
        "gee_project_id": init_info.project_id,
        "gee_account": init_info.account,
        "artifacts": {
            "html": str(html_path.relative_to(run_dir)),
            "thumb_png": str(thumb_path.relative_to(run_dir)),
            "thumb_png_sha256": thumb_artifact.sha256,
            "thumb_png_bytes": thumb_artifact.size_bytes,
        },
        "host": safe_host_context(),
        "settings": {
            "bangalore_center": [
                settings.bangalore_center_lon,
                settings.bangalore_center_lat,
            ],
            "bbox_halfwidth_deg": settings.bangalore_bbox_halfwidth_deg,
        },
    }
    write_json(metadata_path, metadata)

    log.info(
        "day1.complete",
        run_id=run_id,
        html=str(html_path),
        thumb=str(thumb_path),
        images_used=descriptor.collection_size_postfilter,
    )

    return HelloBangaloreResult(
        run_id=run_id,
        run_dir=run_dir,
        html_path=html_path,
        thumb_path=thumb_path,
        metadata_path=metadata_path,
    )
