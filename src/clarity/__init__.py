from __future__ import annotations

from importlib.metadata import PackageNotFoundError, version as _pkg_version
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sphinx.application import Sphinx

try:
    __version__ = _pkg_version("sphinx-clarity")
except PackageNotFoundError:  # pragma: no cover - only when running from source without install
    __version__ = "0.0.0.0"


def get_html_theme_path() -> str:
    return str(Path(__file__).parent)


def setup(app: Sphinx) -> dict:
    app.add_html_theme("clarity", str(Path(__file__).parent))

    return {
        "version": __version__,
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
