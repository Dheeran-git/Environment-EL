# Bangalore Lakes Water Quality Estimator

A hyperlocal, Bangalore-specific satellite analysis pipeline that pulls
Sentinel-2 imagery for six named lakes — **Bellandur, Varthur, Hebbal, Ulsoor,
Sankey, Agara** — and produces clipped imagery for downstream water-quality
analysis.

This repository covers **Day 1 + Day 2 + analytics extensions** of the Week 1 roadmap:
a production-quality GEE data pipeline that renders an interactive Bangalore-wide
Sentinel-2 composite, exports per-lake PNG + GeoTIFF clips, computes monthly
spectral-index time series from 2020 onward, and derives anomaly/restoration
insights.

## Quickstart

```bash
# 1. Install (Python 3.11, 3.12, or 3.13)
make install

# 2. One-time: authenticate with Earth Engine
earthengine authenticate

# 3. Configure: copy .env.example to .env and set BLWQ_GEE_PROJECT_ID
cp .env.example .env
# edit .env

# 4. Verify auth and registry
bangalore-lakes check-auth
bangalore-lakes list-lakes

# 5. Day 1: Bangalore-wide S2 composite -> outputs/day1/<run_id>/
make run-day1

# 6. Day 2: per-lake clipped exports -> outputs/day2/<run_id>/
make run-day2

# 7. Build monthly analytics and insights (2020-now)
bangalore-lakes compute-timeseries
bangalore-lakes compute-insights --analytics-run-dir outputs/analytics/<run_id>

# 8. Browse everything in a local web viewer -> http://127.0.0.1:8000
make serve
```

Open the generated `*.html` files in a browser to inspect the interactive maps,
or use the built-in web viewer.

## Web viewer

`bangalore-lakes serve` launches a FastAPI app (Uvicorn + Jinja2 + Leaflet) that:

- renders the six curated lakes on an interactive map with pollution-level colors,
- lists every run under `outputs/day1/**` and `outputs/day2/**`,
- embeds the generated `*.html` maps as iframes and thumbnails as images,
- exposes `/api/lakes` and `/api/runs` as JSON for downstream tooling,
- exposes `/api/timeseries/{lake_id}` and `/api/restoration-events/{lake_id}`,
- serves raw artifacts under `/artifacts/...` so GeoTIFFs/metadata stay downloadable.

It works without Earth Engine credentials — you can browse the lake registry
immediately, and cached run artifacts appear as soon as `hello-bangalore` or
`fetch-lakes` has produced them.

## React frontend (Week 2)

A separate React + Vite + TypeScript SPA lives under [`frontend/`](frontend/),
styled with a Linear-inspired dark theme (Tailwind, Inter, JetBrains Mono).
It consumes the same JSON API the Jinja2 viewer uses.

```bash
# One-time
make frontend-install

# Dev: two terminals
make serve                 # FastAPI at :8000 (backend)
make frontend-dev          # Vite dev server at :5173 (proxies /api to :8000)

# Production build
make frontend-build        # emits frontend/dist/
```

Features:

- **Dashboard** (`/`) — Leaflet map of all six lakes, color-coded by latest
  pollution score; ranked list with MoM anomaly badges; hover-to-highlight
  between map and list.
- **Lake detail** (`/lakes/:id`) — stat tiles, verdict card, Recharts trend
  line 2020→now, dashed red `<ReferenceLine>` for each restoration event,
  red dots for >20% MoM anomalies.
- **Methodology** (`/methodology`) — one-page write-up of indices, scoring
  weights, anomaly rule, and verdict heuristic.

## Deployment

- **Backend** → Render via [`render.yaml`](render.yaml) at the repo root.
  Exposes the FastAPI app; set `BLWQ_CORS_ORIGINS` to your Vercel URL.
- **Frontend** → Vercel via [`frontend/vercel.json`](frontend/vercel.json).
  Set project root to `frontend/`, env var `VITE_API_BASE` to the Render URL.

See [`docs/demo.md`](docs/demo.md) for a 90-second demo walkthrough script.

## CLI

```
bangalore-lakes check-auth            # verifies ee.Initialize() + round-trip
bangalore-lakes list-lakes            # prints curated lake registry
bangalore-lakes hello-bangalore       # Day 1: Bangalore S2 composite + HTML map
bangalore-lakes fetch-lakes           # Day 2: per-lake clipped PNG + GeoTIFF
bangalore-lakes compute-timeseries    # Monthly NDWI/NDVI/NDTI + pollution score
bangalore-lakes compute-insights      # MoM anomalies + restoration verdict
bangalore-lakes serve                 # Web viewer at http://127.0.0.1:8000
```

If the installed scripts directory isn't on your `PATH` (common on Windows with
`pip install --user`), every subcommand is also reachable via the module
runner:

```
python -m bangalore_lakes serve
python -m bangalore_lakes list-lakes
```

`hello-bangalore` and `fetch-lakes` accept `--days`, `--cloud-pct`, and
`--output-dir`; `fetch-lakes` additionally accepts `--lakes <id>` (repeatable),
`--scale`, and `--skip-geotiff`. `compute-timeseries` accepts `--start-year`,
`--lakes`, `--cloud-pct`, `--scale`, and `--output-dir`.
Run any command with `--help` for full options.

## Architecture

- `src/bangalore_lakes/gee/` — the only code that imports `ee`. Auth, session
  caching, Sentinel-2 collection/composite, synchronous thumb/GeoTIFF export.
- `src/bangalore_lakes/lakes/` — pydantic-validated `Lake` model and the bundled
  GeoJSON registry loader.
- `src/bangalore_lakes/maps/` — `geemap.Map` builders for Day 1 + Day 2.
- `src/bangalore_lakes/analytics/` — spectral indices, scoring, anomaly and verdict logic.
- `src/bangalore_lakes/restoration/` — restoration events registry and validation.
- `src/bangalore_lakes/commands/` — orchestration for each CLI subcommand.
- `src/bangalore_lakes/web/` — FastAPI viewer (templates, static, app factory).
- `src/bangalore_lakes/data/lakes/bangalore_lakes.geojson` — curated OSM-derived
  polygons for the six target lakes (see `PROVENANCE.md` for the Overpass query).

Design invariant: nothing outside `gee/` imports `ee`. Everything else is
pure-Python and unit-testable without Earth Engine credentials.

## Testing

```bash
make test                 # unit tests (no GEE auth required)
make test-integration     # real GEE round-trip; requires EE_TEST_AUTH=1
make lint                 # ruff + black --check
```

CI runs unit tests on Python 3.11, 3.12, and 3.13 against every push to the branch.

## Configuration

`pydantic-settings` reads from `.env` with the prefix `BLWQ_`. See
[`.env.example`](.env.example) for all supported variables. CLI flags always
override env vars.

## Output artifacts

### Day 1 — `outputs/day1/<run_id>/`

- `bangalore_s2_composite.html` — interactive geemap map over Bangalore
- `bangalore_s2_composite_thumb.png` — 1024 px true-color thumbnail
- `run_metadata.json` — date range, image count, scale/CRS, settings snapshot
- `run.log` — structured run log

### Day 2 — `outputs/day2/<run_id>/`

- `lakes/<id>/clipped.tif` — per-lake GeoTIFF (EPSG:32643, 10 m)
- `lakes/<id>/thumb.png` — per-lake 1024 px PNG
- `lakes/<id>/metadata.json` — image ids, area, centroid, SHA256
- `multi_lake_overlay.html` — toggleable interactive map for all lakes
- `run_manifest.json` — index of every artifact
- `run.log`

### Analytics — `outputs/analytics/<run_id>/`

- `all_lakes_monthly.csv` — consolidated monthly time series for all processed lakes
- `lakes/<id>/monthly_timeseries.json` — per-lake monthly NDWI/NDVI/NDTI + score
- `timeseries_manifest.json` — run metadata and artifact index
- `insights_manifest.json` — anomaly counts + restoration verdict summaries

## Methodology

See [`docs/methodology.md`](docs/methodology.md) for formulas, scoring assumptions,
anomaly thresholding, and restoration-verdict logic.

## Monsoon note

Between June and October, Bangalore's cloud cover can leave the default 20% cloud-percentage filter with too few usable scenes. If the command logs `collection_size_post_filter < 3`, rerun with `--cloud-pct 40` or `--days 180`.

## License

MIT
