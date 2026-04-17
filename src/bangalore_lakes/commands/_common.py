"""Shared helpers for command modules: run-id generation, metadata writing."""

from __future__ import annotations

import json
import os
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from bangalore_lakes import __version__


def new_run_id() -> str:
    """Compact ISO-UTC timestamp, e.g. ``20260417T153012Z``."""
    now = datetime.now(tz=UTC)
    return now.strftime("%Y%m%dT%H%M%SZ")


def git_sha() -> str | None:
    """Return the short git SHA of the repo HEAD, or None if not a repo."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
            timeout=5,
        )
    except (subprocess.SubprocessError, FileNotFoundError, OSError):
        return None
    sha = result.stdout.strip()
    return sha or None


def prepare_run_dir(root: Path, phase: str, run_id: str) -> Path:
    """Create ``<root>/<phase>/<run_id>/`` and return the Path."""
    run_dir = root / phase / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir


def write_json(path: Path, data: dict[str, Any]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, default=str), encoding="utf-8")
    return path


def package_version() -> str:
    return __version__


def safe_host_context() -> dict[str, Any]:
    """Non-sensitive host metadata for run manifests."""
    return {
        "user": os.environ.get("USER") or os.environ.get("LOGNAME"),
        "pwd": str(Path.cwd()),
        "package_version": package_version(),
        "git_sha": git_sha(),
    }
