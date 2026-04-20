"""Typed settings for the Bangalore Lakes pipeline.

Values come from environment variables (prefix ``BLWQ_``) or a ``.env`` file in
the working directory. CLI flags override anything set here.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Process-wide configuration loaded from env vars and ``.env``."""

    model_config = SettingsConfigDict(
        env_prefix="BLWQ_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    gee_project_id: str | None = Field(
        default=None,
        description="Google Cloud project id with the Earth Engine API enabled.",
    )
    gee_service_account_json: Path | None = Field(
        default=None,
        description="Path to a service-account JSON key. If set, SA auth is used.",
    )
    gee_service_account_email: str | None = Field(
        default=None,
        description="Override for the service-account email; else read from the JSON file.",
    )

    default_days: int = Field(default=90, ge=1, le=730)
    default_cloud_pct: float = Field(default=20.0, ge=0.0, le=100.0)
    default_scale_m: int = Field(default=10, ge=1, le=1000)
    default_crs: str = Field(default="EPSG:32643")
    analytics_start_year: int = Field(default=2020, ge=2015, le=2100)

    output_dir: Path = Field(default=Path("outputs"))
    lakes_geojson: Path | None = Field(
        default=None,
        description="Override the bundled lake GeoJSON path.",
    )
    restoration_events_json: Path | None = Field(
        default=None,
        description="Override bundled restoration-events JSON path.",
    )

    log_level: str = Field(default="INFO")
    log_json: bool = Field(default=False)

    cors_origins: str = Field(
        default="*",
        description=(
            "Comma-separated list of allowed browser origins for the FastAPI API. "
            "Use '*' for open dev, or e.g. 'https://bangalore-lakes.vercel.app' in prod."
        ),
    )

    bangalore_center_lon: float = Field(default=77.5946)
    bangalore_center_lat: float = Field(default=12.9716)
    bangalore_bbox_halfwidth_deg: float = Field(default=0.15, gt=0.0)

    @field_validator("log_level")
    @classmethod
    def _validate_log_level(cls, value: str) -> str:
        allowed = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
        upper = value.upper()
        if upper not in allowed:
            raise ValueError(f"log_level must be one of {sorted(allowed)}; got {value!r}")
        return upper

    @field_validator("default_crs")
    @classmethod
    def _validate_crs(cls, value: str) -> str:
        if not value.upper().startswith("EPSG:"):
            raise ValueError(f"default_crs must look like 'EPSG:<code>'; got {value!r}")
        return value.upper()

    def bangalore_bbox(self) -> tuple[float, float, float, float]:
        """Return the AOI bbox as (west, south, east, north) in degrees."""
        half = self.bangalore_bbox_halfwidth_deg
        return (
            self.bangalore_center_lon - half,
            self.bangalore_center_lat - half,
            self.bangalore_center_lon + half,
            self.bangalore_center_lat + half,
        )


def get_settings(**overrides: object) -> Settings:
    """Return a fresh Settings, optionally with keyword overrides (handy in tests)."""
    if overrides:
        return Settings(**overrides)  # type: ignore[arg-type]
    return Settings()
