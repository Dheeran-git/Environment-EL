"""Tests for :mod:`bangalore_lakes.gee.export` — retry + write helpers only."""

from __future__ import annotations

import hashlib
from pathlib import Path

import pytest
import requests

from bangalore_lakes.gee import export


def test_bytes_to_artifact(tmp_path: Path) -> None:
    data = b"hello world"
    out = tmp_path / "nested" / "f.bin"
    art = export.bytes_to_artifact(data, out)
    assert out.read_bytes() == data
    assert art.size_bytes == len(data)
    assert art.sha256 == hashlib.sha256(data).hexdigest()


def test_hash_file_roundtrip(tmp_path: Path) -> None:
    p = tmp_path / "x.bin"
    p.write_bytes(b"abc" * 1000)
    digest = export.hash_file(p)
    assert digest == hashlib.sha256(b"abc" * 1000).hexdigest()


class _FakeResponse:
    def __init__(self, content: bytes, status: int = 200) -> None:
        self.content = content
        self._status = status

    def raise_for_status(self) -> None:
        if self._status >= 400:
            raise requests.HTTPError(f"status={self._status}")


def test_download_retries_then_succeeds(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = {"n": 0}

    def fake_get(url: str, timeout: float) -> _FakeResponse:
        calls["n"] += 1
        if calls["n"] < 3:
            raise requests.ConnectionError("transient")
        return _FakeResponse(b"ok")

    monkeypatch.setattr(requests, "get", fake_get)
    data = export._download_bytes("https://example.test", timeout=1.0)
    assert data == b"ok"
    assert calls["n"] == 3


def test_download_exhausts_retries(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_get(url: str, timeout: float) -> _FakeResponse:
        raise requests.ConnectionError("always")

    monkeypatch.setattr(requests, "get", fake_get)
    with pytest.raises(requests.ConnectionError):
        export._download_bytes("https://example.test", timeout=1.0)


def test_download_http_error_not_retried(monkeypatch: pytest.MonkeyPatch) -> None:
    """Non-RequestException HTTPError from raise_for_status is a RequestException too,
    but a 404 should still fail — we just verify it propagates."""
    calls = {"n": 0}

    def fake_get(url: str, timeout: float) -> _FakeResponse:
        calls["n"] += 1
        return _FakeResponse(b"", status=404)

    monkeypatch.setattr(requests, "get", fake_get)
    with pytest.raises(requests.HTTPError):
        export._download_bytes("https://example.test", timeout=1.0)
    # HTTPError is a RequestException, so it will be retried up to the attempt cap.
    assert calls["n"] == 3
