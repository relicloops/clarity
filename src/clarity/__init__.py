from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sphinx.application import Sphinx

__version__ = "1.0.1"


def get_html_theme_path() -> str:
    return str(Path(__file__).parent)


def setup(app: Sphinx) -> dict:
    app.add_html_theme("clarity", str(Path(__file__).parent))

    return {
        "version": __version__,
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
