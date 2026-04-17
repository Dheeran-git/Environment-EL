"""Tests for :mod:`bangalore_lakes.logging_setup`."""

from __future__ import annotations

import logging

import pytest

from bangalore_lakes.logging_setup import configure_logging, get_logger


def test_configure_sets_level() -> None:
    configure_logging("WARNING")
    assert logging.getLogger().level == logging.WARNING


def test_configure_is_idempotent() -> None:
    configure_logging("INFO")
    configure_logging("DEBUG")
    # Only one handler attached after repeated calls (idempotent).
    assert len(logging.getLogger().handlers) == 1


def test_bad_level_rejected() -> None:
    with pytest.raises(ValueError):
        configure_logging("LOUD")


def test_get_logger_returns_bound_logger() -> None:
    configure_logging("INFO")
    log = get_logger("test")
    # Smoke test — calling info() must not raise.
    log.info("hello", key="value")
