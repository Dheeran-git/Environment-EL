"""Interactive map builders using ``geemap.Map``.

``geemap.Map.to_html(filename=...)`` produces a standalone folium-backed HTML
file that opens in any browser — no notebook or server required.
"""

from __future__ import annotations

from collections.abc import Iterable
from pathlib import Path
from typing import TYPE_CHECKING

from bangalore_lakes.gee.sentinel2 import RGB_VIS
from bangalore_lakes.lakes.models import Lake
from bangalore_lakes.logging_setup import get_logger

if TYPE_CHECKING:
    import ee
    import geemap

log = get_logger(__name__)


def _import_geemap() -> geemap:
    import geemap as _geemap

    return _geemap


def build_bangalore_map(
    composite: ee.Image,
    *,
    center_lon: float,
    center_lat: float,
    zoom: int = 11,
    layer_name: str = "Sentinel-2 RGB composite",
) -> geemap.Map:
    """Return a ``geemap.Map`` centered on Bangalore with the composite as a layer."""
    geemap = _import_geemap()
    m = geemap.Map(center=(center_lat, center_lon), zoom=zoom, basemap="HYBRID")
    m.addLayer(composite, RGB_VIS, layer_name)
    m.add_layer_control()
    return m


def build_multi_lake_map(
    base_composite: ee.Image,
    lakes_with_images: Iterable[tuple[Lake, ee.Image, ee.Geometry]],
    *,
    center_lon: float,
    center_lat: float,
    zoom: int = 11,
) -> geemap.Map:
    """Multi-lake overlay map: base composite + per-lake clipped layer + polygon outlines."""
    import ee

    geemap = _import_geemap()
    m = geemap.Map(center=(center_lat, center_lon), zoom=zoom, basemap="HYBRID")
    m.addLayer(base_composite, RGB_VIS, "Bangalore S2 RGB composite")

    for lake, clipped, geom in lakes_with_images:
        m.addLayer(clipped, RGB_VIS, f"{lake.name} (clipped)")
        outline = ee.FeatureCollection([ee.Feature(geom)]).style(
            color="FFFF00", width=2, fillColor="00000000"
        )
        m.addLayer(outline, {}, f"{lake.name} (outline)")

    m.add_layer_control()
    return m


def save_map_html(m: geemap.Map, out_path: Path) -> Path:
    """Persist ``m`` to a standalone HTML file."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    m.to_html(filename=str(out_path))
    log.info("map.saved", path=str(out_path))
    return out_path
