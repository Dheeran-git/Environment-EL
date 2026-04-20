.PHONY: install test test-integration lint fmt run-day1 run-day2 run-timeseries run-insights serve clean auth help

PY ?= python
PIP ?= $(PY) -m pip

help:
	@echo "Targets:"
	@echo "  install           Install package + dev deps (pip install -e '.[dev]')"
	@echo "  test              Run unit tests (no GEE auth required)"
	@echo "  test-integration  Run integration tests (requires EE_TEST_AUTH=1 + GEE auth)"
	@echo "  lint              ruff check + black --check"
	@echo "  fmt               ruff --fix + black"
	@echo "  run-day1          bangalore-lakes hello-bangalore"
	@echo "  run-day2          bangalore-lakes fetch-lakes"
	@echo "  run-timeseries    bangalore-lakes compute-timeseries"
	@echo "  run-insights      bangalore-lakes compute-insights --analytics-run-dir ..."
	@echo "  serve             Launch the web viewer at http://127.0.0.1:8000"
	@echo "  auth              earthengine authenticate"
	@echo "  clean             Remove build artifacts and outputs"

install:
	$(PIP) install -e ".[dev]"

test:
	$(PY) -m pytest -m "not integration"

test-integration:
	EE_TEST_AUTH=1 $(PY) -m pytest -m integration

lint:
	$(PY) -m ruff check .
	$(PY) -m black --check .

fmt:
	$(PY) -m ruff check --fix .
	$(PY) -m black .

run-day1:
	bangalore-lakes hello-bangalore

run-day2:
	bangalore-lakes fetch-lakes

run-timeseries:
	bangalore-lakes compute-timeseries

run-insights:
	@if [ -z "$(RUN_DIR)" ]; then echo "Usage: make run-insights RUN_DIR=outputs/analytics/<run_id>"; exit 1; fi
	bangalore-lakes compute-insights --analytics-run-dir $(RUN_DIR)

serve:
	bangalore-lakes serve

auth:
	earthengine authenticate

clean:
	rm -rf build/ dist/ *.egg-info src/*.egg-info
	rm -rf .pytest_cache .ruff_cache .coverage htmlcov coverage.xml
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	rm -rf outputs/day1 outputs/day2
