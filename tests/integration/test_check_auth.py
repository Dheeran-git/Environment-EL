"""Integration: real ``ee.Initialize`` round-trip.

Gated behind ``EE_TEST_AUTH=1``. Assumes the developer has:
- run ``earthengine authenticate``
- set ``BLWQ_GEE_PROJECT_ID`` (in env or ``.env``)
"""

from __future__ import annotations

import pytest

from bangalore_lakes.config import get_settings
from bangalore_lakes.gee.auth import initialize_ee
from bangalore_lakes.gee.session import ensure_initialized, reset_cache

pytestmark = pytest.mark.integration


def test_initialize_ee_roundtrip() -> None:
    reset_cache()
    settings = get_settings()
    assert settings.gee_project_id, "set BLWQ_GEE_PROJECT_ID to run this test"
    info = initialize_ee(settings)
    assert info.round_trip_value == 1
    assert info.project_id == settings.gee_project_id


def test_ensure_initialized_caches() -> None:
    reset_cache()
    settings = get_settings()
    a = ensure_initialized(settings)
    b = ensure_initialized(settings)
    assert a is b
