"""Tests for :mod:`bangalore_lakes.lakes.models`."""

from __future__ import annotations

import pytest

from bangalore_lakes.lakes.models import Lake, LakeCollection, PollutionLevel


def _good_feature() -> dict:
    return {
        "type": "Feature",
        "properties": {
            "id": "demo",
            "name": "Demo Lake",
            "centroid": [77.5, 13.0],
            "known_pollution_level": "high",
        },
        "geometry": {
            "type": "Polygon",
            "coordinates": [
                [[77.49, 12.99], [77.51, 12.99], [77.51, 13.01], [77.49, 13.01], [77.49, 12.99]]
            ],
        },
    }


def test_from_feature_happy_path() -> None:
    lake = Lake.from_geojson_feature(_good_feature())
    assert lake.id == "demo"
    assert lake.name == "Demo Lake"
    assert lake.known_pollution_level is PollutionLevel.HIGH
    assert lake.centroid == (77.5, 13.0)
    assert lake.geometry.type == "Polygon"


def test_id_must_be_slug() -> None:
    feat = _good_feature()
    feat["properties"]["id"] = "Not a slug!"
    with pytest.raises(ValueError):
        Lake.from_geojson_feature(feat)


def test_centroid_lon_out_of_range() -> None:
    feat = _good_feature()
    feat["properties"]["centroid"] = [200, 13.0]
    with pytest.raises(ValueError, match="longitude"):
        Lake.from_geojson_feature(feat)


def test_centroid_lat_out_of_range() -> None:
    feat = _good_feature()
    feat["properties"]["centroid"] = [77.5, -120.0]
    with pytest.raises(ValueError, match="latitude"):
        Lake.from_geojson_feature(feat)


def test_missing_geometry() -> None:
    feat = _good_feature()
    feat.pop("geometry")
    with pytest.raises(ValueError, match="geometry"):
        Lake.from_geojson_feature(feat)


def test_geometry_type_restricted() -> None:
    feat = _good_feature()
    feat["geometry"] = {"type": "Point", "coordinates": [77.5, 13.0]}
    with pytest.raises(ValueError):
        Lake.from_geojson_feature(feat)


def test_duplicate_ids_rejected() -> None:
    a = Lake.from_geojson_feature(_good_feature())
    b = Lake.from_geojson_feature(_good_feature())
    with pytest.raises(ValueError, match="duplicate"):
        LakeCollection(lakes=[a, b])


def test_get_and_ids() -> None:
    a = Lake.from_geojson_feature(_good_feature())
    feat2 = _good_feature()
    feat2["properties"]["id"] = "other"
    b = Lake.from_geojson_feature(feat2)
    coll = LakeCollection(lakes=[a, b])
    assert coll.ids() == ["demo", "other"]
    assert coll.get("other").id == "other"
    with pytest.raises(KeyError):
        coll.get("missing")
