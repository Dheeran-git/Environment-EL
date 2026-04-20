"""FastAPI app factory for the Bangalore Lakes viewer."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from importlib import resources
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from bangalore_lakes import __version__
from bangalore_lakes.analytics.timeseries import LakeMonthlyObservation
from bangalore_lakes.config import Settings, get_settings
from bangalore_lakes.lakes import Lake, load_collection
from bangalore_lakes.restoration.registry import events_for_lake


@dataclass(frozen=True)
class RunEntry:
    """A single pipeline run directory discovered under ``<outputs>/<phase>/``."""

    phase: str
    run_id: str
    path: Path
    has_manifest: bool
    html_files: list[str]
    thumb_files: list[str]
    lake_ids: list[str]


def _read_lake_timeseries(path: Path) -> list[LakeMonthlyObservation]:
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    result: list[LakeMonthlyObservation] = []
    for row in payload:
        result.append(
            LakeMonthlyObservation(
                lake_id=row["lake_id"],
                month_start=date.fromisoformat(row["month_start"]),
                month_end=date.fromisoformat(row["month_end"]),
                ndwi=float(row["ndwi"]),
                ndvi=float(row["ndvi"]),
                ndti=float(row["ndti"]),
                pollution_score=float(row["pollution_score"]),
                pixel_count=int(row.get("pixel_count", 0)),
                scene_count=int(row.get("scene_count", 0)),
                anomaly_flag=bool(row.get("anomaly_flag", False)),
                mom_change_pct=(
                    float(row["mom_change_pct"]) if row.get("mom_change_pct") is not None else None
                ),
                restoration_verdict=row.get("restoration_verdict"),
                restoration_confidence=(
                    float(row["restoration_confidence"])
                    if row.get("restoration_confidence") is not None
                    else None
                ),
            )
        )
    return result


def _latest_analytics_dir(output_root: Path) -> Path | None:
    analytics_root = output_root / "analytics"
    if not analytics_root.is_dir():
        return None
    dirs = sorted([p for p in analytics_root.iterdir() if p.is_dir()], reverse=True)
    return dirs[0] if dirs else None


def _latest_score_by_lake(output_root: Path) -> dict[str, float]:
    latest = _latest_analytics_dir(output_root)
    if latest is None:
        return {}
    scores: dict[str, float] = {}
    lakes_root = latest / "lakes"
    if not lakes_root.is_dir():
        return {}
    for lake_dir in [p for p in lakes_root.iterdir() if p.is_dir()]:
        data = _read_lake_timeseries(lake_dir / "monthly_timeseries.json")
        if data:
            scores[lake_dir.name] = data[-1].pollution_score
    return scores


def _templates_dir() -> Path:
    return Path(str(resources.files("bangalore_lakes.web").joinpath("templates")))


def _static_dir() -> Path:
    return Path(str(resources.files("bangalore_lakes.web").joinpath("static")))


def _list_runs(output_root: Path) -> list[RunEntry]:
    """Discover ``day1/<run_id>`` and ``day2/<run_id>`` directories, newest first."""
    runs: list[RunEntry] = []
    if not output_root.exists():
        return runs
    for phase in ("day1", "day2", "analytics"):
        phase_dir = output_root / phase
        if not phase_dir.is_dir():
            continue
        for run_dir in sorted(phase_dir.iterdir(), reverse=True):
            if not run_dir.is_dir():
                continue
            html_files = sorted(p.name for p in run_dir.glob("*.html"))
            thumb_files = sorted(p.name for p in run_dir.glob("*.png"))
            lake_ids: list[str] = []
            lakes_dir = run_dir / "lakes"
            if lakes_dir.is_dir():
                lake_ids = sorted(p.name for p in lakes_dir.iterdir() if p.is_dir())
            runs.append(
                RunEntry(
                    phase=phase,
                    run_id=run_dir.name,
                    path=run_dir,
                    has_manifest=(run_dir / "run_manifest.json").exists()
                    or (run_dir / "run_metadata.json").exists(),
                    html_files=html_files,
                    thumb_files=thumb_files,
                    lake_ids=lake_ids,
                )
            )
    return runs


def _lake_public_dict(lake: Lake) -> dict[str, Any]:
    """JSON-safe projection of a Lake (dates become ISO strings)."""
    data = lake.model_dump(mode="json")
    data["computed_pollution_score"] = None
    return data


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the FastAPI instance. Kept pure so tests can import without side effects."""
    settings = settings or get_settings()
    collection = load_collection(settings.lakes_geojson)

    app = FastAPI(
        title="Bangalore Lakes Water Quality Viewer",
        version=__version__,
        description="Browse curated lake polygons and cached Sentinel-2 run artifacts.",
    )

    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins or ["*"],
        allow_methods=["GET"],
        allow_headers=["*"],
    )

    templates = Jinja2Templates(directory=str(_templates_dir()))
    app.mount("/static", StaticFiles(directory=str(_static_dir())), name="static")

    output_root = settings.output_dir.resolve()
    output_root.mkdir(parents=True, exist_ok=True)
    app.mount(
        "/artifacts",
        StaticFiles(directory=str(output_root), html=True),
        name="artifacts",
    )

    @app.get("/", response_class=HTMLResponse)
    def index(request: Request) -> HTMLResponse:
        runs = _list_runs(output_root)
        latest_scores = _latest_score_by_lake(output_root)
        return templates.TemplateResponse(
            request,
            "index.html",
            {
                "lakes": collection.lakes,
                "runs": runs,
                "version": __version__,
                "metadata": collection.metadata.model_dump(),
                "output_root": output_root.as_posix(),
                "latest_scores": latest_scores,
            },
        )

    @app.get("/lakes", response_class=HTMLResponse)
    def lakes_page(request: Request) -> HTMLResponse:
        latest_scores = _latest_score_by_lake(output_root)
        return templates.TemplateResponse(
            request,
            "lakes.html",
            {
                "lakes": collection.lakes,
                "version": __version__,
                "latest_scores": latest_scores,
            },
        )

    @app.get("/lakes/{lake_id}", response_class=HTMLResponse)
    def lake_detail(request: Request, lake_id: str) -> HTMLResponse:
        try:
            lake = collection.get(lake_id)
        except KeyError as err:
            raise HTTPException(status_code=404, detail=str(err)) from err

        artifacts: list[dict[str, str]] = []
        for run in _list_runs(output_root):
            if run.phase != "day2" or lake_id not in run.lake_ids:
                continue
            lake_dir = run.path / "lakes" / lake_id
            thumb = lake_dir / "thumb.png"
            geotiff = lake_dir / "clipped.tif"
            metadata = lake_dir / "metadata.json"
            artifacts.append(
                {
                    "run_id": run.run_id,
                    "thumb_url": (
                        f"/artifacts/day2/{run.run_id}/lakes/{lake_id}/thumb.png"
                        if thumb.exists()
                        else ""
                    ),
                    "geotiff_url": (
                        f"/artifacts/day2/{run.run_id}/lakes/{lake_id}/clipped.tif"
                        if geotiff.exists()
                        else ""
                    ),
                    "metadata_url": (
                        f"/artifacts/day2/{run.run_id}/lakes/{lake_id}/metadata.json"
                        if metadata.exists()
                        else ""
                    ),
                }
            )
        return templates.TemplateResponse(
            request,
            "lake_detail.html",
            {
                "lake": lake,
                "artifacts": artifacts,
                "version": __version__,
                "restoration_events": [e.model_dump(mode="json") for e in events_for_lake(lake.id)],
            },
        )

    @app.get("/runs", response_class=HTMLResponse)
    def runs_page(request: Request) -> HTMLResponse:
        return templates.TemplateResponse(
            request,
            "runs.html",
            {
                "runs": _list_runs(output_root),
                "version": __version__,
                "output_root": output_root.as_posix(),
            },
        )

    @app.get("/runs/{phase}/{run_id}", response_class=HTMLResponse)
    def run_detail(request: Request, phase: str, run_id: str) -> HTMLResponse:
        if phase not in {"day1", "day2", "analytics"}:
            raise HTTPException(status_code=404, detail=f"unknown phase: {phase}")
        run_dir = output_root / phase / run_id
        if not run_dir.is_dir():
            raise HTTPException(status_code=404, detail=f"no such run: {phase}/{run_id}")

        manifest_data: dict[str, Any] = {}
        for candidate in ("run_manifest.json", "run_metadata.json"):
            fp = run_dir / candidate
            if fp.exists():
                manifest_data = json.loads(fp.read_text(encoding="utf-8"))
                break

        html_files = sorted(p.name for p in run_dir.glob("*.html"))
        thumb_files = sorted(p.name for p in run_dir.glob("*.png"))
        lake_thumbs: list[dict[str, str]] = []
        lakes_dir = run_dir / "lakes"
        if lakes_dir.is_dir():
            for lake_subdir in sorted(lakes_dir.iterdir()):
                if lake_subdir.is_dir() and (lake_subdir / "thumb.png").exists():
                    lake_thumbs.append(
                        {
                            "lake_id": lake_subdir.name,
                            "thumb_url": f"/artifacts/{phase}/{run_id}/lakes/{lake_subdir.name}/thumb.png",
                            "detail_url": f"/lakes/{lake_subdir.name}",
                        }
                    )

        return templates.TemplateResponse(
            request,
            "run_detail.html",
            {
                "phase": phase,
                "run_id": run_id,
                "html_files": html_files,
                "thumb_files": thumb_files,
                "lake_thumbs": lake_thumbs,
                "manifest": manifest_data,
                "version": __version__,
                "artifact_root": f"/artifacts/{phase}/{run_id}",
            },
        )

    @app.get("/api/lakes")
    def api_lakes() -> JSONResponse:
        latest_scores = _latest_score_by_lake(output_root)
        lakes = []
        for lake in collection.lakes:
            item = _lake_public_dict(lake)
            item["computed_pollution_score"] = latest_scores.get(lake.id)
            lakes.append(item)
        return JSONResponse(
            {
                "metadata": collection.metadata.model_dump(mode="json"),
                "lakes": lakes,
            }
        )

    @app.get("/api/runs")
    def api_runs() -> JSONResponse:
        return JSONResponse(
            {
                "output_root": output_root.as_posix(),
                "runs": [
                    {
                        "phase": run.phase,
                        "run_id": run.run_id,
                        "html_files": run.html_files,
                        "thumb_files": run.thumb_files,
                        "lake_ids": run.lake_ids,
                        "has_manifest": run.has_manifest,
                    }
                    for run in _list_runs(output_root)
                ],
            }
        )

    @app.get("/api/timeseries/{lake_id}")
    def api_timeseries(lake_id: str) -> JSONResponse:
        latest = _latest_analytics_dir(output_root)
        if latest is None:
            raise HTTPException(status_code=404, detail="No analytics runs found")
        fp = latest / "lakes" / lake_id / "monthly_timeseries.json"
        if not fp.exists():
            raise HTTPException(status_code=404, detail=f"No timeseries found for lake={lake_id}")
        return JSONResponse(
            {
                "lake_id": lake_id,
                "analytics_run_id": latest.name,
                "data": json.loads(fp.read_text(encoding="utf-8")),
            }
        )

    @app.get("/api/restoration-events/{lake_id}")
    def api_restoration_events(lake_id: str) -> JSONResponse:
        events = [e.model_dump(mode="json") for e in events_for_lake(lake_id)]
        return JSONResponse({"lake_id": lake_id, "events": events})

    @app.get("/healthz")
    def healthz() -> dict[str, Any]:
        return {
            "status": "ok",
            "version": __version__,
            "lake_count": len(collection.lakes),
            "output_root": output_root.as_posix(),
            "output_root_exists": output_root.exists(),
        }

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon() -> FileResponse:
        path = _static_dir() / "favicon.svg"
        return FileResponse(path, media_type="image/svg+xml")

    return app
