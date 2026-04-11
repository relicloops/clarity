Changelog
=========

v1.0.2
------

- Text size controls now scale all elements: headings, code blocks, and tables
- Sidebar shows full release version (e.g. v1.0.2 instead of v1.0)
- Makefile dev/prod switch: ``make serve-dev`` uses local theme source

v1.0.1
------

- Header search input with styled search results page
- Text size controls (+/-) with localStorage persistence
- Search result location badges showing matched section
- Scroll-to and pulse animation for highlighted search terms on target pages
- Reorganized docs into source/build directory structure with Makefile and venv

v1.0.0
------

*Initial release.*

- Dual-accent color system: phosphor-green (dark) / UV-violet (light)
- Dark / light / system theme toggle with localStorage persistence
- Two font stacks: default (Orbitron / Inter / Intel One Mono) and system
- Custom Pygments styles: ``clarity-dark`` and ``clarity-light``
- Three-column layout: sidebar, content, table of contents
- Responsive breakpoints at 1100px, 900px, and 640px
- Keyboard navigation: arrow keys (prev/next), ``/`` (search)
- Code block language badges
- Back-to-top button with phosphor glow
- Styled admonitions: note, tip, warning, danger, important, seealso, deprecated
- Breadcrumb navigation
- Previous / next page links
- Dual logo support (separate images for dark and light modes)
- PyPI publishing pipeline via GitHub Actions (OIDC trusted publishing)
