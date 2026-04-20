"""Load restoration events from bundled JSON."""

from __future__ import annotations

import json
from importlib import resources
from pathlib import Path

from bangalore_lakes.restoration.models import RestorationEvent, RestorationRegistry

BUNDLED_PACKAGE = "bangalore_lakes.data.restoration"
BUNDLED_FILENAME = "restoration_events.json"


def _read_bundled() -> str:
    resource = resources.files(BUNDLED_PACKAGE).joinpath(BUNDLED_FILENAME)
    return resource.read_text(encoding="utf-8")


def _read_path(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Restoration events JSON not found: {path}")
    return path.read_text(encoding="utf-8")


def load_registry(path: Path | None = None) -> RestorationRegistry:
    raw = _read_path(path) if path is not None else _read_bundled()
    payload = json.loads(raw)
    return RestorationRegistry.model_validate(payload)


def events_for_lake(lake_id: str, path: Path | None = None) -> list[RestorationEvent]:
    registry = load_registry(path)
    return sorted([e for e in registry.events if e.lake_id == lake_id], key=lambda e: e.event_date)
