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

## Documentation

Full documentation -- configuration reference, privacy details, chatbot
setup -- is published at the project docs site, and the sources live
under `docs/source/` on
[GitHub](https://github.com/relicloops/clarity/tree/main/docs/source)
if you prefer to browse them there.

## License

Apache-2.0
