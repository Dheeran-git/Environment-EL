"""Synchronous GEE exports — PNG thumbnails and GeoTIFFs.

We deliberately avoid ``Export.image.toDrive`` (async, pushes to Google Drive,
wrong UX for a CLI). All exports here go through the sync HTTP path:
``getThumbURL`` for PNG, ``getDownloadURL`` for GeoTIFF. Both are wrapped in
``tenacity`` retries because GEE occasionally 502s.

Our lakes are all < 4 km², well under the ~32 MB / ~10k×10k sync limits. If a
future lake exceeds these limits, add a `Export.image.toDrive` path.
"""

from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass
from pathlib import Path
from typing import TYPE_CHECKING

import requests
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from bangalore_lakes.gee.sentinel2 import RGB_VIS
from bangalore_lakes.logging_setup import get_logger

if TYPE_CHECKING:
    import ee

log = get_logger(__name__)

RequestError = (requests.RequestException,)

# stdlib logger is what tenacity wants
import logging as _stdlib_logging  # noqa: E402

_stdlib_log = _stdlib_logging.getLogger(__name__)


@dataclass(frozen=True)
class ExportedArtifact:
    """Descriptor for a file written to disk."""

    path: Path
    sha256: str
    size_bytes: int


def _sha256_and_size(data: bytes) -> tuple[str, int]:
    return hashlib.sha256(data).hexdigest(), len(data)


def _write_bytes(path: Path, data: bytes) -> ExportedArtifact:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    digest, size = _sha256_and_size(data)
    return ExportedArtifact(path=path, sha256=digest, size_bytes=size)


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1.0, min=1.0, max=8.0),
    retry=retry_if_exception_type(RequestError),
    before_sleep=before_sleep_log(_stdlib_log, _stdlib_logging.WARNING),
    reraise=True,
)
def _download_bytes(url: str, *, timeout: float = 120.0) -> bytes:
    response = requests.get(url, timeout=timeout)
    response.raise_for_status()
    return response.content


def clipped_thumb_png(
    image: ee.Image,
    *,
    region: ee.Geometry,
    out_path: Path,
    dimensions: int = 1024,
    vis_params: dict | None = None,
) -> ExportedArtifact:
    """Render ``image`` as a PNG thumbnail over ``region`` and save to ``out_path``."""
    vis = dict(vis_params or RGB_VIS)
    params = {
        "region": region,
        "dimensions": dimensions,
        "format": "png",
        **vis,
    }
    url = image.getThumbURL(params)
    log.debug("gee.thumb_url", url=url[:120] + ("..." if len(url) > 120 else ""))
    data = _download_bytes(url)
    return _write_bytes(out_path, data)


def clipped_geotiff(
    image: ee.Image,
    *,
    region: ee.Geometry,
    out_path: Path,
    scale: int = 10,
    crs: str = "EPSG:32643",
) -> ExportedArtifact:
    """Download ``image`` clipped to ``region`` as a GeoTIFF."""
    params = {
        "region": region,
        "scale": scale,
        "crs": crs,
        "format": "GEO_TIFF",
        "filePerBand": False,
    }
    url = image.getDownloadURL(params)
    log.debug("gee.geotiff_url", url=url[:120] + ("..." if len(url) > 120 else ""))
    data = _download_bytes(url)
    return _write_bytes(out_path, data)


def hash_file(path: Path, *, chunk: int = 65536) -> str:
    """SHA256 of a file on disk (post-write verification)."""
    h = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            block = fh.read(chunk)
            if not block:
                break
            h.update(block)
    return h.hexdigest()


def bytes_to_artifact(data: bytes, out_path: Path) -> ExportedArtifact:
    """Helper for tests: write arbitrary bytes and return an artifact descriptor."""
    _ = io  # keep import (used by tests via monkeypatch)
    return _write_bytes(out_path, data)
