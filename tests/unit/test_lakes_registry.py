"""Tests for :mod:`bangalore_lakes.lakes.registry`."""

from __future__ import annotations

from pathlib import Path

import pytest

from bangalore_lakes.lakes.models import PollutionLevel
from bangalore_lakes.lakes.registry import load_collection, load_lakes

EXPECTED_IDS = {"bellandur", "varthur", "hebbal", "ulsoor", "sankey", "agara"}


def test_bundled_registry_loads() -> None:
    coll = load_collection()
    assert set(coll.ids()) == EXPECTED_IDS


def test_bundled_registry_has_expected_fields() -> None:
    lakes = load_lakes()
    for lake in lakes:
        assert lake.centroid[0] > 77.4 and lake.centroid[0] < 77.8
        assert lake.centroid[1] > 12.8 and lake.centroid[1] < 13.2
        assert lake.known_pollution_level in PollutionLevel
        assert lake.geometry.type == "Polygon"


def test_ulsoor_has_halasuru_alias() -> None:
    coll = load_collection()
    ulsoor = coll.get("ulsoor")
    assert "Halasuru Lake" in ulsoor.alt_names


def test_bellandur_flagged_severe() -> None:
    coll = load_collection()
    assert coll.get("bellandur").known_pollution_level is PollutionLevel.SEVERE


def test_override_path(sample_geojson_path: Path) -> None:
    coll = load_collection(sample_geojson_path)
    assert coll.ids() == ["alpha", "beta"]


def test_override_missing_path(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        load_collection(tmp_path / "does-not-exist.geojson")


def test_not_a_feature_collection(tmp_path: Path) -> None:
    p = tmp_path / "bad.geojson"
    p.write_text('{"type": "Feature"}', encoding="utf-8")
    with pytest.raises(ValueError, match="FeatureCollection"):
        load_collection(p)


def test_empty_features(tmp_path: Path) -> None:
    p = tmp_path / "empty.geojson"
    p.write_text('{"type": "FeatureCollection", "features": []}', encoding="utf-8")
    with pytest.raises(ValueError, match="zero"):
        load_collection(p)
