---
title: Granular privacy settings (per-key CAN/CANNOT) with scheduled purge (TTL)
tags:
  - "#clarity"
  - "#privacy"
  - "#consent"
  - "#storage"
status: draft
updated: 2026-04-17
priority: high
phase: design
---

# Granular Privacy and Scheduled Purge

## Goal

Today consent is a single binary: Accept or Decline. Every feature that
uses storage (theme, text-size, skin, chatbot history, API keys, update
dismissed flag) rides on that one flag. The reader cannot tell the theme
"remember my skin but never remember my chat", nor "keep my theme for a
week but purge chat history every day".

This plan introduces two independent axes of control:

1. **CAN / CANNOT per storage key (or group)** -- the reader can allow
   some features to persist and block others, instead of all-or-nothing.
2. **Scheduled purge per storage key** -- the reader can set a TTL
   (Never, 1 day, 1 week, 1 month) after which the key is automatically
   cleared on next access.

Both axes are optional: the existing Accept / Decline buttons still
work as sensible presets. Granularity is opt-in via a new
"Customize..." link in the consent banner and in the footer.

---

## Scope

### In scope

- A per-key consent matrix (CAN / CANNOT). Default = CAN for every key
  on Accept; default = CANNOT for every key on Decline (today's behavior).
- A per-key TTL (Never / 1d / 1w / 1m). Default = Never everywhere.
- Enforcement in `safeGet` / `safeSet`: CANNOT -> behave as today's
  no-consent branch (sessionStorage fallback). TTL -> on read, if the
  envelope timestamp is older than the TTL, remove and return null.
- A settings UI: a new "Privacy Settings" panel with one row per key
  showing CAN/CANNOT toggle + TTL dropdown.
- Migration: legacy stored values (plain strings, no envelope) are
  accepted once and rewritten with an envelope on the next write.
- Also applies to the external switches:
  - Google Fonts CAN/CANNOT (matches today's `font_stack` option
    but becomes a reader-level toggle too).
  - PyPI update check CAN/CANNOT (per-reader override of the
    deployer's `update_check` theme option).
  - OpenRouter network CAN/CANNOT (per-reader kill-switch).

### Out of scope

- Encrypting stored values (covered in a future plan).
- Server-side or cross-device sync of these preferences.
- Per-page consent (global only).
- GDPR DSAR (export all, right to be forgotten) beyond what
  digest + chatbot Purge already do.

---

## Inventory: the keys that need a toggle

Grouped for the UI. Each group is a row in the Privacy Settings panel.

| Group | Keys | What it does |
|-------|------|--------------|
| **Theme** | `clarity-theme`, `clarity-text-size` | Dark/light choice, text zoom. |
| **Skin** | `clarity-skin` | Reader's skin pick (Matrix, Darcula, ...). |
| **Chatbot keys** | `clarity-chatbot-key`, `clarity-chatbot-mgmt-key` | OpenRouter API keys. |
| **Chatbot history** | `clarity-chatbot-history` | Messages and reasoning. |
| **Chatbot panel** | `clarity-chatbot-state`, `clarity-chatbot-geometry`, `clarity-chatbot-settings-override`, `clarity-chatbot-requests` | Open/closed state, size/position, settings override, local counter. |
| **Update check** | `clarity-update-dismissed` | Remember the reader dismissed the PyPI update banner. |
| **Google Fonts** | (external) | Load Orbitron/Inter/Intel One Mono from fonts.googleapis.com. |
| **PyPI update fetch** | (external) | Fetch `pypi.org/pypi/sphinx-clarity/json`. |
| **OpenRouter** | (external) | Send chat requests / key info / activity. |

`clarity-consent` itself is NEVER togglable -- it is required by the
consent system. Strictly necessary, exempt from its own consent.

---

## Storage envelope

Every consented write goes through a tiny envelope:

```json
{ "v": "<original string>", "t": 1713355200000 }
```

- `v` -- the original value the caller asked to store.
- `t` -- epoch ms of last write. Used to enforce TTL.

On read:

1. Parse envelope. If plain legacy string (no envelope shape), return
   it and schedule a rewrite with `t = now` on the next write.
2. Look up the effective TTL for that key.
3. If TTL is **Never**, return `v`.
4. Otherwise compute `age = now - t`. If `age > TTL`, call
   `safeRemove(key)` and return null.
5. Return `v`.

Rewrites stamp `t` every time. This means "last interacted" is the TTL
anchor, not "first stored". Rationale: the reader likely wants "forget
my chat if I've been away a week" rather than "forget my chat exactly
one week after first use regardless of usage".

### Why an envelope and not a sibling `<key>-ts` key

- One fewer storage slot per value.
- Read/write is atomic (no partial-migration risk).
- Easy to detect legacy values (envelope JSON vs plain string).

---

## Consent model (per-key)

Two state fields per key, persisted in one JSON blob under a new key:

```json
{
  "schema": "clarity-privacy/v1",
  "updated": 1713355200000,
  "consent": {
    "clarity-theme":           { "allow": true,  "ttl": "never" },
    "clarity-text-size":       { "allow": true,  "ttl": "never" },
    "clarity-skin":            { "allow": true,  "ttl": "never" },
    "clarity-chatbot-key":     { "allow": true,  "ttl": "1d"    },
    "clarity-chatbot-mgmt-key":{ "allow": true,  "ttl": "1d"    },
    "clarity-chatbot-history": { "allow": true,  "ttl": "1w"    },
    "clarity-chatbot-state":   { "allow": true,  "ttl": "never" },
    "clarity-chatbot-geometry":{ "allow": true,  "ttl": "never" },
    "clarity-chatbot-settings-override": { "allow": true, "ttl": "never" },
    "clarity-chatbot-requests":{ "allow": true,  "ttl": "never" },
    "clarity-update-dismissed":{ "allow": true,  "ttl": "1m"    },
    "fonts.googleapis":        { "allow": true,  "ttl": "never" },
    "pypi.update-check":       { "allow": true,  "ttl": "never" },
    "openrouter.ai":           { "allow": true,  "ttl": "never" }
  }
}
```

TTL values: `"never" | "1d" | "1w" | "1m"`. Internally mapped to
milliseconds via a small constant map.

Storage key: `clarity-privacy` (plain JSON string, no envelope; this
is the privacy metadata, not user content -- treated like
`clarity-consent`).

### Legacy / global consent

`clarity-consent` stays as today (`accepted` / `declined`). Behaviour:

- **`accepted`** and no `clarity-privacy` present ->
  every key defaults `allow: true, ttl: "never"` (today's behaviour).
- **`declined`** and no `clarity-privacy` present ->
  every key `allow: false, ttl: "never"` (today's behaviour with the
  Phase 0 sessionStorage fallback we just shipped).
- **`clarity-privacy` present** -> it wins. `clarity-consent` becomes a
  coarse summary: `accepted` if ANY key is allowed, `declined` if ALL
  are blocked.

No migration step needed -- the two keys coexist peacefully.

---

## API shape

Extend `window.__clarityPrivacy` next to the existing
`window.__clarityConsent` flag. Readers of the API:

```js
// Is this exact key allowed right now?
window.__clarityPrivacy.canStore('clarity-theme')   // true/false

// Is this external request allowed right now?
window.__clarityPrivacy.canFetch('fonts.googleapis') // true/false

// Current TTL for a key (ms or Infinity for 'never').
window.__clarityPrivacy.ttl('clarity-chatbot-history') // 604800000

// Subscribe to changes (banner save, footer link).
window.__clarityPrivacy.onChange(function () { ... })
```

Every IIFE that currently reads `window.__clarityConsent` replaces that
with a call to `canStore(key)` (for storage) or `canFetch(host)` (for
network). The old flag stays as a convenience alias equal to "any key
allowed" so third-party embeds aren't broken.

### safeGet / safeSet behavior

```
safeGet(key):
  if !canStore(key):
    return sessionStorage.getItem(key)    // tab-scoped, never TTL'd
  envelope = parse(localStorage.getItem(key))
  if envelope && ttlExpired(envelope, ttl(key)):
    localStorage.removeItem(key)
    return null
  return envelope ? envelope.v : legacy-string

safeSet(key, value):
  if !canStore(key):
    sessionStorage.setItem(key, value)
    return
  localStorage.setItem(key, JSON.stringify({ v: value, t: now() }))
```

---

## UI

### Updated consent banner

```
┌──────────────────────────────────────────────────────────────────┐
│  Privacy                                                         │
│                                                                  │
│  Clarity stores your theme, skin, and (optionally) chatbot       │
│  history in your browser. External fonts and update checks       │
│  are opt-in.                                                     │
│                                                                  │
│  [ Accept all ]  [ Decline all ]  [ Customize... ]               │
└──────────────────────────────────────────────────────────────────┘
```

- **Accept all** -> `clarity-consent = accepted`, no `clarity-privacy`.
- **Decline all** -> `clarity-consent = declined`, no `clarity-privacy`.
- **Customize...** -> opens the Privacy Settings panel.

### Privacy Settings panel

A modal dialog (new, not inside the chatbot) with a table:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Privacy Settings                                            [ × ]     │
│                                                                        │
│  Choose what Clarity is allowed to remember and for how long.          │
│                                                                        │
│  Category                   Allow     Purge after                      │
│  ────────────────────────── ───────── ───────────────                  │
│  Theme + text size          [x] CAN   (Never)  ▾                       │
│  Skin                       [x] CAN   (Never)  ▾                       │
│  Chatbot API keys           [x] CAN   (1 day)  ▾                       │
│  Chatbot history            [x] CAN   (1 week) ▾                       │
│  Chatbot panel state        [x] CAN   (Never)  ▾                       │
│  Update-banner dismiss      [x] CAN   (1 month) ▾                      │
│  ────────────────────────── External (one-time, no storage) ────       │
│  Google Fonts               [x] CAN                                    │
│  PyPI update check          [ ] CANNOT                                 │
│  OpenRouter API             [x] CAN                                    │
│                                                                        │
│  [ Apply presets... ▾ ]             [ Cancel ]      [ Save ]           │
└────────────────────────────────────────────────────────────────────────┘
```

- "Allow" column shows CAN (checked) / CANNOT (unchecked).
- "Purge after" dropdown: Never / 1 day / 1 week / 1 month. Absent for
  external categories (no storage to purge).
- "Apply presets..." menu: `All, 1 day` / `All, 1 week` / `All, Never`
  / `All CANNOT` / `Default`.
- Save writes `clarity-privacy` and fires `onChange`.
- Cancel closes without saving.
- Close button (top-right) acts like Cancel.

### Entry points

1. **Consent banner** -- "Customize..." button.
2. **Footer** -- rename "Privacy settings" link to open the new panel
   instead of re-showing the old accept/decline banner. The accept /
   decline banner is still reachable via "Reset privacy" inside the
   new panel (-> purges `clarity-privacy`, re-shows the banner).
3. **Chatbot panel** -- a small "Privacy" link near the Digest/Ingest
   buttons, for convenience.

---

## Enforcement at the boundaries

The per-key toggle is only effective if every storage access goes
through `safeGet` / `safeSet` that respects it. Audit + adjust:

| File | Change |
|------|--------|
| `chatbot-storage.js` | `safeGet`/`safeSet` use the new envelope and `canStore(key)`. Migrate legacy plain values on first read. |
| `theme-toggle.js` | Same pattern; already consent-gated. |
| `skin-switcher.js` | Same pattern; already consent-gated. |
| `update-check.js` | `DISMISSED_KEY` write already goes through localStorage but only under consent -- rewrite through the new helper. The PyPI fetch itself checks `canFetch('pypi.update-check')`. |
| `consent.js` | Reads `clarity-privacy` if present, exposes `window.__clarityPrivacy`, shows updated banner. Google Fonts load gates on `canFetch('fonts.googleapis')`. |
| `layout.html` early skin loader | Still allowed to peek at both storages for flicker avoidance -- it's read-only and does not create new storage entries. |
| `chatbot-api.js` | Wraps its fetch with `canFetch('openrouter.ai')`. If blocked, surface a one-line status: "OpenRouter access is disabled in Privacy Settings." |

### TTL sweep

Expiration is lazy: only triggered on the next read of the expired key.
A small periodic sweep (once per page load, at boot) walks the keys and
clears any that are expired even without a read. Cheap (6-10 keys) and
keeps storage tidy.

---

## Migration and defaults

### Fresh reader (no keys yet)

Sees the banner. Accept / Decline / Customize behave as above.

### Existing reader who accepted today

- `clarity-consent = accepted`, no `clarity-privacy`.
- Everything works as today. No action needed.
- On their next write, values get the envelope (with `t = now`).
- First time they open the new panel, defaults are shown pre-ticked,
  all TTL = Never.

### Existing reader who declined today

- `clarity-consent = declined`, no `clarity-privacy`.
- Sessions-only storage (already live after the previous plan).
- Defaults in the panel are all unticked.

### Reader with envelope already (future)

- `clarity-privacy` present -> enforce per-key.
- Coarse `clarity-consent` kept in sync for any code path still
  reading the old flag.

---

## Files to create / modify

### New

| File | Content |
|------|---------|
| `src/clarity/static/js/privacy.js` | IIFE. Loads `clarity-privacy`, exposes `window.__clarityPrivacy`, envelope helpers, TTL sweep, change subscription. |
| `src/clarity/privacy-panel.html` | Jinja partial: Privacy Settings modal markup. |
| `src/clarity/static/css/privacy-panel.css` | Panel styling, token-based so skins inherit. |

### Modified

| File | Change |
|------|--------|
| `src/clarity/static/js/consent.js` | Adds "Customize..." button wiring; reads the new panel. |
| `src/clarity/consent.html` | "Customize..." button next to Accept/Decline. |
| `src/clarity/static/js/chatbot-storage.js` | `safeGet`/`safeSet` use envelope + `canStore(key)`. |
| `src/clarity/static/js/theme-toggle.js` | Same. |
| `src/clarity/static/js/skin-switcher.js` | Same. |
| `src/clarity/static/js/update-check.js` | Wrap PyPI fetch in `canFetch('pypi.update-check')`. DISMISSED via new helper. |
| `src/clarity/static/js/chatbot-api.js` | Wrap OpenRouter fetches in `canFetch('openrouter.ai')`. |
| `src/clarity/layout.html` | Include `privacy.js` BEFORE `consent.js`; include `privacy-panel.html`; load `privacy-panel.css`. |
| `docs/source/privacy.rst` | New "Granular controls" section; TTL table. |
| `docs/source/configuration.rst` | Note the new footer link. |

---

## Implementation phases

### Phase 1 -- foundation (privacy.js + envelope)

- Ship `privacy.js` with: load/save `clarity-privacy`, defaults derived
  from `clarity-consent`, `canStore`, `canFetch`, `ttl`, `onChange`,
  `wrapEnvelope` / `unwrapEnvelope` helpers.
- Do NOT touch existing IIFEs yet. Expose API only.
- Verify: on Accept all, `canStore('clarity-theme') === true`.

### Phase 2 -- migrate storage helpers

- Update `chatbot-storage.js`, `theme-toggle.js`, `skin-switcher.js` to
  use the new helpers. Legacy values read once, rewritten as envelope.
- Verify: old reader returns without losing preferences.

### Phase 3 -- migrate external gates

- `update-check.js` PyPI fetch gated on `canFetch('pypi.update-check')`.
- `chatbot-api.js` OpenRouter fetch gated on `canFetch('openrouter.ai')`.
- `consent.js` Google Fonts gated on `canFetch('fonts.googleapis')`.
- Verify: blocking "PyPI update check" in the panel stops the fetch.

### Phase 4 -- UI

- Ship `privacy-panel.html` + `privacy-panel.css`.
- Wire the "Customize..." button in the banner.
- Rewire the footer "Privacy settings" link to open the new panel.
- Add the chatbot "Privacy" shortcut.

### Phase 5 -- TTL sweep

- Boot-time sweep pass over the known-key set, purge expired envelopes.
- Lazy purge on read (belt + braces, cheap).

### Phase 6 -- docs and verification

- `privacy.rst` gets a new "Granular controls and retention" section
  plus a TTL reference table.
- `configuration.rst` cross-link.
- Manual QA:
  1. Accept all, pick Matrix skin, reload -- still Matrix.
  2. Open Privacy Settings, set Skin CANNOT, reload -- back to default.
  3. Set Chatbot history TTL = 1 day. Ask a question. Advance system
     clock 2 days. Reload -- history cleared.
  4. Uncheck "PyPI update check", press Opt+U -- no network request.
  5. Uncheck "Google Fonts", reload -- system fonts, no external load.
  6. Reset privacy -- panel clears, banner returns.

---

## Security and privacy notes

- `clarity-privacy` itself is strictly necessary (it controls the
  consent logic) and therefore exempt from consent, stored as plain
  JSON in `localStorage`. It contains no personal data -- just
  the consent choices.
- TTL is **lazy** -- a reader who never returns leaves stale data in
  their localStorage until they next visit. Acceptable; no worse than
  today. The TTL is a convenience for active readers.
- A blocked `canFetch('openrouter.ai')` disables the chatbot network
  round-trip but still allows typing and local rendering. The UI
  shows a clear banner so the reader isn't confused.
- A blocked storage key degrades gracefully: `safeGet` returns null,
  the feature behaves as "no persisted preference". Matches today's
  Decline behaviour.

---

## Open questions

1. **TTL granularity** -- 1d / 1w / 1m enough? Or add 1h, 1y? Keep it
   to 4 options in v1 and measure usage.
2. **Reset privacy** -- purge only `clarity-privacy`, or also purge all
   stored `clarity-*` keys? Leaning "only privacy" so the reader's
   preferences aren't nuked by opening the panel.
3. **Deployer overrides** -- should `theme.conf` let the deployer set
   a default privacy profile (e.g. "we disable Google Fonts by default
   on this site")? Yes, v2: accept `privacy_defaults` theme option.
4. **Mobile UX** -- the panel as a table may be cramped at <480px.
   Switch to a stacked card layout under the 640px breakpoint.
5. **Accessibility** -- the panel must trap focus and support keyboard
   navigation through the CAN checkboxes and TTL selects.

---

## Verification checklist

1. First-time reader sees 3-button banner (Accept / Decline / Customize).
2. Accept all -- all keys CAN, TTL Never.
3. Decline all -- all keys CANNOT, sessionStorage fallback.
4. Customize, disable Chatbot history, keep everything else -- asking
   a question works but history isn't persisted across reloads.
5. Set Update-banner dismiss TTL = 1 day, dismiss today, advance clock
   25 h, reload -- banner returns.
6. Block OpenRouter -- chatbot shows "network disabled" notice.
7. Block Google Fonts -- system fonts everywhere.
8. Footer "Privacy settings" opens the new panel, not the old banner.
9. Reset privacy inside the panel -- banner re-appears on next load.
10. All 6 skins render the panel correctly.
11. Sphinx build with `-W` is clean.

---

## Not in scope

- Encryption of stored values (tracked in a future plan).
- Per-origin scoping (storage already origin-scoped by the browser).
- Cross-device sync (would require a server).
- Automatic data minimization beyond TTL (e.g. sampling history).
- Differential privacy / obfuscation.
