"""Pollution-score model from spectral indices."""

from __future__ import annotations

from bangalore_lakes.analytics.indices import normalize_index_value


def compute_pollution_score(*, ndwi: float, ndvi: float, ndti: float) -> float:
    """Compute a 0-100 pollution score.

    Higher score means likely poorer water quality.
    """
    # Water presence signal: lower NDWI can indicate less clear water.
    inv_ndwi = 1.0 - normalize_index_value(ndwi, lo=-1.0, hi=1.0)
    # Vegetation/algal proxy from NDVI over water mask.
    ndvi_norm = normalize_index_value(ndvi, lo=-1.0, hi=1.0)
    # Turbidity proxy (NDTI-like index) tends to be stronger for suspended solids.
    ndti_norm = normalize_index_value(ndti, lo=-1.0, hi=1.0)

    weighted = (0.35 * inv_ndwi) + (0.25 * ndvi_norm) + (0.40 * ndti_norm)
    return round(max(0.0, min(100.0, weighted * 100.0)), 2)
