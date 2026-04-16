# Clarity

A clean, modern Sphinx theme with a phosphor-green / UV-violet dual-accent
palette and a built-in AI documentation assistant.

## Features

- **Dark / light / system** theme toggle with Unicode glyphs (sun / moon / half-circle), remembered across visits
- **Dual-accent palette** -- phosphor-green in dark mode, UV-violet in light
- **Three-column layout** -- sidebar, content, collapsible on-this-page table of contents (sticky on desktop, collapsible below header on mobile)
- **Responsive** -- desktop, tablet, and mobile breakpoints at 1100 / 900 / 640 px
- **Keyboard navigation** -- arrow keys for prev/next, `/` to focus search
- **Text size controls** -- readers can scale the article 75 % -- 150 %, all components scale together (em units)
- **Language-tagged code blocks** with extended Pygments token coverage for Python, Rust, Go, JS, C
- **Dual logo support** -- different images for dark and light modes
- **AI assistant** -- page-aware chatbot with `/goto` navigation, `/read` page-summarization, and a `⚙` settings overlay where readers can override model, temperature, reasoning effort, and every other `chatbot_*` option from `conf.py` at runtime
- **Draggable and resizable** chatbot panel with geometry persistence, minimize/restore toggle (`─` / `□`), and container queries for responsive inner layout
- **GDPR / ePrivacy consent** -- built-in banner, no third-party plugins, nothing stored until the reader accepts. Google Fonts loaded only after consent
- **Update checker** -- opt-in PyPI version check (consent-gated, `Opt+U` / `Alt+U` keybinding). Shows a top banner with links to every newer release, and a rainbow-glowing `⊛` spinner in the header while checking
- **Retro 404 page** -- Press Start 2P pixelated font for the 404 heading (consent-gated Google Font, falls back to system when declined)
- **Version warning** -- orange sidebar badge when `release` or `version` is missing from `conf.py`, plus a DevTools console warning so deployers notice before publishing
- **Sidebar version display** -- auto-prefixes `v` when the release string doesn't start with one; supports the `vMAJOR.MINOR.PATCH-BUILD` tag format
- **6 built-in skins** -- Unicorn (pastel light), Programmer (clean docs light), Matrix (green-on-black), Rainbow (saturated rainbow light), Darcula (deep dark), Coder (editor dark). Footer selector lets readers switch; deployers set a default via `skin` in `conf.py`. When a skin is active, the dark/light/system toggle is disabled

## Install

```bash
pip install sphinx-clarity
```

## Quick start

Create a new Sphinx project (if you do not already have one):

```bash
mkdir docs && cd docs
sphinx-quickstart
```

Edit `conf.py` to use Clarity:

```python
html_theme = "clarity"

html_theme_options = {
    "default_theme": "system",    # "dark", "light", or "system"
    "font_stack": "default",      # "default" or "system" (no remote fonts)
    "navigation_with_keys": True,
    "show_toc_level": 2,
}
```

Build and serve locally:

```bash
sphinx-build -b html . _build/html
python -m http.server -d _build/html 8000
```

Open http://localhost:8000.

## Optional: enable the AI assistant

Add your OpenRouter settings to `conf.py`:

```python
html_theme_options = {
    # ...
    "chatbot_enabled": True,
    "chatbot_model": "openai/gpt-oss-120b:free",
}
```

The reader supplies their own OpenRouter key in the chat panel -- it is
stored locally in the browser, never sent to you. Set
`"chatbot_enabled": False` to ship the theme without the assistant.

## Add a logo

Drop logo files into your Sphinx `_static/` folder and reference them:

```python
html_theme_options = {
    # ...
    "light_logo": "logo-light.svg",
    "dark_logo": "logo-dark.svg",
}
```

## Full walkthrough -- from zero to a docs site

This is a longer recipe for someone who is new to Sphinx. It mirrors how
Clarity's own docs are organized, so you end up with a similar layout.

### 1. Create a new project

```bash
mkdir my-docs && cd my-docs
python -m venv .venv
source .venv/bin/activate
pip install sphinx sphinx-clarity
sphinx-quickstart docs
```

Accept the prompts (separate source and build directories, project
title, author, release). You now have:

```
my-docs/
  docs/
    Makefile
    make.bat
    source/
      conf.py
      index.rst
    build/
```

### 2. Switch to Clarity

Open `docs/source/conf.py` and replace the `html_theme` line, then add
a minimal options block:

```python
html_theme = "clarity"

html_theme_options = {
    "default_theme": "system",
    "font_stack": "default",
    "navigation_with_keys": True,
    "show_toc_level": 2,
}
```

If you set `release = "v0.1.0-000"` near the top of `conf.py`, Clarity
shows the tag in the sidebar. When `release` is missing, an orange
"version not set in conf.py" warning appears in the sidebar so you
remember to fill it in before publishing.

### 3. Write your first page

Edit `docs/source/index.rst`:

```rst
My Project
==========

Welcome!

.. toctree::
   :maxdepth: 2

   guide
```

Create `docs/source/guide.rst` alongside it:

```rst
Getting Started
===============

Install::

   pip install my-project
```

### 4. Build and preview

```bash
sphinx-build -b html docs/source docs/build/html
python -m http.server -d docs/build/html 8000
```

Open <http://localhost:8000>. Toggle the theme, scale the text with the
`-` / `+` buttons, try the keyboard navigation.

### 5. Add a logo (optional)

Put your logo files in `docs/source/_static/` and reference them from
`conf.py`:

```python
html_theme_options = {
    # ...
    "light_logo": "logo-light.svg",
    "dark_logo": "logo-dark.svg",
}
```

### 6. Enable the AI assistant (optional)

Flip on the chatbot and pick a model:

```python
html_theme_options = {
    # ...
    "chatbot_enabled": True,
    "chatbot_model": "openai/gpt-oss-120b:free",
}
```

Rebuild. Each reader opens the chat with the `∂` button, pastes their
own OpenRouter key (stored only in their browser), and can ask
questions about the current page.

### 7. Tweak the assistant at runtime

Click the `⚙` button in the chat panel to open the settings overlay.
Every `chatbot_*` option from `conf.py` is editable there -- model,
temperature, reasoning effort, system prompt. Overrides are saved in
the reader's own browser and don't affect anyone else. Hover any field
to see a one-line explanation in the warning bar at the bottom of the
overlay.

### 8. Enable the update checker (optional)

```python
html_theme_options = {
    # ...
    "update_check": True,
}
```

When enabled (and after the reader accepts the privacy banner), the
theme checks PyPI once per tab session for newer versions of
`sphinx-clarity`. If any exist, a top banner appears with version
links and a `pip install --upgrade` hint. The banner is dismissible
and stays dismissed permanently (stored in localStorage).

You can also press `Opt+U` (macOS) or `Alt+U` (Win/Linux) to force
a fresh check at any time -- it bypasses the cache and the dismissed
state. A rainbow-glowing `⊛` spinner appears in the header while the
check runs.

### 9. Add a retro 404 page (optional)

```python
html_theme_options = {
    # ...
    "retro_404": True,
}

html_additional_pages = {"404": "notfound.html"}
```

Builds a `404.html` with a neon-glow `404` heading in the Press
Start 2P pixelated font (loaded via Google Fonts after consent).
Most hosting providers serve `404.html` automatically for missing
paths. Falls back to the heading font when consent is declined or
`retro_404` is `False`.

### 10. Pick a skin (optional)

The footer has a "Skin" dropdown. Readers can switch at any time.
To set a default for your site:

```python
html_theme_options = {
    # ...
    "skin": "matrix",  # or "unicorn", "programmer", "rainbow", "darcula", "coder"
}
```

When a skin is active, the dark/light/system toggle disappears -- the
skin controls the full palette. Switching back to "Default" restores
the toggle.

### 11. Keep going

- `configuration.rst` -- every `html_theme_options` field and default.
- `chatbot.rst` -- assistant setup, slash commands, settings overlay.
- `privacy.rst` -- exactly what Clarity stores and where.

You can add more pages to `docs/source/`, link them from the `toctree`
in `index.rst`, and rerun `sphinx-build`. That's the whole loop.

## Documentation

Full documentation -- configuration reference, privacy details, chatbot
setup -- is published at the project docs site, and the sources live
under `docs/source/` on
[GitHub](https://github.com/relicloops/clarity/tree/main/docs/source)
if you prefer to browse them there.

## License

Apache-2.0
