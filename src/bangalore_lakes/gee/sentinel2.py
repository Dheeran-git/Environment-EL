"""Sentinel-2 collection + cloud-filtered composite utilities.

All logic here is pure GEE — nothing downloads or writes files. Callers
pass already-initialized state (i.e. call :func:`session.ensure_initialized`
first) and receive lazy ``ee.Image`` / ``ee.ImageCollection`` objects.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import TYPE_CHECKING, Any

from bangalore_lakes.logging_setup import get_logger

if TYPE_CHECKING:
    import ee

log = get_logger(__name__)

COLLECTION_ID = "COPERNICUS/S2_SR_HARMONIZED"
RGB_BANDS = ("B4", "B3", "B2")
RGB_VIS = {"min": 0, "max": 3000, "gamma": 1.4, "bands": list(RGB_BANDS)}
ANALYTICS_BANDS = ("B3", "B4", "B8", "B11")


@dataclass(frozen=True)
class CompositeInfo:
    """Descriptive metadata about a built composite."""

    start_date: date
    end_date: date
    cloud_pct_threshold: float
    collection_size_prefilter: int
    collection_size_postfilter: int
    image_ids: list[str]
    median_acquisition_date: date | None


def _today_utc() -> date:
    return datetime.now(tz=UTC).date()


def build_s2_collection(
    aoi: ee.Geometry,
    *,
    days: int,
    cloud_pct: float,
    end_date: date | None = None,
) -> tuple[ee.ImageCollection, CompositeInfo]:
    """Return the filtered S2 collection over ``aoi`` and a descriptor.

    The collection is filtered by date, AOI intersection, and
    ``CLOUDY_PIXEL_PERCENTAGE <= cloud_pct``.
    """
    import ee

    end = end_date or _today_utc()
    start = end - timedelta(days=days)
    start_str = start.isoformat()
    end_str = end.isoformat()

    raw = ee.ImageCollection(COLLECTION_ID).filterDate(start_str, end_str).filterBounds(aoi)
    size_pre = int(raw.size().getInfo())

    filtered = raw.filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", cloud_pct))
    size_post = int(filtered.size().getInfo())

    log.info(
        "s2.collection_built",
        start=start_str,
        end=end_str,
        cloud_pct=cloud_pct,
        size_prefilter=size_pre,
        size_postfilter=size_post,
    )
    if size_post == 0:
        log.warning(
            "s2.collection_empty_after_filter",
            remedy="Try --cloud-pct 40 or --days 180 (common during monsoon).",
        )
    elif size_post < 3:
        log.warning("s2.collection_small", size=size_post, remedy="Consider widening filters.")

    image_ids: list[str] = []
    acq_dates: list[date] = []
    if size_post > 0:
        info: dict[str, Any] = filtered.aggregate_array("system:index").getInfo() or []
        image_ids = list(info) if isinstance(info, list) else []
        ts_millis = filtered.aggregate_array("system:time_start").getInfo() or []
        for ms in ts_millis:
            try:
                acq_dates.append(datetime.fromtimestamp(float(ms) / 1000.0, tz=UTC).date())
            except (TypeError, ValueError):
                continue

    median_date = acq_dates[len(acq_dates) // 2] if acq_dates else None

    descriptor = CompositeInfo(
        start_date=start,
        end_date=end,
        cloud_pct_threshold=cloud_pct,
        collection_size_prefilter=size_pre,
        collection_size_postfilter=size_post,
        image_ids=image_ids,
        median_acquisition_date=median_date,
    )
    return filtered, descriptor


def recent_composite(
    aoi: ee.Geometry,
    *,
    days: int,
    cloud_pct: float,
    end_date: date | None = None,
) -> tuple[ee.Image, CompositeInfo]:
    """Return a cloud-filtered median RGB composite over ``aoi``.

    The image is a 3-band RGB selection (B4/B3/B2) ready for visualization
    or clipping. Raises :class:`RuntimeError` if the filtered collection is
    empty.
    """
    collection, descriptor = build_s2_collection(
        aoi, days=days, cloud_pct=cloud_pct, end_date=end_date
    )
    if descriptor.collection_size_postfilter == 0:
        raise RuntimeError(
            f"No Sentinel-2 scenes survived the filter "
            f"(date={descriptor.start_date}..{descriptor.end_date}, "
            f"cloud_pct<={cloud_pct}). Try widening the window or threshold."
        )
    composite = collection.median().select(list(RGB_BANDS))
    return composite, descriptor


def monthly_index_stats(
    aoi: ee.Geometry,
    *,
    start_date: date,
    end_date: date,
    cloud_pct: float,
    scale_m: int,
) -> dict[str, float | int]:
    """Compute NDWI/NDVI/NDTI stats for an AOI over one month window."""
    import ee

    collection = (
        ee.ImageCollection(COLLECTION_ID)
        .filterDate(start_date.isoformat(), end_date.isoformat())
        .filterBounds(aoi)
        .filter(ee.Filter.lte("CLOUDY_PIXEL_PERCENTAGE", cloud_pct))
    )
    scene_count = int(collection.size().getInfo())
    if scene_count == 0:
        return {
            "ndwi": 0.0,
            "ndvi": 0.0,
            "ndti": 0.0,
            "pixel_count": 0,
            "scene_count": 0,
        }

    base = collection.median().select(list(ANALYTICS_BANDS))
    ndwi = base.normalizedDifference(["B3", "B8"]).rename("ndwi")
    ndvi = base.normalizedDifference(["B8", "B4"]).rename("ndvi")
    ndti = base.normalizedDifference(["B11", "B4"]).rename("ndti")
    water_mask = ndwi.gt(0.0)
    stack = ndwi.addBands(ndvi).addBands(ndti).updateMask(water_mask)
    reducer = ee.Reducer.mean().combine(reducer2=ee.Reducer.count(), sharedInputs=True)
    reduced = stack.reduceRegion(
        reducer=reducer,
        geometry=aoi,
        scale=scale_m,
        maxPixels=1_000_000_000,
        bestEffort=True,
    ).getInfo()
    reduced = reduced or {}
    return {
        "ndwi": float(reduced.get("ndwi_mean", 0.0)),
        "ndvi": float(reduced.get("ndvi_mean", 0.0)),
        "ndti": float(reduced.get("ndti_mean", 0.0)),
        "pixel_count": int(reduced.get("ndwi_count", 0)),
        "scene_count": scene_count,
    }
