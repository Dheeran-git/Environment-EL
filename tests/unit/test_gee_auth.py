"""Tests for :mod:`bangalore_lakes.gee.auth` using a stubbed ``ee`` module."""

from __future__ import annotations

import json
import sys
import types
from pathlib import Path

import pytest

from bangalore_lakes.config import Settings


class _FakeEEException(Exception):
    """Mimic ``ee.EEException``."""


def _install_fake_ee(monkeypatch: pytest.MonkeyPatch, *, fail_init: bool = False) -> dict:
    """Install a minimal fake ``ee`` module; return a record of calls."""
    calls: dict = {"initialize": [], "sa_credentials": []}

    fake = types.ModuleType("ee")
    fake.EEException = _FakeEEException

    class _SACreds:
        def __init__(self, email, key_file):
            self.email = email
            self.key_file = key_file
            calls["sa_credentials"].append((email, key_file))

    def _initialize(credentials=None, *, project=None):
        if fail_init:
            raise _FakeEEException("boom")
        calls["initialize"].append({"credentials": credentials, "project": project})

    class _Number:
        def __init__(self, v):
            self._v = v

        def getInfo(self):
            return self._v

    fake.ServiceAccountCredentials = _SACreds
    fake.Initialize = _initialize
    fake.Number = _Number

    monkeypatch.setitem(sys.modules, "ee", fake)
    return calls


def test_user_auth_path(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = _install_fake_ee(monkeypatch)
    from bangalore_lakes.gee.auth import initialize_ee

    settings = Settings(gee_project_id="my-proj")
    info = initialize_ee(settings)
    assert info.project_id == "my-proj"
    assert info.round_trip_value == 1
    assert info.account == "user-credentials"
    assert calls["initialize"] == [{"credentials": None, "project": "my-proj"}]
    assert calls["sa_credentials"] == []


def test_service_account_path_reads_email_from_json(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    calls = _install_fake_ee(monkeypatch)
    from bangalore_lakes.gee.auth import initialize_ee

    key_file = tmp_path / "sa.json"
    key_file.write_text(json.dumps({"client_email": "robot@example.iam.gserviceaccount.com"}))

    settings = Settings(gee_project_id="my-proj", gee_service_account_json=key_file)
    info = initialize_ee(settings)
    assert info.account == "robot@example.iam.gserviceaccount.com"
    assert calls["sa_credentials"][0][0] == "robot@example.iam.gserviceaccount.com"
    assert calls["initialize"][0]["project"] == "my-proj"


def test_service_account_email_override(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    _install_fake_ee(monkeypatch)
    from bangalore_lakes.gee.auth import initialize_ee

    key_file = tmp_path / "sa.json"
    key_file.write_text(json.dumps({"client_email": "ignored@example.com"}))

    settings = Settings(
        gee_project_id="my-proj",
        gee_service_account_json=key_file,
        gee_service_account_email="override@example.com",
    )
    info = initialize_ee(settings)
    assert info.account == "override@example.com"


def test_missing_project_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_fake_ee(monkeypatch)
    from bangalore_lakes.gee.auth import GEEAuthError, initialize_ee

    with pytest.raises(GEEAuthError, match="project id"):
        initialize_ee(Settings())


def test_initialize_failure_wrapped(monkeypatch: pytest.MonkeyPatch) -> None:
    _install_fake_ee(monkeypatch, fail_init=True)
    from bangalore_lakes.gee.auth import GEEAuthError, initialize_ee

    with pytest.raises(GEEAuthError, match="ee.Initialize failed"):
        initialize_ee(Settings(gee_project_id="my-proj"))


def test_missing_client_email_raises(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    _install_fake_ee(monkeypatch)
    from bangalore_lakes.gee.auth import GEEAuthError, initialize_ee

    key_file = tmp_path / "bad.json"
    key_file.write_text(json.dumps({"other": "value"}))

    settings = Settings(gee_project_id="my-proj", gee_service_account_json=key_file)
    with pytest.raises(GEEAuthError, match="client_email"):
        initialize_ee(settings)
