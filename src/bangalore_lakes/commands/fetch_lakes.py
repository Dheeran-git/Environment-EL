"""Day 2 orchestration — clip Sentinel-2 composite to each lake and export."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

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
from bangalore_lakes.lakes import Lake, load_collection
from bangalore_lakes.logging_setup import get_logger
from bangalore_lakes.maps.render import build_multi_lake_map, save_map_html

if TYPE_CHECKING:
    import ee

log = get_logger(__name__)


@dataclass(frozen=True)
class LakeArtifacts:
    lake_id: str
    dir: Path
    thumb_png: Path
    geotiff: Path | None
    metadata: Path


@dataclass(frozen=True)
class FetchLakesResult:
    run_id: str
    run_dir: Path
    overlay_html: Path
    manifest: Path
    lake_artifacts: list[LakeArtifacts]


def _select_lakes(all_lakes: list[Lake], lake_ids: Iterable[str] | None) -> list[Lake]:
    if not lake_ids:
        return all_lakes
    wanted = list(lake_ids)
    id_map = {lake.id: lake for lake in all_lakes}
    unknown = [i for i in wanted if i not in id_map]
    if unknown:
        known = ", ".join(sorted(id_map))
        raise ValueError(f"unknown lake id(s): {unknown}. Known: {known}")
    return [id_map[i] for i in wanted]


def _lake_geometry(lake: Lake) -> ee.Geometry:
    import ee

    return ee.Geometry(lake.geometry.model_dump())


def _aoi_from_lakes(lakes: Iterable[Lake]) -> ee.Geometry:
    """A small padded bbox that covers all the selected lake centroids + extents."""
    import ee

    import_lakes = list(lakes)
    lons = [lake.centroid[0] for lake in import_lakes]
    lats = [lake.centroid[1] for lake in import_lakes]
    pad = 0.05  # ~5 km
    west, east = min(lons) - pad, max(lons) + pad
    south, north = min(lats) - pad, max(lats) + pad
    return ee.Geometry.Rectangle([west, south, east, north], proj="EPSG:4326", geodesic=False)


def run_fetch_lakes(
    *,
    settings: Settings,
    lake_ids: list[str] | None,
    days: int,
    cloud_pct: float,
    scale: int,
    output_dir: Path,
    skip_geotiff: bool,
) -> FetchLakesResult:
    """Run the Day 2 pipeline and return the manifest of artifacts."""
    init_info = ensure_initialized(settings)
    collection = load_collection(settings.lakes_geojson)
    selected = _select_lakes(collection.lakes, lake_ids)

    run_id = new_run_id()
    run_dir = prepare_run_dir(output_dir, "day2", run_id)

    log.info(
        "day2.start",
        run_id=run_id,
        run_dir=str(run_dir),
        lakes=[lake.id for lake in selected],
        days=days,
        cloud_pct=cloud_pct,
        scale=scale,
    )

    aoi = _aoi_from_lakes(selected)
    composite, descriptor = sentinel2.recent_composite(aoi, days=days, cloud_pct=cloud_pct)

    lake_artifacts: list[LakeArtifacts] = []
    overlay_inputs: list[tuple[Lake, ee.Image, ee.Geometry]] = []

    for lake in selected:
        lake_dir = run_dir / "lakes" / lake.id
        lake_dir.mkdir(parents=True, exist_ok=True)

        geom = _lake_geometry(lake)
        clipped = composite.clip(geom)

        thumb_path = lake_dir / "thumb.png"
        thumb_artifact = gee_export.clipped_thumb_png(
            clipped,
            region=geom,
            out_path=thumb_path,
            dimensions=1024,
        )

        geotiff_path: Path | None = None
        geotiff_sha: str | None = None
        geotiff_bytes: int | None = None
        if not skip_geotiff:
            geotiff_path = lake_dir / "clipped.tif"
            geotiff_artifact = gee_export.clipped_geotiff(
                clipped,
                region=geom,
                out_path=geotiff_path,
                scale=scale,
                crs=settings.default_crs,
            )
            geotiff_sha = geotiff_artifact.sha256
            geotiff_bytes = geotiff_artifact.size_bytes

        lake_metadata_path = lake_dir / "metadata.json"
        write_json(
            lake_metadata_path,
            {
                "lake_id": lake.id,
                "name": lake.name,
                "alt_names": lake.alt_names,
                "ward": lake.ward,
                "bbmp_ward_no": lake.bbmp_ward_no,
                "centroid": list(lake.centroid),
                "official_area_ha": lake.official_area_ha,
                "known_pollution_level": lake.known_pollution_level.value,
                "composite": {
                    "start_date": descriptor.start_date.isoformat(),
                    "end_date": descriptor.end_date.isoformat(),
                    "cloud_pct_threshold": cloud_pct,
                    "collection_size_postfilter": descriptor.collection_size_postfilter,
                    "median_acquisition_date": (
                        descriptor.median_acquisition_date.isoformat()
                        if descriptor.median_acquisition_date
                        else None
                    ),
                    "image_ids": descriptor.image_ids,
                },
                "export": {
                    "scale_m": scale,
                    "crs": settings.default_crs,
                    "thumb_png_sha256": thumb_artifact.sha256,
                    "thumb_png_bytes": thumb_artifact.size_bytes,
                    "geotiff_sha256": geotiff_sha,
                    "geotiff_bytes": geotiff_bytes,
                },
            },
        )

        lake_artifacts.append(
            LakeArtifacts(
                lake_id=lake.id,
                dir=lake_dir,
                thumb_png=thumb_path,
                geotiff=geotiff_path,
                metadata=lake_metadata_path,
            )
        )
        overlay_inputs.append((lake, clipped, geom))

    overlay_html = run_dir / "multi_lake_overlay.html"
    save_map_html(
        build_multi_lake_map(
            composite,
            overlay_inputs,
            center_lon=settings.bangalore_center_lon,
            center_lat=settings.bangalore_center_lat,
        ),
        overlay_html,
    )

    manifest_path = run_dir / "run_manifest.json"
    write_json(
        manifest_path,
        {
            "run_id": run_id,
            "phase": "day2",
            "days": days,
            "cloud_pct_threshold": cloud_pct,
            "scale_m": scale,
            "crs": settings.default_crs,
            "lakes": [
                {
                    "id": art.lake_id,
                    "dir": str(art.dir.relative_to(run_dir)),
                    "thumb_png": str(art.thumb_png.relative_to(run_dir)),
                    "geotiff": (str(art.geotiff.relative_to(run_dir)) if art.geotiff else None),
                    "metadata": str(art.metadata.relative_to(run_dir)),
                }
                for art in lake_artifacts
            ],
            "overlay_html": str(overlay_html.relative_to(run_dir)),
            "gee_project_id": init_info.project_id,
            "gee_account": init_info.account,
            "composite": {
                "start_date": descriptor.start_date.isoformat(),
                "end_date": descriptor.end_date.isoformat(),
                "collection_size_postfilter": descriptor.collection_size_postfilter,
                "image_ids": descriptor.image_ids,
            },
            "host": safe_host_context(),
        },
    )

    log.info("day2.complete", run_id=run_id, lakes_processed=len(lake_artifacts))

    return FetchLakesResult(
        run_id=run_id,
        run_dir=run_dir,
        overlay_html=overlay_html,
        manifest=manifest_path,
        lake_artifacts=lake_artifacts,
    )
