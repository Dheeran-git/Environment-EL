# Methodology

## Objective

Estimate lake-level pollution dynamics for Bangalore lakes using Sentinel-2 spectral
signals, then surface trend anomalies and restoration-outcome heuristics.

## Inputs

- Satellite: `COPERNICUS/S2_SR_HARMONIZED`
- Bands used:
  - `B3` (Green)
  - `B4` (Red)
  - `B8` (NIR)
  - `B11` (SWIR)
- AOI: curated lake polygons in `src/bangalore_lakes/data/lakes/bangalore_lakes.geojson`

## Monthly aggregation

For each lake and month window from January 2020 to current month:

1. Filter Sentinel-2 by date, AOI, and cloud threshold.
2. Build median composite.
3. Compute indices:
   - `NDWI = (B3 - B8) / (B3 + B8)`
   - `NDVI = (B8 - B4) / (B8 + B4)`
   - `NDTI proxy = (B11 - B4) / (B11 + B4)`
4. Use `NDWI > 0` as a water mask.
5. Compute mean index values over masked pixels.

## Pollution score (0-100)

Each index is normalized to `[0, 1]` from `[-1, 1]`, then combined:

- inverse NDWI weight: `0.35`
- NDVI weight: `0.25`
- NDTI proxy weight: `0.40`

Final score:

`score = clamp(100 * (0.35 * inv_ndwi + 0.25 * ndvi_norm + 0.40 * ndti_norm), 0, 100)`

Higher score implies likely poorer quality.

## Anomaly rule

Month-over-month anomaly is flagged when:

- `((score_t - score_(t-1)) / score_(t-1)) * 100 > 20`

This is surfaced as `anomaly_flag=true`.

## Restoration verdict heuristic

Given latest restoration event date per lake:

1. Compute pre-event average over up to 6 months before event.
2. Compute post-event average over up to 6 months after event.
3. Classify:
   - `improved` if `pre_avg - post_avg > 5`
   - `worsened` if `pre_avg - post_avg < -5`
   - `unchanged` otherwise
4. Confidence scales with absolute delta magnitude.

## Limitations

- Score is a proxy, not direct lab validation.
- Cloud/seasonality can reduce monthly scene quality.
- Restoration events are sourced from public announcements and may require ongoing
  verification.
- Polygon geometry quality affects signal purity, especially at shore boundaries.
