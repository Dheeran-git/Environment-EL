"""Unit tests for :mod:`bangalore_lakes.web`.

The FastAPI app is exercised via Starlette's ``TestClient`` — no network,
no uvicorn, no Earth Engine.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from bangalore_lakes.config import Settings
from bangalore_lakes.web import create_app


@pytest.fixture
def client(tmp_path: Path) -> TestClient:
    settings = Settings(output_dir=tmp_path)
    return TestClient(create_app(settings))


def test_index_renders(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.text
    assert "Bangalore Lakes" in body
    assert "/lakes" in body


def test_lakes_page_lists_all_six(client: TestClient) -> None:
    response = client.get("/lakes")
    assert response.status_code == 200
    body = response.text
    for lake_id in ("bellandur", "varthur", "hebbal", "ulsoor", "sankey", "agara"):
        assert f"/lakes/{lake_id}" in body or lake_id in body


def test_lake_detail_known_id(client: TestClient) -> None:
    response = client.get("/lakes/bellandur")
    assert response.status_code == 200
    assert "Bellandur" in response.text or "bellandur" in response.text


def test_lake_detail_unknown_id(client: TestClient) -> None:
    response = client.get("/lakes/does-not-exist")
    assert response.status_code == 404


def test_api_lakes_shape(client: TestClient) -> None:
    response = client.get("/api/lakes")
    assert response.status_code == 200
    payload = response.json()
    assert "lakes" in payload and isinstance(payload["lakes"], list)
    assert len(payload["lakes"]) >= 6
    first = payload["lakes"][0]
    assert {"id", "name", "geometry", "centroid"}.issubset(first)


def test_api_runs_empty_when_no_outputs(client: TestClient) -> None:
    response = client.get("/api/runs")
    assert response.status_code == 200
    assert response.json()["runs"] == []


def test_runs_page_reports_empty(client: TestClient) -> None:
    response = client.get("/runs")
    assert response.status_code == 200
    assert "No runs" in response.text or "bangalore-lakes" in response.text


def test_runs_page_lists_discovered_runs(tmp_path: Path) -> None:
    run_dir = tmp_path / "day1" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    (run_dir / "bangalore_s2_composite.html").write_text("<html></html>")
    (run_dir / "run_metadata.json").write_text('{"run_id": "20260101T000000Z"}')

    client = TestClient(create_app(Settings(output_dir=tmp_path)))
    response = client.get("/runs")
    assert response.status_code == 200
    assert "20260101T000000Z" in response.text

    api = client.get("/api/runs").json()
    assert api["runs"][0]["run_id"] == "20260101T000000Z"
    assert api["runs"][0]["phase"] == "day1"


def test_run_detail_day1(tmp_path: Path) -> None:
    run_dir = tmp_path / "day1" / "20260101T000000Z"
    run_dir.mkdir(parents=True)
    (run_dir / "bangalore_s2_composite.html").write_text("<html>map</html>")
    (run_dir / "run_metadata.json").write_text('{"run_id": "20260101T000000Z", "phase": "day1"}')

    client = TestClient(create_app(Settings(output_dir=tmp_path)))
    response = client.get("/runs/day1/20260101T000000Z")
    assert response.status_code == 200
    assert "bangalore_s2_composite.html" in response.text


def test_run_detail_unknown_phase(client: TestClient) -> None:
    assert client.get("/runs/day99/foo").status_code == 404


def test_healthz(client: TestClient) -> None:
    response = client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["lake_count"] >= 6
