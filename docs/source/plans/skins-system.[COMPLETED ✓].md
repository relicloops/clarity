---
title: Skins system -- standalone CSS themes with footer selector
tags:
  - "#clarity"
  - "#skins"
  - "#css"
status: completed
updated: 2026-04-16
priority: high
phase: implementation
---

# Skins System for Clarity Theme

## Context

The theme currently has one visual identity (phosphor-green dark /
UV-violet light) controlled by the dark / light / system toggle. This
plan adds **standalone CSS skins** that completely replace the default
palette, fonts, and glow effects. When a skin is active, the theme
toggle is **disabled** -- the skin owns the entire visual surface.

Skins live under `css/skins/` as independent CSS files. The reader
picks a skin from a `<select>` in the footer. The deployer can set a
default skin via `theme.conf`. Ships in v1.

---

## Architecture

### How it works

```
Reader picks a skin in footer select
  -> JS loads css/skins/<name>.css via <link>
  -> JS sets data-skin="<name>" on <html>
  -> JS hides the theme-toggle button
  -> JS stores "<name>" in localStorage key clarity-skin
  -> All CSS variables are now defined by the skin CSS
  -> The [data-theme] attribute is ignored because the skin CSS
     uses :root[data-skin="<name>"] which has higher specificity

Reader picks "Default" in footer select
  -> JS removes the skin <link>
  -> JS removes data-skin from <html>
  -> JS shows the theme-toggle button
  -> JS clears clarity-skin from localStorage
  -> The normal dark/light/system toggle resumes
```

### Key rule: skin ON = theme toggle OFF

When `data-skin` is set to anything other than empty/"default":
- The theme-toggle button is hidden (`display: none`)
- `data-theme` / `data-theme-setting` attributes are left as-is on
  `<html>` but have no visual effect because the skin's
  `:root[data-skin]` selectors override every token.
- When the reader switches back to "Default", the toggle reappears
  and the previously stored theme choice takes over again.

---

## Skin CSS file contract

Each skin file under `css/skins/<name>.css` MUST define the complete
token set. A skin does NOT `@import` clarity.css -- it is loaded
alongside it and its selectors win by specificity.

`:root[data-skin="<name>"]` has specificity (0, 1, 1) which beats
`:root` (0, 1, 0) and `[data-theme="dark"]` (0, 1, 0). No
`!important` needed.

---

## Planned skins (6)

| Skin | File | Mode | Direction |
|------|------|------|-----------|
| **Unicorn** | `css/skins/unicorn.css` | Light | Pastel rainbow palette. Soft lavender, mint, blush, and sky-blue tones. Rounded, friendly feel. Whimsical sans-serif headings (Quicksand). |
| **Programmer** | `css/skins/programmer.css` | Light | Clean documentation-focused layout. Neutral white/gray background, dark text, blue links, monospace code blocks on light gray. System fonts only. |
| **Matrix** | `css/skins/matrix.css` | Dark | Green monochrome on black. Monospace everywhere. High-contrast terminal feel with subtle scanline-like border patterns. Glow on accent elements. |
| **Rainbow** | `css/skins/rainbow.css` | Light | High-contrast rainbow: saturated primary colors used for accents, headings, links, and borders against a white background. Bold and loud. |
| **Darcula** | `css/skins/darcula.css` | Dark | Deep-contrast dark theme with muted purples, warm grays, and soft orange accents. Comfortable for extended reading in low light. |
| **Coder** | `css/skins/coder.css` | Dark | Editor-inspired dark theme with blue-gray surface tones, muted blue accents, and a familiar coding-environment palette. |

### Copyright notice

Skin names, palettes, and descriptions are original. No skin
references a trademarked product, copies a proprietary stylesheet,
or uses another project's brand name. The visual directions are
described in generic aesthetic terms to avoid implying derivation from
any specific commercial product.

---

## Per-skin Google Fonts

```js
var SKIN_FONTS = {
  unicorn:    'family=Quicksand:wght@400;500;600;700&family=Nunito:wght@400;500;600;700',
  programmer: '',  // system fonts only
  matrix:     'family=Share+Tech+Mono',
  rainbow:    'family=Poppins:wght@400;500;600;700;800',
  darcula:    'family=Fira+Sans:wght@400;500;600;700&family=Fira+Mono:wght@400;500;700',
  coder:      'family=Source+Sans+3:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600;700'
};
```

Consent-gated: fonts load only after the reader accepts the privacy
banner.

---

## Storage

| Key | Store | Content |
|-----|-------|---------|
| `clarity-skin` | localStorage | Skin name string or absent for default. Consent-gated. |

Purge: `purgeAll()` and `purgeNonEssential()` both clear this key.

---

## Theme option

```ini
# theme.conf
skin = default
```
