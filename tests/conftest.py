"""Shared pytest fixtures and marker gating."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

_INTEGRATION_ENV = "EE_TEST_AUTH"


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Auto-skip ``integration``-marked tests unless ``EE_TEST_AUTH=1``."""
    if os.environ.get(_INTEGRATION_ENV) == "1":
        return
    skip = pytest.mark.skip(
        reason=f"integration tests require {_INTEGRATION_ENV}=1 and real GEE auth"
    )
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip)


@pytest.fixture
def sample_geojson_path(tmp_path: Path) -> Path:
    """A tiny on-disk GeoJSON with two lakes; safe to use in unit tests."""
    path = tmp_path / "tiny.geojson"
    path.write_text(
        """{
          "type": "FeatureCollection",
          "metadata": {"schema_version": 1, "source": "test"},
          "features": [
            {
              "type": "Feature",
              "properties": {
                "id": "alpha",
                "name": "Alpha Lake",
                "centroid": [77.6, 12.97],
                "known_pollution_level": "moderate",
                "last_verified": "2026-04-17"
              },
              "geometry": {
                "type": "Polygon",
                "coordinates": [[[77.59,12.96],[77.61,12.96],[77.61,12.98],[77.59,12.98],[77.59,12.96]]]
              }
            },
            {
              "type": "Feature",
              "properties": {
                "id": "beta",
                "name": "Beta Lake",
                "centroid": [77.7, 12.94],
                "known_pollution_level": "severe"
              },
              "geometry": {
                "type": "Polygon",
                "coordinates": [[[77.69,12.93],[77.71,12.93],[77.71,12.95],[77.69,12.95],[77.69,12.93]]]
              }
            }
          ]
        }""",
        encoding="utf-8",
    )
    return path


@pytest.fixture(autouse=True)
def _clear_blwq_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Prevent a developer's ``.env`` or shell env from leaking into unit tests."""
    for key in list(os.environ):
        if key.startswith("BLWQ_"):
            monkeypatch.delenv(key, raising=False)
