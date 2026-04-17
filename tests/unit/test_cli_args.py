"""Smoke tests for the Typer CLI: --help, --version, list-lakes."""

from __future__ import annotations

import re

import pytest
from typer.testing import CliRunner

from bangalore_lakes import __version__
from bangalore_lakes.cli import app

runner = CliRunner()

_ANSI_RE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def _plain(text: str) -> str:
    """Strip ANSI escape sequences so substring checks survive Rich styling."""
    return _ANSI_RE.sub("", text)


def test_help_lists_all_commands() -> None:
    result = runner.invoke(app, ["--help"])
    assert result.exit_code == 0, result.output
    output = _plain(result.output)
    for cmd in ("check-auth", "list-lakes", "hello-bangalore", "fetch-lakes"):
        assert cmd in output


def test_version_flag() -> None:
    result = runner.invoke(app, ["--version"])
    assert result.exit_code == 0, result.output
    assert __version__ in _plain(result.output)


def test_list_lakes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir("/tmp")
    result = runner.invoke(app, ["list-lakes"])
    assert result.exit_code == 0, result.output
    output = _plain(result.output)
    for lake_id in ("bellandur", "varthur", "hebbal", "ulsoor", "sankey", "agara"):
        assert lake_id in output


def test_unknown_command_exits_nonzero() -> None:
    result = runner.invoke(app, ["flap-jacks"])
    assert result.exit_code != 0


def test_hello_bangalore_help_shows_flags() -> None:
    result = runner.invoke(app, ["hello-bangalore", "--help"])
    assert result.exit_code == 0
    output = _plain(result.output)
    assert "--days" in output
    assert "--cloud-pct" in output
    assert "--output-dir" in output


def test_fetch_lakes_help_shows_flags() -> None:
    result = runner.invoke(app, ["fetch-lakes", "--help"])
    assert result.exit_code == 0
    output = _plain(result.output)
    assert "--lakes" in output
    assert "--skip-geotiff" in output
