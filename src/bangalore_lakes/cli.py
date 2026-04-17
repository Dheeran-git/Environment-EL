"""Typer CLI entry point. Subcommand logic lives in :mod:`bangalore_lakes.commands`."""

from __future__ import annotations

from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from bangalore_lakes import __version__
from bangalore_lakes.config import get_settings
from bangalore_lakes.logging_setup import configure_logging

app = typer.Typer(
    name="bangalore-lakes",
    help="Satellite-derived water quality prototype for Bangalore's lakes.",
    no_args_is_help=True,
    add_completion=False,
)

console = Console()


def _version_callback(value: bool) -> None:
    if value:
        console.print(f"bangalore-lakes [bold]{__version__}[/bold]")
        raise typer.Exit()


@app.callback()
def _root(
    version: bool = typer.Option(
        False,
        "--version",
        callback=_version_callback,
        is_eager=True,
        help="Print version and exit.",
    ),
) -> None:
    """Root callback — enables ``--version``."""


@app.command("check-auth")
def check_auth_cmd(
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable debug logging."),
) -> None:
    """Verify GEE authentication by round-tripping ``ee.Number(1).getInfo()``."""
    settings = get_settings()
    configure_logging("DEBUG" if verbose else settings.log_level, json=settings.log_json)

    from bangalore_lakes.gee.auth import GEEAuthError, initialize_ee

    try:
        info = initialize_ee(settings)
    except GEEAuthError as err:
        console.print(f"[bold red]GEE auth failed:[/bold red] {err}")
        raise typer.Exit(code=2) from err

    console.print("[green]Earth Engine initialized.[/green]")
    console.print(f"  project: [bold]{info.project_id}[/bold]")
    console.print(f"  account: [bold]{info.account}[/bold]")
    console.print(f"  round-trip (ee.Number(1).getInfo()): [bold]{info.round_trip_value}[/bold]")


@app.command("list-lakes")
def list_lakes_cmd() -> None:
    """Print the curated lake registry as a table."""
    from bangalore_lakes.lakes import load_lakes

    settings = get_settings()
    lakes = load_lakes(settings.lakes_geojson)

    table = Table(title="Bangalore Lakes — Curated Registry", show_lines=False)
    table.add_column("id", style="bold")
    table.add_column("name")
    table.add_column("ward")
    table.add_column("area (ha)", justify="right")
    table.add_column("pollution", style="yellow")
    table.add_column("centroid")

    for lake in lakes:
        area = f"{lake.official_area_ha:.1f}" if lake.official_area_ha is not None else "—"
        table.add_row(
            lake.id,
            lake.name,
            lake.ward or "—",
            area,
            lake.known_pollution_level.value,
            f"{lake.centroid[0]:.4f}, {lake.centroid[1]:.4f}",
        )
    console.print(table)


@app.command("hello-bangalore")
def hello_bangalore_cmd(
    days: int = typer.Option(None, "--days", help="Look-back window in days for the S2 composite."),
    cloud_pct: float = typer.Option(
        None, "--cloud-pct", help="CLOUDY_PIXEL_PERCENTAGE threshold (0-100)."
    ),
    output_dir: Path = typer.Option(
        None,
        "--output-dir",
        help="Output root (artifacts land under <output_dir>/day1/<run_id>/).",
    ),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable debug logging."),
) -> None:
    """Day 1 — Sentinel-2 cloud-filtered composite over Bangalore."""
    settings = get_settings()
    configure_logging("DEBUG" if verbose else settings.log_level, json=settings.log_json)

    from bangalore_lakes.commands.hello_bangalore import run_hello_bangalore

    result = run_hello_bangalore(
        settings=settings,
        days=days if days is not None else settings.default_days,
        cloud_pct=cloud_pct if cloud_pct is not None else settings.default_cloud_pct,
        output_dir=output_dir if output_dir is not None else settings.output_dir,
    )
    console.print(f"[green]Day 1 complete.[/green] Artifacts: [bold]{result.run_dir}[/bold]")


@app.command("fetch-lakes")
def fetch_lakes_cmd(
    lakes: list[str] = typer.Option(
        None,
        "--lakes",
        help="Lake id(s) to process (repeatable). Defaults to all registered lakes.",
    ),
    days: int = typer.Option(None, "--days", help="Look-back window in days."),
    cloud_pct: float = typer.Option(None, "--cloud-pct", help="Cloud percentage threshold."),
    scale: int = typer.Option(None, "--scale", help="Export scale in meters/pixel."),
    output_dir: Path = typer.Option(None, "--output-dir", help="Output root."),
    skip_geotiff: bool = typer.Option(
        False, "--skip-geotiff", help="Skip GeoTIFF export (PNG + HTML only)."
    ),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Enable debug logging."),
) -> None:
    """Day 2 — per-lake clipped PNG + GeoTIFF exports + multi-lake overlay map."""
    settings = get_settings()
    configure_logging("DEBUG" if verbose else settings.log_level, json=settings.log_json)

    from bangalore_lakes.commands.fetch_lakes import run_fetch_lakes

    result = run_fetch_lakes(
        settings=settings,
        lake_ids=lakes or None,
        days=days if days is not None else settings.default_days,
        cloud_pct=cloud_pct if cloud_pct is not None else settings.default_cloud_pct,
        scale=scale if scale is not None else settings.default_scale_m,
        output_dir=output_dir if output_dir is not None else settings.output_dir,
        skip_geotiff=skip_geotiff,
    )
    console.print(
        f"[green]Day 2 complete.[/green] {len(result.lake_artifacts)} lakes processed. "
        f"Artifacts: [bold]{result.run_dir}[/bold]"
    )


if __name__ == "__main__":
    app()
