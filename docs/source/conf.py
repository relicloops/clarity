"""Clarity theme documentation -- dogfooding the theme itself."""

project = "Clarity"
copyright = "2026, Simone Del Popolo"
author = "Simone Del Popolo"
# Display version follows the project's vMAJOR.MINOR.PATCH-BUILD tag
# format (see the version-bumping skill). `version` is the short form
# (MAJOR.MINOR) that Sphinx uses for generated URLs and breadcrumbs;
# `release` is the full tag form shown in the sidebar and page header.
# The PyPI-side version in pyproject.toml uses the PEP 440 4-segment
# form (e.g. 1.2.3.0) because PEP 440 rejects the hyphen syntax.
version = "1.4"
release = "v1.4.0-000"

extensions = ["myst_parser"]

templates_path = ["_templates"]
exclude_patterns = ["Thumbs.db", ".DS_Store"]

# -- Theme -----------------------------------------------------------------

html_theme = "clarity"
html_theme_options = {
    "default_theme": "system",
    "font_stack": "default",
    "navigation_with_keys": True,
    "show_toc_level": 2,
    "update_check": True,
    "retro_404": True,
}

html_static_path = ["_static"]
html_title = "Clarity"
html_short_title = "Clarity"

# Pygments style is set by theme.conf (clarity-dark / clarity-light)

# -- 404 page ---------------------------------------------------------------
# Uses the theme's notfound.html template with Press Start 2P retro font.
# Hosting providers (GitHub Pages, Netlify, Cloudflare Pages) serve this
# automatically for missing paths.

html_additional_pages = {"404": "notfound.html"}
