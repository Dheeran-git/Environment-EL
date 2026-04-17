# Bangalore Lakes Water Quality Estimator

A hyperlocal, Bangalore-specific satellite analysis pipeline that pulls
Sentinel-2 imagery for six named lakes — **Bellandur, Varthur, Hebbal, Ulsoor,
Sankey, Agara** — and produces clipped imagery for downstream water-quality
analysis.

This repository covers **Day 1 + Day 2** of the Week 1 roadmap: a production-quality
GEE data pipeline that renders an interactive Bangalore-wide Sentinel-2 composite
and exports per-lake PNG + GeoTIFF clips. Spectral indices, pollution scoring,
and the Flask/React dashboard are scoped for Day 3+ and slot into the same
package without refactoring.

## Quickstart

```bash
# 1. Install (Python 3.11 or 3.12)
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
```

Open the generated `*.html` files in a browser to inspect the interactive maps.

## CLI

```
bangalore-lakes check-auth            # verifies ee.Initialize() + round-trip
bangalore-lakes list-lakes            # prints curated lake registry
bangalore-lakes hello-bangalore       # Day 1: Bangalore S2 composite + HTML map
bangalore-lakes fetch-lakes           # Day 2: per-lake clipped PNG + GeoTIFF
```

All commands accept `--days`, `--cloud-pct`, `--output-dir`, and `--verbose`.
`fetch-lakes` additionally accepts `--lakes <id>` (repeatable), `--scale`, and
`--skip-geotiff`. Run any command with `--help` for full options.

## Architecture

- `src/bangalore_lakes/gee/` — the only code that imports `ee`. Auth, session
  caching, Sentinel-2 collection/composite, synchronous thumb/GeoTIFF export.
- `src/bangalore_lakes/lakes/` — pydantic-validated `Lake` model and the bundled
  GeoJSON registry loader.
- `src/bangalore_lakes/maps/` — `geemap.Map` builders for Day 1 + Day 2.
- `src/bangalore_lakes/commands/` — orchestration for each CLI subcommand.
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

CI runs unit tests on Python 3.11 and 3.12 against every push to the branch.

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

## Monsoon note

Between June and October, Bangalore's cloud cover can leave the default 20% cloud-percentage filter with too few usable scenes. If the command logs `collection_size_post_filter < 3`, rerun with `--cloud-pct 40` or `--days 180`.

## License

MIT
