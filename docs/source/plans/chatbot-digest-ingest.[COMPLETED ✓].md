---
title: Chatbot digest (export) and ingest (import) of message history
tags:
  - "#clarity"
  - "#chatbot"
  - "#storage"
  - "#privacy"
status: completed
updated: 2026-04-17
priority: medium
phase: implementation
---

# Chatbot Digest / Ingest

## Goal

Let the reader **download** their conversation history as a file
(`digest`) and **restore** it later (`ingest`). The feature must work
for readers who accepted the privacy banner (history persisted in
`localStorage`) and for readers who declined (history only in memory
for the current tab).

Two entry points:

1. **Purge confirmation** -- before wiping history, offer "Digest first?"
   which opens the filename/format prompt, saves the file, then purges.
2. **Settings panel** -- two buttons, `Digest` and `Ingest`, always
   available when there is a non-empty conversation (digest) or when
   the reader wants to restore (ingest).

---

## Current state: where does history live?

From `src/clarity/static/js/chatbot-storage.js`:

- `HISTORY_STORAGE = 'clarity-chatbot-history'` (localStorage key).
- `loadHistory()` and `saveHistory()` use `safeGet` / `safeSet`.
- **Both helpers return early without touching storage if
  `window.__clarityConsent` is false.**

That means the user's premise needs a correction: when consent is
**declined, nothing is written to sessionStorage today**. History
lives only as the in-memory `messages` array inside `chatbot.js`
for the lifetime of the tab, and is lost on navigation or refresh.

### Digest source of truth

Digest must therefore read from **the live in-memory conversation**
first, falling back to `storage.loadHistory()` only if the live array
is empty (e.g. settings panel opened before chatbot booted). This
gives a single correct answer regardless of consent state.

### Optional sub-plan: sessionStorage fallback

A small complementary proposal -- not strictly required for digest --
is to add a `sessionStorage` fallback inside `safeGet`/`safeSet` that
fires only when consent is declined. This makes the "decline + refresh"
experience less lossy without changing privacy semantics
(sessionStorage is cleared on tab close, not persisted across visits).

Decided: include this as **Phase 0** because without it the digest is
silent on the privacy-declined path after a refresh.

---

## File formats

### JSON (always included)

The canonical, machine-readable format. Ingest **only** reads JSON.

```json
{
  "schema": "clarity-chatbot-digest/v1",
  "exported_at": "2026-04-17T10:23:45.000Z",
  "origin": "https://clarity.example.com",
  "page": {
    "url": "https://clarity.example.com/configuration.html",
    "title": "Configuration"
  },
  "chatbot": {
    "model": "openai/gpt-oss-120b:free",
    "system_prompt_hash": "sha1:3a7b...",
    "max_history": 50
  },
  "messages": [
    { "role": "user",      "content": "What does update_check do?", "ts": "2026-04-17T10:22:01.000Z" },
    { "role": "assistant", "content": "It enables...",               "ts": "2026-04-17T10:22:03.000Z" }
  ]
}
```

Rules:
- `schema` version string is REQUIRED for ingest validation.
- `exported_at` is an ISO-8601 UTC timestamp.
- `origin` records where the digest was produced (informational; the
  ingester does NOT reject a different origin).
- `page` is the page the reader was on when the digest fired.
- `chatbot` captures settings at digest time (no API keys, no
  org-scoped identifiers). `system_prompt_hash` lets the ingester
  warn if the prompt differs, without leaking the prompt.
- `messages` preserves order. `ts` is optional (messages saved before
  digest ships won't have timestamps -- the ingester tolerates
  missing `ts`).

**Never included**: the OpenRouter API key, the management key, the
request counter, geometry, settings override. Digest is a conversation
artifact, not a full backup.

### Markdown (`md`)

Human-readable transcript. Sample:

```markdown
# Clarity Chatbot digest

**Exported:** 2026-04-17 10:23 UTC
**Page:** [Configuration](https://clarity.example.com/configuration.html)
**Model:** openai/gpt-oss-120b:free

---

## User -- 2026-04-17 10:22:01

What does update_check do?

## Assistant -- 2026-04-17 10:22:03

It enables...
```

Bundled with the JSON when selected (see "Bundling" below).

### Plain text (`txt`)

Barebones transcript for reading without a Markdown renderer.

```
[2026-04-17 10:22:01] USER
What does update_check do?

[2026-04-17 10:22:03] ASSISTANT
It enables...
```

Bundled with the JSON when selected.

---

## Bundling rule

| User picks | File(s) delivered |
|------------|-------------------|
| `json`     | `digest.json` (single file download) |
| `md`       | `digest.zip` containing `digest.md` + `digest.json` |
| `txt`      | `digest.zip` containing `digest.txt` + `digest.json` |

The zip is the cleanest way to guarantee the JSON always accompanies a
human-readable format so ingest works later without asking the reader
to re-export. Use `JSZip` (inlined, ~90 KB gzipped) or a small custom
zip writer. Verify the custom writer first -- STORE method only, no
compression, avoids the dependency.

Alternative considered and **rejected**: deliver two separate file
downloads when md/txt is chosen. Browser UX pops two save dialogs;
readers routinely cancel the second. Zip is one confirmation.

---

## UI flows

### Flow 1 -- Settings panel buttons

Two new buttons at the top of the settings panel, above the settings
form:

```
┌────────────────────────────────────────────────┐
│  [ ⇩ Digest history ]   [ ⇧ Ingest history ]   │
└────────────────────────────────────────────────┘
```

- `⇩` (U+21E9) Digest -- opens the filename/format prompt modal.
- `⇧` (U+21E7) Ingest -- opens a native `<input type="file" accept=".json">`.
- Both buttons style like `.clarity-chatbot-action` (match existing
  settings buttons -- accent border, transparent bg).

### Flow 2 -- Purge confirmation

The existing purge confirmation gets an extra "Digest first" button
inline with OK/Cancel:

```
┌───────────────────────────────────────────────────────────┐
│  Purge all chatbot data?                                  │
│                                                           │
│  This removes your history, API key, and settings.        │
│                                                           │
│  [ ⇩ Digest first ]    [ Cancel ]    [ Purge ]            │
└───────────────────────────────────────────────────────────┘
```

- "Digest first" routes through the filename/format prompt, saves the
  file, then **continues the purge automatically** (no re-confirmation).
- "Purge" goes straight to `storage.purgeAll()` as today.
- "Cancel" closes the dialog.

### Flow 3 -- Filename / format prompt modal

```
┌──────────────────────────────────────────────┐
│  Digest conversation                         │
│                                              │
│  Filename:   [ clarity-chat-2026-04-17 ]     │
│              (".json" or ".zip" is appended) │
│                                              │
│  Format:     (•) JSON                        │
│              ( ) Markdown (+ JSON bundle)    │
│              ( ) Plain text (+ JSON bundle)  │
│                                              │
│                     [ Cancel ]  [ Save ]     │
└──────────────────────────────────────────────┘
```

- Default filename: `clarity-chat-<YYYY-MM-DD>-<HHmm>`.
- Default format: `JSON` (round-trip friendly).
- "Save" builds the blob, triggers the download, closes the modal.
- If invoked from Flow 2 (purge), on successful save the modal hands
  control back to purge.

### Flow 4 -- Ingest modal

```
┌──────────────────────────────────────────────┐
│  Ingest conversation                         │
│                                              │
│  Select a .json file exported from Clarity.  │
│                                              │
│  [ Choose file... ]  (no file selected)      │
│                                              │
│  Mode:  (•) Replace current conversation     │
│         ( ) Append to current conversation   │
│                                              │
│                     [ Cancel ]  [ Load ]     │
└──────────────────────────────────────────────┘
```

- `Replace` is the safe default -- discards in-memory messages and
  replaces them with the file contents.
- `Append` appends ingested messages to the current conversation. The
  ingester rewrites timestamps if out of order (warns the reader).
- On validation failure, the modal shows an inline error and does NOT
  alter state.

---

## Validation (ingest)

The ingester MUST:

1. Parse JSON. On parse error -> inline error, abort.
2. Check `schema === 'clarity-chatbot-digest/v1'`. Mismatch -> error
   with "This file was produced by a different schema version. Expected
   v1, got <x>."
3. Check `messages` is an array of `{role, content}` objects.
4. Validate each `role` is one of `user | assistant | system`. Unknown
   roles -> error.
5. Cap `messages.length` at `settings.maxHistory * 4` (soft ceiling) to
   prevent a 10 MB pathological file from stalling the UI. If exceeded,
   truncate to the most recent N and warn.
6. Optionally compare `chatbot.system_prompt_hash` with the current
   prompt hash. If different, show a non-blocking notice ("Ingested
   from a page with a different system prompt").
7. Never execute anything from `messages[].content` -- render through
   the existing Markdown pipeline which sanitizes HTML.

The ingester MUST NOT:

- Write to localStorage if consent is declined (respects the consent
  gate via `safeSet`).
- Accept an `api_key` field (ignore if present).
- Follow any URL in the file automatically.

---

## Privacy considerations

- **No key material in digest**. The OpenRouter key and management
  key are explicitly excluded.
- **Origin recorded, not enforced**. Digest records `origin` for the
  reader's benefit. Ingest does not cross-check origin (a reader who
  works offline and moves docs around should not be blocked).
- **Consent-agnostic digest**. Digest reads the in-memory array, so it
  works even if consent was declined. The digest file is a one-shot
  artifact the reader creates intentionally; it's not passive
  persistence.
- **Consent-gated ingest**. Writing the ingested messages back to
  `localStorage` goes through `safeSet`. Without consent, the ingest
  still populates the in-memory conversation for the current tab, and
  (with Phase 0 sessionStorage fallback) survives reloads in the same
  tab.
- **Document in `privacy.rst`**: a new section describing what digest
  contains, what it excludes, and that it is produced client-side
  (never sent over the network).

---

## Files to create

| File | Content |
|------|---------|
| **NEW** `src/clarity/static/js/chatbot-digest.js` | IIFE. Exports `Chatbot.digest.run(format, filename)`. Builds JSON, md, txt strings; zips when needed; triggers download via `<a download>` + `URL.createObjectURL`. |
| **NEW** `src/clarity/static/js/chatbot-ingest.js` | IIFE. Exports `Chatbot.ingest.run(file, mode)`. Validates, replaces or appends, persists via `storage.saveHistory()`. |
| **NEW** (optional) `src/clarity/static/js/vendor/jszip-tiny.js` | Minimal STORE-method zip writer. Inlined, ~2 KB. Only used when md or txt is picked. |

## Files to modify

| File | Change |
|------|--------|
| `src/clarity/static/js/chatbot-storage.js` | Add `sessionStorage` fallback in `safeGet`/`safeSet` when consent is declined. Expose `storage.getLiveHistory()` helper. |
| `src/clarity/static/js/chatbot.js` | Add `Digest` and `Ingest` buttons to the settings panel. Extend the purge confirmation modal with "Digest first" action. Wire both into `chatbot-digest.js` / `chatbot-ingest.js`. |
| `src/clarity/chatbot.html` | Markup for the two new modals (digest prompt + ingest prompt). Use the same modal chrome as the purge confirmation. |
| `src/clarity/static/css/chatbot.css` | `.chatbot-digest-modal`, `.chatbot-ingest-modal`, and format/mode radio styling. Reuse existing action-button tokens. |
| `docs/source/chatbot.rst` | Section "Digest and ingest" with step-by-step for the reader. |
| `docs/source/privacy.rst` | Note digest is client-side; list fields included/excluded. |
| `docs/source/configuration.rst` | Cross-link to the chatbot section. |

Entries added to `layout.html` loader list: `chatbot-digest.js` and
`chatbot-ingest.js` (after `chatbot-storage.js`, before `chatbot.js`).

---

## Implementation phases

### Phase 0 -- sessionStorage fallback (prep)

Extend `safeGet`/`safeSet` in `chatbot-storage.js`:

```
if consent:   use localStorage
else:         use sessionStorage

safeRemove clears from whichever is in use.
```

Purge clears both. Document in `privacy.rst` that without consent,
chatbot data lives in sessionStorage (tab-scoped) and is cleared on
tab close.

### Phase 1 -- digest-only

- Build JSON serializer (`buildDigestJson`).
- Build the digest prompt modal (filename + format select).
- Wire the settings-panel `Digest` button.
- Download path: JSON format only at first.
- Verify: JSON file parses and contains the expected schema.

### Phase 2 -- md + txt + zip

- Add `buildDigestMd` and `buildDigestTxt`.
- Add the STORE-only zip writer (or pull in JSZip if size budget
  allows).
- Verify: md/txt download is a zip containing the human-readable file
  plus the JSON.

### Phase 3 -- ingest

- Build the ingest modal (file picker + mode radio).
- Build `parseDigestJson` with full validation.
- Wire the settings-panel `Ingest` button.
- On success, re-render the conversation from the ingested messages.
- Verify: round-trip digest -> ingest restores the original messages
  exactly (modulo `ts` if absent).

### Phase 4 -- purge integration

- Add "Digest first" to the purge confirmation modal.
- On click: open digest modal; on save success, continue the purge
  without re-confirming.

### Phase 5 -- docs and verification

- Update `chatbot.rst`, `privacy.rst`, `configuration.rst`.
- Cross-check all 6 skins render the new modals correctly.
- Accessibility: modals trap focus, Escape closes, Enter triggers
  primary action.

---

## Open questions

1. **Zip writer: custom or JSZip?** Leaning custom (STORE-only, tiny)
   to keep the bundle lean and avoid a Node-style dependency. Decide
   after measuring both on the chatbot page.
2. **Ingest append mode: reorder timestamps?** Proposed warn rather
   than auto-reorder. Confirm UX in Phase 3.
3. **Digest includes `page.title`** -- useful for retaining context
   when the reader restores on another page. No privacy concern.
4. **Multi-file ingest?** Out of scope for v1. One file per ingest.
5. **Schema forward compatibility** -- v1 ingester rejects non-v1.
   When v2 lands, keep a v1 reader until end of the next MAJOR.

---

## Verification checklist

1. Digest JSON -- downloaded, parses, schema matches v1.
2. Digest Markdown -- downloaded as zip, contains md + json, md is
   readable, json validates.
3. Digest Plain text -- downloaded as zip, contains txt + json.
4. Ingest replace -- live conversation swapped to ingested messages.
5. Ingest append -- ingested messages appended after current ones.
6. Ingest with schema mismatch -- error shown, no state change.
7. Ingest with bad roles -- error shown, no state change.
8. Purge flow -- "Digest first" saves file then purges without extra
   click.
9. Privacy declined + refresh -- sessionStorage keeps history until
   tab close (Phase 0).
10. All 6 skins -- modals render with correct palette.
11. Mobile (< 640px) -- modals usable at narrow widths.
12. Docs site builds under `-W` with no warnings.

---

## Not in scope

- Cloud sync (Turso / PlanetScale) -- tracked by the shared-request
  counter plan if ever needed.
- Encrypted digest files (user-provided passphrase) -- future if
  requested.
- Partial selection (export N most recent, export a range) -- export
  is whole-conversation in v1.
- Automated periodic digest ("download every Monday") -- UI clutter.
- Cross-origin ingest hardening beyond schema validation.
