from __future__ import annotations

from bangalore_lakes.restoration.registry import events_for_lake, load_registry


def test_load_registry_has_events() -> None:
    registry = load_registry()
    assert registry.events


def test_events_for_lake_sorted() -> None:
    events = events_for_lake("bellandur")
    assert events
    assert events == sorted(events, key=lambda e: e.event_date)
