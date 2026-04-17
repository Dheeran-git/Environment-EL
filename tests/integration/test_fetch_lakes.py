"""Integration: Day 2 pipeline end-to-end against real GEE.

We process only ``sankey`` (the smallest lake) to keep the test fast.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from bangalore_lakes.commands.fetch_lakes import run_fetch_lakes
from bangalore_lakes.config import get_settings

pytestmark = pytest.mark.integration


def test_day2_produces_per_lake_artifacts(tmp_path: Path) -> None:
    settings = get_settings()
    assert settings.gee_project_id, "set BLWQ_GEE_PROJECT_ID to run this test"

    result = run_fetch_lakes(
        settings=settings,
        lake_ids=["sankey"],
        days=180,
        cloud_pct=40.0,
        scale=10,
        output_dir=tmp_path,
        skip_geotiff=False,
    )

    assert len(result.lake_artifacts) == 1
    art = result.lake_artifacts[0]
    assert art.lake_id == "sankey"
    assert art.thumb_png.is_file() and art.thumb_png.stat().st_size > 1024
    assert art.geotiff is not None and art.geotiff.is_file()
    assert art.metadata.is_file()

    lake_md = json.loads(art.metadata.read_text())
    assert lake_md["lake_id"] == "sankey"
    assert lake_md["export"]["scale_m"] == 10

    assert result.overlay_html.is_file() and result.overlay_html.stat().st_size > 1024
    manifest = json.loads(result.manifest.read_text())
    assert manifest["phase"] == "day2"
    assert manifest["lakes"][0]["id"] == "sankey"
