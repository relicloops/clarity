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


def _inject_theme_version(app, pagename, templatename, context, doctree):
    """Expose the *theme's* installed version to Jinja templates.

    Without this, layout.html would fall back to the docs site's own
    ``release`` / ``version`` from the consumer's ``conf.py`` when
    emitting ``data-clarity-version``. That value drives update-check.js,
    which must compare the installed ``sphinx-clarity`` wheel against
    PyPI -- not the consuming project's own release string.
    """
    context["clarity_theme_version"] = __version__


def setup(app: Sphinx) -> dict:
    app.add_html_theme("clarity", str(Path(__file__).parent))
    app.connect("html-page-context", _inject_theme_version)

    return {
        "version": __version__,
        "parallel_read_safe": True,
        "parallel_write_safe": True,
    }
