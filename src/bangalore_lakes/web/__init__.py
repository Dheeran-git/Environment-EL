"""FastAPI viewer for the Bangalore Lakes pipeline.

Serves the bundled lake registry as an interactive map plus a browsable
index of pipeline runs under ``outputs/day1/**`` and ``outputs/day2/**``.
No Earth Engine credentials are required to view cached artifacts.
"""

from bangalore_lakes.web.app import create_app

__all__ = ["create_app"]
