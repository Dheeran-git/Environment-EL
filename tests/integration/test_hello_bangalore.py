"""Integration: Day 1 pipeline end-to-end against real GEE."""

from __future__ import annotations

from pathlib import Path

import pytest

from bangalore_lakes.commands.hello_bangalore import run_hello_bangalore
from bangalore_lakes.config import get_settings

pytestmark = pytest.mark.integration


def test_day1_produces_artifacts(tmp_path: Path) -> None:
    settings = get_settings()
    assert settings.gee_project_id, "set BLWQ_GEE_PROJECT_ID to run this test"

    result = run_hello_bangalore(
        settings=settings,
        days=180,
        cloud_pct=40.0,
        output_dir=tmp_path,
    )

    assert result.run_dir.is_dir()
    assert result.html_path.is_file() and result.html_path.stat().st_size > 1024
    assert result.thumb_path.is_file() and result.thumb_path.stat().st_size > 1024
    assert result.metadata_path.is_file()

    import json

    md = json.loads(result.metadata_path.read_text())
    assert md["phase"] == "day1"
    assert md["collection_size_postfilter"] >= 1
