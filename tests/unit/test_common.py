"""Tests for shared helpers in :mod:`bangalore_lakes.commands._common`."""

from __future__ import annotations

import json
import re
from pathlib import Path

from bangalore_lakes.commands._common import (
    new_run_id,
    package_version,
    prepare_run_dir,
    safe_host_context,
    write_json,
)


def test_run_id_format() -> None:
    rid = new_run_id()
    assert re.fullmatch(r"\d{8}T\d{6}Z", rid)


def test_prepare_run_dir_creates_hierarchy(tmp_path: Path) -> None:
    rid = "20260417T120000Z"
    run_dir = prepare_run_dir(tmp_path, "day1", rid)
    assert run_dir == tmp_path / "day1" / rid
    assert run_dir.is_dir()


def test_write_json_roundtrip(tmp_path: Path) -> None:
    target = tmp_path / "nested" / "out.json"
    write_json(target, {"a": 1, "b": [1, 2, 3]})
    assert target.exists()
    assert json.loads(target.read_text()) == {"a": 1, "b": [1, 2, 3]}


def test_safe_host_context_shape() -> None:
    ctx = safe_host_context()
    assert ctx["package_version"] == package_version()
    assert "pwd" in ctx
    assert "user" in ctx
    assert "git_sha" in ctx  # value may be None
