# Clarity

A clean Sphinx theme with phosphor-green / UV-violet dual-accent color system.

## Features

- **Dual-accent color system** -- phosphor-green (`#39ff14`) in dark mode, UV-violet (`#7b2ff7`) in light mode
- **Dark / light / system** theme toggle with `localStorage` persistence
- **Two font stacks** -- default (Orbitron / Inter / Intel One Mono) or system (native OS fonts)
- **Custom Pygments styles** -- `clarity-dark` and `clarity-light` with phosphor-tinted syntax colors
- **Three-column layout** -- sidebar, content, table of contents
- **Responsive** -- desktop, tablet, mobile breakpoints
- **Keyboard navigation** -- arrow keys (prev/next), `/` (search)
- **Code block language badges**
- **Dual logo support** -- separate images for dark and light modes

## Install

```bash
pip install sphinx-clarity
```

## Usage

```python
# conf.py
html_theme = "clarity"
html_theme_options = {
    "default_theme": "system",
    "font_stack": "default",      # or "system"
    "navigation_with_keys": True,
    "show_toc_level": 2,
}
```

## License

Apache-2.0
