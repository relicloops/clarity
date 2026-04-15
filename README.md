# Clarity

A clean, modern Sphinx theme with a phosphor-green / UV-violet dual-accent
palette and a built-in AI documentation assistant.

## Features

- **Dark / light / system** theme toggle, remembered across visits
- **Dual-accent palette** -- phosphor-green in dark mode, UV-violet in light
- **Three-column layout** -- sidebar, content, on-this-page table of contents
- **Responsive** -- works on desktop, tablet, and mobile
- **Keyboard navigation** -- arrow keys for prev/next, `/` to focus search
- **Text size controls** -- readers can scale the article 75 % -- 150 %
- **Language-tagged code blocks** with Pygments-styled syntax colors
- **Dual logo support** -- different images for dark and light modes
- **AI assistant** -- page-aware chatbot with `/goto` navigation and `/read`
  page-summarization commands, powered by your own OpenRouter key
- **GDPR / ePrivacy consent** -- built-in banner, no third-party plugins,
  nothing stored until the reader accepts

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
the reader's own browser and don't affect anyone else.

### 8. Keep going

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
