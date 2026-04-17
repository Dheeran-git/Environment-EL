"""Lake registry: curated polygons and validated metadata."""

from bangalore_lakes.lakes.models import Lake, LakeCollection, PollutionLevel
from bangalore_lakes.lakes.registry import load_collection, load_lakes

__all__ = ["Lake", "LakeCollection", "PollutionLevel", "load_collection", "load_lakes"]
