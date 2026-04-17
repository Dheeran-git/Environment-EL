"""Enable ``python -m bangalore_lakes ...`` as an alternative CLI entry point."""

from bangalore_lakes.cli import app

if __name__ == "__main__":
    app()
