# Changelog


## v1.2.2 (2026-04-14)


### Bug Fixes

- Use absolute GitHub URL in README to avoid myst xref error (63467c2)

## v1.2.1 (2026-04-14)


### Bug Fixes

- Declare docs extra with myst-parser so docs job installs it (e80a38a)

### Miscellaneous

- V1.2.1 (6f23c92)

## v1.2.0 (2026-04-14)


### Bug Fixes

- Highlight last TOC heading when page is scrolled to bottom (3f93fbe)

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

### Build

- Add myst_parser, delegate changelog to generated CHANGELOG.md (3cb0ab3)

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
