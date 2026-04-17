# Lake registry provenance

This directory contains the curated lake polygon GeoJSON used by the pipeline.
The file is loaded via `importlib.resources` and validated on load by the
pydantic models in `src/bangalore_lakes/lakes/models.py`.

## Current file: `bangalore_lakes.geojson`

**Status:** hand-curated approximations of the six target lakes, suitable for
end-to-end pipeline testing and visual demos. These polygons are **not**
survey-accurate — they are rounded outlines placed at the well-known centroids
and approximate extents of each lake. They are good enough to:

- confirm that clipping, export, and overlay mapping all work
- produce recognizable lake-shaped thumbnails in Day 2 artifacts
- validate the registry/pydantic pipeline

For publication-quality or area-accurate analysis, replace this file with an
OSM-derived export per the procedure below.

## Producing an accurate replacement from OpenStreetMap

### 1. Run this Overpass query

On <https://overpass-turbo.eu> (or via `curl` to an Overpass endpoint):

```overpass
[out:json][timeout:60];
(
  relation["natural"="water"]["name"~"Bellandur|Varthur|Hebbal|Ulsoor|Halasuru|Sankey|Agara",i](12.80,77.45,13.15,77.80);
  way["natural"="water"]["name"~"Bellandur|Varthur|Hebbal|Ulsoor|Halasuru|Sankey|Agara",i](12.80,77.45,13.15,77.80);
  relation["water"="lake"]["name"~"Bellandur|Varthur|Hebbal|Ulsoor|Halasuru|Sankey|Agara",i](12.80,77.45,13.15,77.80);
  way["water"="lake"]["name"~"Bellandur|Varthur|Hebbal|Ulsoor|Halasuru|Sankey|Agara",i](12.80,77.45,13.15,77.80);
  way["water"="tank"]["name"~"Sankey",i](12.80,77.45,13.15,77.80);
);
out body; >; out skel qt;
```

The bbox `(12.80, 77.45, 13.15, 77.80)` brackets Bangalore city.

### 2. Export

Click **Export → GeoJSON** in overpass-turbo. Save as `raw_overpass.geojson`.

### 3. Post-process with GeoPandas

```python
import geopandas as gpd

gdf = gpd.read_file("raw_overpass.geojson").to_crs(4326)

# Keep the largest polygon for each lake name
gdf["lake"] = gdf["name"].str.lower().replace({"halasuru lake": "ulsoor"})
gdf["area_m2"] = gdf.to_crs(32643).area
keep = gdf.sort_values("area_m2", ascending=False).drop_duplicates(subset=["lake"])

# Dissolve MultiPolygons if the same lake is split across OSM ways
dissolved = keep.dissolve(by="lake").reset_index()
dissolved.to_file("curated.geojson", driver="GeoJSON")
```

### 4. Hand-fill the pydantic properties

For each feature, set the following `properties` keys to match the schema in
`models.Lake`:

- `id` — stable slug (`bellandur`, `varthur`, `hebbal`, `ulsoor`, `sankey`,
  `agara`)
- `name`
- `alt_names` (e.g. `["Halasuru Lake"]` for Ulsoor)
- `ward`, `bbmp_ward_no`
- `official_area_ha` (from BBMP records, not OSM — OSM polygons are often
  slightly different from the official area)
- `known_pollution_level` — one of `unknown|low|moderate|high|severe`
- `centroid` — `[lon, lat]` of the geometry centroid
- `source` — `"OSM"`
- `osm_id` — e.g. `"relation/1234567"`
- `last_verified` — ISO date of the export
- `notes` — free-form

### 5. Validate

```python
from bangalore_lakes.lakes.registry import load_collection
coll = load_collection(Path("curated.geojson"))
assert len(coll.lakes) == 6
```

Run `bangalore-lakes list-lakes --lakes-geojson curated.geojson` to eyeball it
(via `BLWQ_LAKES_GEOJSON=curated.geojson`), then move the file into this
directory as `bangalore_lakes.geojson` and commit.

## Known naming quirks

- **Ulsoor / Halasuru**: the same lake. Registry uses `id=ulsoor` with
  `alt_names: ["Halasuru Lake"]`.
- **Sankey**: OSM may tag this as `water=tank` (it was built in 1882 as a
  water-supply tank). The Overpass query above includes both `natural=water`
  and `water=tank` forms.
- **Madiwala vs Agara**: Madiwala Lake is also a reasonable candidate, but its
  OSM polygon is inconsistent across sources; Agara is cleaner.

## Alternate sources for cross-checking

Document but do not automate:
- KSRSAC / BBMP lake atlas shapefiles (not always publicly available)
- ATREE Bangalore lakes database
- BDA / LDA restoration-project boundaries
