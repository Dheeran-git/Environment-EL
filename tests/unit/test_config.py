"""Tests for :mod:`bangalore_lakes.config`."""

from __future__ import annotations

from pathlib import Path

import pytest

from bangalore_lakes.config import Settings, get_settings


def test_defaults_without_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir("/tmp")  # avoid picking up a .env from repo
    s = get_settings()
    assert s.default_days == 90
    assert s.default_cloud_pct == 20.0
    assert s.default_scale_m == 10
    assert s.default_crs == "EPSG:32643"
    assert s.output_dir == Path("outputs")
    assert s.log_level == "INFO"
    assert s.bangalore_center_lat == pytest.approx(12.9716)


def test_env_vars_are_prefixed(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BLWQ_GEE_PROJECT_ID", "my-project")
    monkeypatch.setenv("BLWQ_DEFAULT_DAYS", "30")
    monkeypatch.setenv("BLWQ_DEFAULT_CLOUD_PCT", "45")
    monkeypatch.chdir("/tmp")
    s = get_settings()
    assert s.gee_project_id == "my-project"
    assert s.default_days == 30
    assert s.default_cloud_pct == 45.0


def test_log_level_validated(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir("/tmp")
    with pytest.raises(ValueError, match="log_level"):
        Settings(log_level="LOUD")


def test_log_level_uppercased(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir("/tmp")
    s = Settings(log_level="debug")
    assert s.log_level == "DEBUG"


def test_crs_validated(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir("/tmp")
    with pytest.raises(ValueError, match="EPSG"):
        Settings(default_crs="wgs84")


def test_bangalore_bbox(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir("/tmp")
    s = Settings(bangalore_bbox_halfwidth_deg=0.1)
    west, south, east, north = s.bangalore_bbox()
    assert east - west == pytest.approx(0.2)
    assert north - south == pytest.approx(0.2)
    assert west < s.bangalore_center_lon < east
    assert south < s.bangalore_center_lat < north


def test_default_days_range(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir("/tmp")
    with pytest.raises(ValueError):
        Settings(default_days=0)
    with pytest.raises(ValueError):
        Settings(default_days=10_000)
