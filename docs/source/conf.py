"""Clarity theme documentation -- dogfooding the theme itself."""

project = "Clarity"
copyright = "2026, Simone Del Popolo"
author = "Simone Del Popolo"
version = "1.0"
release = "1.0.3"

extensions = []

templates_path = ["_templates"]
exclude_patterns = ["Thumbs.db", ".DS_Store"]

# -- Theme -----------------------------------------------------------------

html_theme = "clarity"
html_theme_options = {
    "default_theme": "system",
    "font_stack": "default",
    "navigation_with_keys": True,
    "show_toc_level": 2,
}

html_static_path = ["_static"]
html_title = "Clarity"
html_short_title = "Clarity"

# Pygments style is set by theme.conf (clarity-dark / clarity-light)
