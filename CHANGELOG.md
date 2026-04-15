# Changelog


## v1.3.0-001 (2026-04-15)


### Bug Fixes

- Harden markdown renderer against common drifts (380c97f)
- Read OpenRouter activity as 'requests' field (8a30abc)

### CI

- Translate vMAJOR.MINOR.PATCH-BUILD tag to PEP 440 on build (bbc17d9)

### Features

- Show the Sphinx project name in the panel title (0f2573d)
- Read __version__ from importlib.metadata (35f6497)
- Warn when release or version is missing from conf.py (5a925c7)
- Settings overlay, minimize/restore toggle, rate refresh (7dc37a8)
- Add settings override key and merge helpers (37d388e)

## v1.3.0-000 (2026-04-15)


### Documentation

- Complete Sphinx setup walkthrough (a3fd53f)
- Describe CI split and versioning scheme (5448c40)
- List chatbot settings override storage key (876609a)
- Cross-link to runtime settings overlay (71a0ce8)
- Document settings overlay, rate refresh, renderer hardening (ac28416)

### Miscellaneous

- V1.3.0-000 (15b14fd)

## v1.2.3 (2026-04-14)


### CI

- Bump actions to Node 24 majors (f4ca1dc)
- Split tag-publish from main gate, reuse build+docs (eeaf007)

### Miscellaneous

- V1.2.3 (de3fc00)

## v1.2.2 (2026-04-14)


### Bug Fixes

- Use absolute GitHub URL in README to avoid myst xref error (63467c2)

### Miscellaneous

- V1.2.2 (05ddb68)

## v1.2.1 (2026-04-14)


### Bug Fixes

- Declare docs extra with myst-parser so docs job installs it (e80a38a)

### Miscellaneous

- V1.2.1 (6f23c92)

## v1.2.0 (2026-04-14)


### Bug Fixes

- Highlight last TOC heading when page is scrolled to bottom (3f93fbe)

### Build

- Add myst_parser, delegate changelog to generated CHANGELOG.md (3cb0ab3)

### Documentation

- Rewrite as concise onboarding guide (3319f48)
- Add audit topic pages and 2026-04-14 snapshots (31acfd3)
- Close documentation-backlog gaps for existing pages (5b5c403)
- Add readme.rst that includes the repo README.md (dbd392a)
- Navigation-and-controls + maintainer-workflow pages (c70567f)
- Chatbot feature guide (7cab027)
- Consent banner and privacy pages (5bbc9eb)

### Features

- Mobile TOC sticky below header, em units (c00489a)
- Theme-toggle glyphs, sticky text-size, collapsible TOC, back-to-top (69516f4)
- Em units and extended Pygments token coverage (0c50f66)
- Responsive TOC with mobile auto-close (f94edaa)
- Consent-gate text-size persistence (7feaff7)
- Collapsible TOC, sidebar_hide_name option, data-nav-keys (a8cfeb2)
- Include chatbot panel + assets, gated on theme_chatbot_enabled (09e14aa)
- Wire consent banner, move Google Fonts behind consent (a7c7763)
- Page-aware AI documentation assistant via OpenRouter (64501c9)
- Built-in GDPR / ePrivacy consent banner (6894587)

### Miscellaneous

- V1.2.0 (ab99939)
- Add git-cliff config for changelog generation (0532377)
- Ignore .prompt/ canonical instructions dir (23b7344)

### Style

- Switch to em units for text-size scaling (960e595)
- Replace SVG icons with Unicode glyphs (fd1a28f)

## v1.0.3 (2026-04-11)


### Bug Fixes

- Table font-size scaling with text size controls (8e89725)

## v1.0.2 (2026-04-11)


### Features

- Full-article text scaling, full version in sidebar, dev/prod Makefile (71fc217)

## v1.0.1 (2026-04-11)


### Bug Fixes

- Update CI docs build path for source/build layout (c178fa4)

### Features

- Add search enhancements, text size controls, and docs restructure (2de54b4)

## v1.0.0 (2026-04-11)


### Bug Fixes

- Use explicit packages directive for hatchling wheel build (0277e57)
- Rename PyPI package to sphinx-clarity (55c906f)
- Add docs/_static/.gitkeep so CI docs build passes (9149e5e)

### Initial

- Clarity sphinx theme v1.0.0 (9babe58)
