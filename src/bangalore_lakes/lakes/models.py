"""Pydantic models describing a curated lake and a registry collection."""

from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class PollutionLevel(StrEnum):
    """Coarse qualitative label; does not replace the spectral-index score."""

    UNKNOWN = "unknown"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    SEVERE = "severe"


class _GeoJSONGeometry(BaseModel):
    """Minimal GeoJSON geometry validation (Polygon or MultiPolygon)."""

    model_config = ConfigDict(extra="allow")

    type: str
    coordinates: Any

    @field_validator("type")
    @classmethod
    def _check_type(cls, value: str) -> str:
        if value not in {"Polygon", "MultiPolygon"}:
            raise ValueError(f"geometry.type must be Polygon or MultiPolygon; got {value!r}")
        return value


class Lake(BaseModel):
    """A single curated lake with a validated geometry and metadata."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(
        ...,
        pattern=r"^[a-z][a-z0-9_-]*$",
        description="Stable slug, primary key (e.g. 'bellandur').",
    )
    name: str
    alt_names: list[str] = Field(default_factory=list)
    ward: str | None = None
    bbmp_ward_no: int | None = Field(default=None, ge=1, le=300)
    official_area_ha: float | None = Field(default=None, gt=0.0)
    known_pollution_level: PollutionLevel = PollutionLevel.UNKNOWN
    centroid: tuple[float, float] = Field(..., description="[longitude, latitude] in EPSG:4326.")
    source: str = "OSM"
    osm_id: str | None = None
    last_verified: date | None = None
    notes: str | None = None
    geometry: _GeoJSONGeometry

    @field_validator("centroid")
    @classmethod
    def _check_centroid(cls, value: tuple[float, float]) -> tuple[float, float]:
        lon, lat = value
        if not -180.0 <= lon <= 180.0:
            raise ValueError(f"centroid longitude out of range: {lon}")
        if not -90.0 <= lat <= 90.0:
            raise ValueError(f"centroid latitude out of range: {lat}")
        return value

    @classmethod
    def from_geojson_feature(cls, feature: dict[str, Any]) -> Lake:
        """Build a ``Lake`` from a GeoJSON Feature dict."""
        if feature.get("type") != "Feature":
            raise ValueError(f"expected a GeoJSON Feature; got type={feature.get('type')!r}")
        props = dict(feature.get("properties") or {})
        geom = feature.get("geometry")
        if geom is None:
            raise ValueError("GeoJSON feature is missing 'geometry'")
        props["geometry"] = geom
        return cls.model_validate(props)


class LakeCollectionMetadata(BaseModel):
    """Top-level ``metadata`` block carried on the bundled FeatureCollection."""

    model_config = ConfigDict(extra="allow")

    generated_at: date | None = None
    source: str | None = None
    overpass_query_hash: str | None = None
    schema_version: int = 1


class LakeCollection(BaseModel):
    """All curated lakes plus provenance metadata."""

    model_config = ConfigDict(extra="forbid")

    metadata: LakeCollectionMetadata = Field(default_factory=LakeCollectionMetadata)
    lakes: list[Lake]

    @model_validator(mode="after")
    def _check_unique_ids(self) -> LakeCollection:
        ids = [lake.id for lake in self.lakes]
        duplicates = sorted({i for i in ids if ids.count(i) > 1})
        if duplicates:
            raise ValueError(f"duplicate lake ids in registry: {duplicates}")
        return self

    def get(self, lake_id: str) -> Lake:
        for lake in self.lakes:
            if lake.id == lake_id:
                return lake
        known = ", ".join(sorted(lake.id for lake in self.lakes))
        raise KeyError(f"no lake with id={lake_id!r}; known ids: {known}")

    def ids(self) -> list[str]:
        return [lake.id for lake in self.lakes]
