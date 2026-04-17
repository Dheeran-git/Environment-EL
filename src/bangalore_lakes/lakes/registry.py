"""Load the curated lake registry from a bundled or user-supplied GeoJSON."""

from __future__ import annotations

import json
from importlib import resources
from pathlib import Path

from bangalore_lakes.lakes.models import Lake, LakeCollection, LakeCollectionMetadata

BUNDLED_PACKAGE = "bangalore_lakes.data.lakes"
BUNDLED_FILENAME = "bangalore_lakes.geojson"


def _read_bundled() -> str:
    resource = resources.files(BUNDLED_PACKAGE).joinpath(BUNDLED_FILENAME)
    return resource.read_text(encoding="utf-8")


def _read_path(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Lakes GeoJSON not found: {path}")
    return path.read_text(encoding="utf-8")


def load_collection(path: Path | None = None) -> LakeCollection:
    """Return the full :class:`LakeCollection`, bundled or from an override path."""
    raw = _read_path(path) if path is not None else _read_bundled()
    data = json.loads(raw)
    if data.get("type") != "FeatureCollection":
        raise ValueError(f"expected a GeoJSON FeatureCollection; got type={data.get('type')!r}")
    metadata = LakeCollectionMetadata.model_validate(data.get("metadata") or {})
    lakes = [Lake.from_geojson_feature(feat) for feat in data.get("features", [])]
    if not lakes:
        raise ValueError("lake registry contains zero features")
    return LakeCollection(metadata=metadata, lakes=lakes)


def load_lakes(path: Path | None = None) -> list[Lake]:
    """Convenience: return just the list of :class:`Lake` objects."""
    return load_collection(path).lakes
