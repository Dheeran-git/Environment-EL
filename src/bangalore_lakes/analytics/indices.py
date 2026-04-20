"""Helpers for normalizing spectral-index values."""

from __future__ import annotations


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def normalize_index_value(value: float, *, lo: float = -1.0, hi: float = 1.0) -> float:
    """Normalize an index in ``[lo, hi]`` to ``[0, 1]``."""
    if hi <= lo:
        raise ValueError("hi must be greater than lo")
    clamped = _clamp(value, lo, hi)
    return (clamped - lo) / (hi - lo)
