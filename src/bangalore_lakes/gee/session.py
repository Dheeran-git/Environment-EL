"""Cached, idempotent GEE session management.

``ensure_initialized`` calls :func:`bangalore_lakes.gee.auth.initialize_ee` at
most once per process (keyed on the relevant fields of ``Settings``). Re-calls
with an identical configuration are free.
"""

from __future__ import annotations

from functools import lru_cache

from bangalore_lakes.config import Settings
from bangalore_lakes.gee.auth import EEInitInfo, initialize_ee


@lru_cache(maxsize=4)
def _cached_init(
    gee_project_id: str | None,
    gee_service_account_json: str | None,
    gee_service_account_email: str | None,
) -> EEInitInfo:
    synthetic = Settings(
        gee_project_id=gee_project_id,
        gee_service_account_json=gee_service_account_json,
        gee_service_account_email=gee_service_account_email,
    )
    return initialize_ee(synthetic)


def ensure_initialized(settings: Settings) -> EEInitInfo:
    """Idempotently initialize GEE. Returns the same :class:`EEInitInfo`
    on repeat calls within a process."""
    key_json = (
        str(settings.gee_service_account_json)
        if settings.gee_service_account_json is not None
        else None
    )
    return _cached_init(
        settings.gee_project_id,
        key_json,
        settings.gee_service_account_email,
    )


def reset_cache() -> None:
    """Clear the init cache (tests only)."""
    _cached_init.cache_clear()
