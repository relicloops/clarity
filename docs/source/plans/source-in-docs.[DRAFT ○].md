---
title: Include src/ into the docs -- architecture tour and file reference
tags:
  - "#clarity"
  - "#docs"
  - "#source-reference"
status: draft
updated: 2026-04-17
priority: medium
phase: design
---

# Include `src/` into the Docs

## Goal

The Sphinx docs currently describe the theme from the **consumer's**
point of view (install it, configure it, toggle themes, use the
chatbot). There is no chapter that describes the theme's own internals
-- the Jinja templates, the CSS token layer, the IIFE JS files, the
Python entry point, `theme.conf`, the 6 skins.

Two audiences benefit from including `src/` in the docs:

1. **Maintainers / contributors** -- want to understand the internal
   architecture before editing.
2. **Advanced deployers** -- want to subclass a template, write a
   custom skin, or hook a new IIFE into the existing consent/storage
   machinery.

This plan evaluates several ways to surface `src/` in the docs and
proposes a recommended path.

---

## Inventory: what needs to be documented

| Layer | Files | Size | Already commented? |
|-------|-------|------|--------------------|
| Python | `__init__.py`, `pygments_styles.py` | ~170 lines | Minimal |
| Jinja | `layout.html`, `sidebar.html`, `theme-toggle.html`, `chatbot.html`, `consent.html`, `notfound.html` | ~500 lines | Sparse |
| Config | `theme.conf` | ~25 lines | Inline only |
| CSS (core) | `clarity.css`, `components.css`, `code-blocks.css`, `responsive.css`, `chatbot.css`, `consent.css`, `search-results.css` | ~4,500 lines | Banner comments exist |
| CSS (skins) | `skins/{unicorn,programmer,matrix,rainbow,darcula,coder}.css` | 6 files | Banner only |
| JS | `clarity.js`, `theme-toggle.js`, `consent.js`, `search-enhance.js`, `skin-switcher.js`, `update-check.js`, `chatbot*.js` (5 files) | ~3,300 lines | Sparse |

Totals: ~22 source files across 5 layers.

---

## Options evaluated

### Option A -- Pure `literalinclude` embedding

Each src file gets a doc page that uses Sphinx's `literalinclude`
directive to embed the file verbatim with syntax highlighting.

```rst
.. literalinclude:: ../../src/clarity/static/js/theme-toggle.js
   :language: javascript
   :linenos:
```

- **Pro**: zero refactoring. Files always match reality.
- **Pro**: readers can copy-paste working code.
- **Con**: 7,800+ lines of raw code in the docs is noise, not docs.
- **Con**: no narrative -- the reader has to infer intent from code.
- **Con**: the build-time copy may drift from what's useful to document.

Verdict: not a stand-alone solution. Useful as a **supporting
directive** inside narrative pages (e.g. show the skin token
contract from `skins/matrix.css`).

---

### Option B -- Python `autodoc` only

Sphinx's `autodoc` extension introspects Python modules and renders
their docstrings. Would cover `__init__.py` and `pygments_styles.py`.

- **Pro**: idiomatic Sphinx, already understood.
- **Con**: only covers ~2% of the codebase. Jinja, CSS, and JS are
  opaque to `autodoc`.

Verdict: use it for the Python layer only, paired with another
approach for the rest.

---

### Option C -- JSDoc + `sphinx-js`

Add JSDoc-style comments to every IIFE and use the `sphinx-js`
extension to extract them into RST.

```js
/**
 * Skin switcher IIFE.
 *
 * @summary Loads a skin CSS file and toggles data-skin on <html>.
 * @storage localStorage['clarity-skin']
 * @consent-gated yes
 */
(function () { ... })();
```

- **Pro**: standardized, tool-assisted extraction.
- **Pro**: forces a uniform comment contract across JS files.
- **Con**: adds `jsdoc` + `sphinx-js` + Node.js to the docs build
  toolchain. Currently the docs build is pure Python.
- **Con**: JSDoc's model (classes, functions, modules) is a poor fit
  for IIFE-scoped files whose surface is side effects + storage keys
  + DOM events.

Verdict: rejected. Too much tooling overhead for a small codebase
whose JS surface is better described narratively.

---

### Option D -- Hand-written architecture guide

A new top-level chapter **"Internals"** with hand-written pages that
explain how each layer works. Code samples are pulled in with
`literalinclude` where useful; the rest is prose + tables + diagrams.

Example TOC:

```
Internals
  Overview (the three layers + Python shim)
  Python package
    setup() entry point
    Pygments styles
  Jinja templates
    layout.html and block structure
    Partials (sidebar, theme-toggle, chatbot, consent)
    404 page (notfound.html)
  Theme configuration
    theme.conf options
    How Jinja reads theme_<option>
  CSS architecture
    Token layer and dual-theme
    Responsive breakpoints and container queries
    Skin override specificity
  JavaScript architecture
    IIFE + strict-mode contract
    Consent gate and storage keys
    MutationObserver patterns
    Early inline skin loader
    File reference
      clarity.js
      theme-toggle.js
      consent.js
      ... (one section per JS file, not one page)
  Skins
    Creating a custom skin
    Token contract
    Per-skin font strategy
```

- **Pro**: readable, explains *why* not just *what*.
- **Pro**: no new tooling.
- **Pro**: the architecture stays intelligible when src files change.
- **Con**: the prose can drift from the code. Mitigated by pulling
  concrete examples via `literalinclude` instead of retyping them.
- **Con**: writing work is larger than Option A.

Verdict: **the main approach**. Best fit for a theme whose value is
in conventions and patterns, not raw API surface.

---

### Option E -- Auto-generated file reference

A small build-time script scans `src/` and emits one `.rst` stub per
file with:

- A link to the file on GitHub
- Metadata (size, language, last modified)
- A `literalinclude` of the file
- Any hand-written notes stored in a sidecar YAML

- **Pro**: inventory is always current.
- **Con**: still reads like a file dump, not like docs. Low payoff per
  unit of maintenance effort.

Verdict: nice-to-have. A future v2 layer *on top of* Option D, not
a replacement.

---

### Option F -- Inline source viewer (client-side)

A widget that fetches the src file from a static path and renders it
with Prism / highlight.js on demand, similar to "View source" links
on MDN.

- **Pro**: keeps the docs page small; code is lazy-loaded.
- **Con**: requires a CI step to copy `src/` into the docs static
  path. Adds one more build wrinkle.
- **Con**: doesn't work offline-first -- fetch requires a server.

Verdict: defer. If readers ask for a "view source" affordance, revisit.

---

## Should we refactor `src/` with comments first?

### The argument FOR refactoring first

Before writing the Internals chapter, add a consistent file header and
section banners to every src file. This turns "the src is the source
of truth" into a real contract:

```js
/* ==========================================================================
   theme-toggle.js -- dark / light / system cycle
   --------------------------------------------------------------------------
   Storage   : localStorage['clarity-theme'] (consent-gated)
              window.name fallback for file:// docs
   DOM hooks : #theme-toggle button, <html data-theme>, <html data-theme-setting>
   Events    : click on #theme-toggle, matchMedia change, storage event
   ========================================================================== */
```

- **Pro**: every file self-describes. The header is discoverable
  without leaving the file.
- **Pro**: standardizes the mental model (storage keys, DOM hooks,
  events) across the JS/CSS layer.
- **Pro**: makes Option E (auto-generated reference) trivial later --
  the sidecar is already in the file.
- **Con**: touches all src files. Mechanical but noisy diff.
- **Con**: comments drift unless tied to CI validation.

### The argument AGAINST refactoring first

- Comments ARE documentation. Writing Internals pages covers the same
  ground in a more durable form.
- Large comment-only diffs are noisy in git blame and hide intent in
  future PRs.

### Recommendation

**Partial refactor**, limited to:

1. A file-header block for every JS file and every CSS top-level file
   (not skins -- those are palettes). The header uses the contract
   shown above.
2. No body-level line comments unless the WHY is non-obvious
   (per project CLAUDE.md rules).
3. For Jinja templates: a single `{#- ... -#}` comment at the top
   naming the file's role and the blocks it defines/overrides.
4. For Python: full docstrings on public functions (`setup`,
   `get_html_theme_path`) and the style classes.

This keeps the file-level summary tight and defers the deep
explanations to the Internals chapter.

---

## How to organize the docs chapter

Three organization axes were considered:

### Axis 1 -- by layer (recommended)

```
Internals
  Python
  Jinja
  Theme config
  CSS
  JS
  Skins
```

- Matches the three-layer rule in `CLAUDE.md` ("its three layers have
  separate responsibilities and must not be collapsed").
- Each layer is small enough to be its own page, large enough to
  justify one.

### Axis 2 -- by feature

```
Internals
  Theme toggle (HTML + CSS + JS across files)
  Chatbot (chatbot.html + chatbot.css + 5 chatbot-*.js)
  Consent (consent.html + consent.css + consent.js)
  ...
```

- Pros: great for "I want to change how the chatbot works".
- Cons: duplicates content from the user guide chatbot/consent pages.
  Cross-cutting concerns (token layer, consent gate) don't belong to
  a single feature.

### Axis 3 -- by file

```
Internals
  src/clarity/layout.html
  src/clarity/sidebar.html
  src/clarity/static/css/clarity.css
  ...
```

- Pros: 1:1 mapping, easy to scaffold.
- Cons: reads like a file dump. The reader has to assemble the model.

### Hybrid (chosen)

**Primary axis = by layer** (Axis 1).
**Secondary**: within each layer, a short "file reference" section
that lists every file in the layer with a 1-3 line summary and a
`literalinclude` fold-out for readers who want to see the whole file.

Cross-cutting patterns (consent gate, storage keys, MutationObserver
usage, the early inline skin loader) get their own pages under
"JavaScript architecture" so they aren't buried inside one file's
entry.

---

## Recommended plan

### Phase 0 -- light refactor (prep, ~1 day)

- Add file-header banner to every `.js` and top-level `.css` file.
- Add `{#- ... -#}` role line to every `.html` template.
- Add/tighten docstrings on `__init__.py` and `pygments_styles.py`.
- No behavior changes, no logic comments.

### Phase 1 -- Internals chapter scaffold (~0.5 day)

Create `docs/source/internals/` with:

```
internals/
  index.rst              (TOC + one-page overview of the 3 layers)
  python.rst             (autodoc for the Python package)
  jinja.rst              (template inheritance + blocks + partials)
  theme-conf.rst         (options table + how Jinja reads them)
  css/
    index.rst
    tokens.rst           (custom properties, dual-theme selectors)
    responsive.rst       (breakpoints + container queries in chatbot)
    file-reference.rst   (one section per core CSS file)
  js/
    index.rst
    iife-contract.rst    (IIFE + use strict pattern)
    consent-and-storage.rst
    mutation-observer-patterns.rst
    early-skin-loader.rst
    file-reference.rst
  skins/
    index.rst
    token-contract.rst   (what a skin MUST define)
    writing-a-skin.rst   (step-by-step)
    file-reference.rst
```

Add to `docs/source/index.rst` under a new toctree caption
`Internals` (between `User Guide` and `Reference`).

### Phase 2 -- write the layer overviews (~2 days)

Narrative pages explaining the WHY of each layer. Code samples via
`literalinclude` with `:lines:` slices for focused excerpts, not
whole-file dumps.

### Phase 3 -- cross-cutting pattern pages (~1 day)

The four JS pattern pages (`consent-and-storage`,
`mutation-observer-patterns`, `iife-contract`, `early-skin-loader`).
These are the parts that are hardest to infer from any single file.

### Phase 4 -- file reference sections (~1 day)

For each file:

- Name + one-line summary (matches the file-header banner from Phase 0)
- Storage keys it touches (for JS)
- DOM hooks / event listeners
- Cross-refs to related files
- Collapsed `literalinclude` for the whole file

Use a custom RST include pattern so the file reference stays
mechanical to maintain.

### Phase 5 -- verification

1. `make html-dev` -- docs build with zero warnings under `-W`.
2. Navigate `Internals -> JavaScript -> theme-toggle.js` -- landed on
   the right section, `literalinclude` renders correctly.
3. Search for "localStorage" -- results include the
   `consent-and-storage.rst` page.
4. View in all 6 skins -- content readable everywhere (no hardcoded
   colors).

---

## Files to create

| File | Content |
|------|---------|
| `docs/source/internals/index.rst` | Chapter landing + toctree |
| `docs/source/internals/python.rst` | autodoc + prose |
| `docs/source/internals/jinja.rst` | template layout + blocks |
| `docs/source/internals/theme-conf.rst` | options table |
| `docs/source/internals/css/*.rst` | ~4 pages |
| `docs/source/internals/js/*.rst` | ~5 pages |
| `docs/source/internals/skins/*.rst` | ~3 pages |

## Files to modify

| File | Change |
|------|--------|
| `docs/source/index.rst` | Add `Internals` toctree caption |
| `docs/source/conf.py` | Enable `sphinx.ext.autodoc` + set `autodoc_default_options` |
| Every `.js` in `src/clarity/static/js/` | File-header banner |
| Core `.css` in `src/clarity/static/css/` | File-header banner |
| `src/clarity/*.html` | Top `{#- ... -#}` role line |
| `src/clarity/__init__.py` | Docstrings |
| `src/clarity/pygments_styles.py` | Docstrings on style classes |

No changes to `src/clarity/static/css/skins/*.css` beyond what they
already have (they are palettes, not logic).

---

## Open questions

1. **autodoc for JS?** Rejected above (Option C). Reconsider only if
   the JS surface grows past ~5,000 lines.
2. **Include `docs/Makefile` and `pyproject.toml` in Internals?** Yes,
   under a short "Build and release" subsection at the chapter root,
   linking to `maintainer-workflow.rst` rather than duplicating it.
3. **Versioning the Internals chapter?** It describes the in-tree
   code, so it's implicitly versioned with the release. No separate
   versioning.
4. **Publish src/ on the docs site as static assets?** Not needed --
   readers can click through to the GitHub file links.

---

## Not in scope

- Full-file `literalinclude` dumps as the primary delivery (Option A).
- Auto-generated file reference (Option E) -- deferred until Phase 0
  headers exist.
- Client-side source viewer (Option F) -- deferred.
- Migration of audits or existing reference pages into `internals/`.
