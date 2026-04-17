"""Earth Engine authentication.

Supports two paths:

1. **User auth** (default) — relies on credentials cached by
   ``earthengine authenticate``. Requires ``BLWQ_GEE_PROJECT_ID`` so that
   ``ee.Initialize(project=...)`` has a Cloud project to bill against.
2. **Service-account auth** — triggered by setting
   ``BLWQ_GEE_SERVICE_ACCOUNT_JSON`` to a JSON key file. The service-account
   must be registered at <https://signup.earthengine.google.com/>.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from bangalore_lakes.config import Settings
from bangalore_lakes.logging_setup import get_logger

log = get_logger(__name__)


class GEEAuthError(RuntimeError):
    """Raised when ``ee.Initialize`` cannot be called or the round-trip fails."""


@dataclass(frozen=True)
class EEInitInfo:
    """Summary of a successful initialization — handy for ``check-auth``."""

    project_id: str
    account: str
    round_trip_value: int


def _service_account_email(settings: Settings) -> str:
    if settings.gee_service_account_email:
        return settings.gee_service_account_email
    key_path = settings.gee_service_account_json
    assert key_path is not None
    try:
        data = json.loads(Path(key_path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as err:
        raise GEEAuthError(
            f"Cannot read service-account JSON at {key_path}: {err}. "
            "Set BLWQ_GEE_SERVICE_ACCOUNT_JSON to a valid key file, or set "
            "BLWQ_GEE_SERVICE_ACCOUNT_EMAIL explicitly."
        ) from err
    email = data.get("client_email")
    if not email:
        raise GEEAuthError(
            f"Service-account JSON at {key_path} has no 'client_email' field. "
            "Set BLWQ_GEE_SERVICE_ACCOUNT_EMAIL explicitly."
        )
    return email


def initialize_ee(settings: Settings) -> EEInitInfo:
    """Call ``ee.Initialize`` and return a summary on success.

    Raises :class:`GEEAuthError` with actionable remediation text on any failure.
    """
    import ee

    if not settings.gee_project_id:
        raise GEEAuthError(
            "No GEE project id configured. Set BLWQ_GEE_PROJECT_ID in your .env "
            "(the Google Cloud project id with the Earth Engine API enabled)."
        )

    account: str
    try:
        if settings.gee_service_account_json is not None:
            email = _service_account_email(settings)
            credentials = ee.ServiceAccountCredentials(
                email, str(settings.gee_service_account_json)
            )
            ee.Initialize(credentials, project=settings.gee_project_id)
            account = email
            log.info(
                "gee.initialized",
                project=settings.gee_project_id,
                account=email,
                auth="service_account",
            )
        else:
            ee.Initialize(project=settings.gee_project_id)
            account = "user-credentials"
            log.info(
                "gee.initialized",
                project=settings.gee_project_id,
                auth="user",
            )
    except ee.EEException as err:
        raise GEEAuthError(
            f"ee.Initialize failed: {err}. Remediation: "
            "(1) run `earthengine authenticate` if you haven't; "
            "(2) verify BLWQ_GEE_PROJECT_ID is a Cloud project with the Earth "
            "Engine API enabled; "
            "(3) if using a service account, ensure it is registered with GEE "
            "(https://signup.earthengine.google.com/) and has Earth Engine "
            "Resource Viewer on the project."
        ) from err
    except Exception as err:  # pragma: no cover - unexpected upstream error
        raise GEEAuthError(f"Unexpected error during ee.Initialize: {err}") from err

    try:
        round_trip = int(ee.Number(1).getInfo())
    except Exception as err:
        raise GEEAuthError(
            f"ee.Initialize succeeded but round-trip ee.Number(1).getInfo() failed: {err}"
        ) from err

    return EEInitInfo(
        project_id=settings.gee_project_id,
        account=account,
        round_trip_value=round_trip,
    )
