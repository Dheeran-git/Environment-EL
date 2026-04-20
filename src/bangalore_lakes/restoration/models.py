"""Pydantic models for restoration-event registry."""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class RestorationEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")

    lake_id: str = Field(..., pattern=r"^[a-z][a-z0-9_-]*$")
    event_date: date
    title: str
    source_url: str | None = None
    note: str | None = None
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)


class RestorationRegistry(BaseModel):
    model_config = ConfigDict(extra="allow")

    metadata: dict[str, object] = Field(default_factory=dict)
    events: list[RestorationEvent]
