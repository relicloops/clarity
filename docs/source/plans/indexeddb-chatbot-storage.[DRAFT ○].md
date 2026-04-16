---
title: IndexedDB chatbot storage with per-page history, pinned context, and history panel
tags:
  - "#clarity"
  - "#chatbot"
  - "#indexeddb"
status: draft
updated: 2026-04-16
priority: high
phase: design
blocks: shared-request-counter
---

# IndexedDB Chatbot Storage

**Blocks**: `shared-request-counter.[DRAFT ○].md` (the shared counter
plan depends on the IndexedDB migration landing first so the local
counter already lives in IndexedDB; the remote layer sits on top).

## Why this matters

The chatbot currently stores a single flat conversation history in
`localStorage` under `clarity-chatbot-history`. This causes two problems:

1. **Context carry-over**: after `/goto` navigates to a new page, the
   history from the old page persists and misleads the model about which
   page it is looking at. The system prompt has new page content, but the
   conversation history references the old page.
2. **Capacity ceiling**: `localStorage` caps at ~5-10 MB per origin.
   Heavy conversation history plus reasoning traces can approach that
   limit on documentation sites with many pages.

Moving to **IndexedDB** solves both problems and opens the door to
per-page history, a history management panel, and a pinned-context
mechanism that lets readers accumulate knowledge per page.

---

## Storage backend: IndexedDB

### Why IndexedDB over localStorage

| Concern | localStorage | IndexedDB |
|---------|--------------|-----------|
| Capacity | ~5-10 MB | ~50 MB-1 GB+ |
| API | synchronous key-value (strings) | async, transactional object stores |
| Structured queries | no | yes (indexes, cursors, key ranges) |
| Per-page scoping | manual (one big JSON blob) | native (index on path) |
| Consent-gatable | yes | yes (same `window.__clarityConsent` check) |

### Database schema: `clarity-chatbot` (version 1)

Three object stores:

#### `messages` -- per-page conversation history

```
{
  id:         auto-increment,
  path:       '/getting-started.html',
  role:       'user' | 'assistant',
  content:    '...',
  reasoning:  '...' | null,
  pinned:     false,
  timestamp:  1713000000000
}
```

- **keyPath**: `id`
- **Indexes**: `path` (get all messages for a page), `timestamp`
  (global chronological view).

#### `context` -- per-page pinned system-prompt additions

```
{
  path:       '/getting-started.html',
  entries:    [
    { source: 'answer', content: '...', timestamp: ... },
    { source: 'reasoning', content: '...', timestamp: ... }
  ]
}
```

- **keyPath**: `path`
- When building the system prompt, entries for the current path are
  appended after the base instruction + page content as a
  `PINNED CONTEXT:` section. The model carries this accumulated
  knowledge on every future request for that page.

#### `state` -- settings, keys, geometry, panel state

```
{
  key:    'settings-override' | 'api-key' | 'mgmt-key' | 'panel-state' | 'geometry',
  value:  (any structured value)
}
```

- **keyPath**: `key`
- Replaces most current `localStorage` chatbot keys.

### What stays in localStorage

Only two keys remain in `localStorage` because they require
**synchronous** reads before IndexedDB can open:

- `clarity-consent` -- strictly necessary, read by `consent.js` before
  any feature script runs.
- `clarity-theme` -- the theme toggle reads it synchronously to avoid a
  flash-of-wrong-theme on page load.

Everything else migrates to IndexedDB.

---

## System prompt pipeline (revised)

```
Layer 1 -- Base instruction
  settings.systemPrompt (conf.py default + reader override from ⚙ panel)
  OR built-in "You are a documentation assistant..." default

Layer 2 -- Page identity
  CURRENT PAGE: document.title
  PAGE URL: window.location.href

Layer 3 -- Page content
  PAGE CONTENT: (extracted text, truncated to pageTextLimit)

Layer 4 -- Pinned context (from `context` store for this path)
  PINNED CONTEXT:
  [answer from prior interaction, pinned by reader]
  [reasoning trace, pinned by reader]

Layer 5 -- Conversation history (from `messages` store for this path)
  Only messages matching the current path are sent.
  The model never sees messages from other pages unless the reader
  explicitly appends one via the history panel.
```

The ⚙ settings panel override touches only Layer 1. Layers 2-5 are
always appended regardless of override. This means a reader can
customize the instruction ("answer in Spanish", "focus on API usage")
without losing page content or pinned context.

---

## History panel

### Header button

Symbol: ↺ (U+21BA, anticlockwise open circle arrow).

Placement: in `.chatbot-controls`, between the ⚙ settings button and
the ⌧ purge button.

### Panel layout

Opens as a full-panel overlay (same pattern as the ⚙ settings panel):
`position: absolute; inset: 0; z-index: 6; background: var(--bg-primary)`.

A **search field** at the top filters entries by content match across
all pages (IndexedDB cursor scan, debounced ~200 ms). Below it, two
tabs (or a toggle):

- **This page** -- messages for `window.location.pathname`, most recent
  first.
- **All pages** -- grouped by path, each group collapsed by default,
  expandable.

When the search field is non-empty, both tabs are replaced by a flat
filtered results list sorted by relevance (match position) then
recency.

### Per-entry actions

Each history entry shows: role badge (`user` / `assistant`), truncated
content preview (~120 chars), timestamp.

Three action buttons per entry:

| Action | Symbol | Effect |
|--------|--------|--------|
| **Pin** | ● (U+25CF) | Appends the answer or reasoning text to the `context` store for this page. The pinned fragment becomes part of the system prompt (Layer 4) on every future request for this page. |
| **Delete** | ✗ (U+2717) | Removes the entry from the `messages` store. |
| **Append** | ↳ (U+21B3) | Copies the entry content into the chat input (or prepends it to the next API call as an explicit user-provided reference). |

### Bulk actions

- **Clear this page** -- deletes all `messages` entries for the current
  path and all `context` entries for the current path.
- **Clear all pages** -- purges the entire `messages` and `context`
  stores.

---

## Pinned context behavior

When a reader pins an assistant answer or reasoning trace:

1. The entry's `pinned` flag flips to `true` in the `messages` store.
2. The content (or reasoning text) is appended to the `context` store
   for the current path.
3. On the next request, `buildSystemPrompt` reads the `context` store
   and appends the pinned fragments after the page content.

### Growth cap

Pinned context is capped at a configurable character limit (e.g. 4000
chars). When the cap is reached:

- The pin action is disabled in the UI.
- A visible "pinned context is full" note appears in the history panel.
- The reader can unpin entries to make room.

This prevents the system prompt from consuming the model's entire
context window.

---

## /read pin prompt

After a `/read` summary finishes streaming, the chatbot renders a small
inline prompt below the summary message:

```
  [● Pin this summary?]
```

- Clicking the prompt pins the summary to the `context` store for the
  current page (same as the ● Pin action in the history panel) and
  replaces the prompt text with a confirmation like
  "✓ Pinned to this page's context".
- If the reader does nothing, the summary stays in `messages` as
  regular history and is not pinned.
- The prompt is a one-shot element: it disappears on page navigation
  and is not persisted. If the reader wants to pin a /read result
  later, they use the ↺ history panel.

---

## Version bump: v2.0.0-000

This is a breaking change in the storage API: the chatbot switches from
flat `localStorage` key-value pairs to a structured IndexedDB database.
Readers upgrading from v1.x will have existing keys in `localStorage`
that the new code no longer reads from its normal path.

The MAJOR bump to `2.0.0-000` signals the break. PyPI PEP 440 form:
`2.0.0.0`.

---

## Auto-import from localStorage (v1.x backward compatibility)

On every boot, **before** the IndexedDB `ready()` promise resolves, the
storage layer runs a one-time auto-import check. This covers both fresh
upgrades from v1.x AND partial-import retries if something failed
mid-way on a previous load.

### Import behavior

1. Check if **any** of the v1.x `localStorage` keys exist:
   - `clarity-chatbot-key`
   - `clarity-chatbot-mgmt-key`
   - `clarity-chatbot-history`
   - `clarity-chatbot-state`
   - `clarity-chatbot-requests`
   - `clarity-chatbot-geometry`
   - `clarity-chatbot-settings-override`

2. If at least one key is found, read **all** of them (missing ones are
   silently skipped).

3. Write the imported data into IndexedDB:
   - `clarity-chatbot-key` and `clarity-chatbot-mgmt-key` &#x2192;
     `state` store (keys `api-key` and `mgmt-key`), preserving the
     XOR-obfuscated value as-is so the existing `deobfuscate()` path
     still works.
   - `clarity-chatbot-history` &#x2192; each message entry written to
     `messages` store with `path = '(imported-v1)'` (since v1.x did
     not track which page a message belonged to). The reader can see
     these in the ↺ history panel under the `(imported-v1)` group and
     delete or pin them as needed.
   - `clarity-chatbot-state` &#x2192; `state` store key `panel-state`.
   - `clarity-chatbot-requests` &#x2192; `state` store key `requests`.
   - `clarity-chatbot-geometry` &#x2192; `state` store key `geometry`.
   - `clarity-chatbot-settings-override` &#x2192; `state` store key
     `settings-override`.

4. Write a marker into IndexedDB: `state` store key
   `v1-import-complete = true`. This makes step 1 a no-op on
   subsequent boots even though the `localStorage` keys still exist.

### Old localStorage keys are NOT deleted

The import is **non-destructive**: `localStorage` keys are left in
place after import. Reasons:

- **Debugging**: deployers and maintainers can compare the old
  `localStorage` values against the new IndexedDB entries to verify the
  import worked correctly.
- **Rollback safety**: if a deployer downgrades from v2.x back to v1.x
  (e.g. pinning `sphinx-clarity<2` in requirements.txt), the old keys
  are still there and the v1.x code picks them up as if nothing
  happened.
- **No data loss guarantee**: a failed or interrupted import does not
  leave the reader with neither old nor new data.

The old keys become inert: the v2.x code never reads them in its
normal path (only during the import check). They occupy negligible
space (~2-5 KB total) and can be cleaned up manually via DevTools or
via a future `clarity-chatbot-purge-v1` admin action if desired.

### Re-import guard

The `v1-import-complete` marker in IndexedDB prevents re-importing on
every page load. If the marker is present, the import step is skipped
entirely -- even if `localStorage` keys still exist. This avoids
overwriting any edits the reader made in IndexedDB after the initial
import (e.g. deleting imported messages, changing settings).

If a deployer needs to force a re-import (e.g. after a bug fix to the
import logic), they can clear the marker via DevTools:

```js
// Force re-import on next page load
var req = indexedDB.open('clarity-chatbot', 1);
req.onsuccess = function (e) {
  var tx = e.target.result.transaction('state', 'readwrite');
  tx.objectStore('state').delete('v1-import-complete');
};
```

---

## Consent gating

IndexedDB `open()` and all transactions are gated on
`window.__clarityConsent`. If consent is not given:

- The database is not opened.
- All read operations return empty results.
- All write operations are silent no-ops.
- The chatbot still functions for the current page session (in-memory
  history only) but nothing persists.

---

## Async adaptation

IndexedDB is asynchronous. The current `loadHistory()` returns a value
synchronously. The migration path:

- `chatbot-storage.js` exposes a `ready()` promise that resolves once
  the database is open and migration (if needed) is complete.
- `chatbot.js` calls `storage.ready().then(initChatbot)` instead of
  calling `initChatbot()` directly.
- Inside `initChatbot`, all storage reads use `await` or promise
  chains. The boot sequence becomes:

```
storage.ready()
  .then(function () { return storage.loadHistory(currentPath); })
  .then(function (history) { return storage.loadContext(currentPath).then(...); })
  .then(function () { /* wire DOM, render history, etc. */ });
```

The DOMContentLoaded guard remains; `storage.ready()` runs inside it.

---

## Files to modify

| File | Change |
|------|--------|
| `src/clarity/static/js/chatbot-storage.js` | Replace localStorage with IndexedDB. Expose `ready()` promise, per-path `loadHistory` / `saveMessage` / `deleteMessage`, `loadContext` / `pinEntry` / `unpinEntry`, `state` CRUD. Keep `safeGet` / `safeSet` for the two localStorage survivors. |
| `src/clarity/static/js/chatbot.js` | Async boot via `storage.ready().then(initChatbot)`. History + context loaded per-path. Page-change detection (compare stored path) for the context-switch marker. |
| `src/clarity/static/js/chatbot-api.js` | `buildSystemPrompt` adds Layer 2 (page title + URL) and Layer 4 (pinned context array). |
| `src/clarity/static/js/chatbot-render.js` | New `renderHistoryPanel()` for the ↺ panel overlay. |
| `src/clarity/chatbot.html` | Add ↺ button in header controls. Add history panel overlay markup (tabs, entry list, bulk actions). |
| `src/clarity/static/css/chatbot.css` | History panel overlay styles, entry row layout, pin/delete/append button styles, tab toggle. |
| `docs/source/chatbot.rst` | Document the history panel, pinned context, per-page scoping. |
| `docs/source/consent.rst` | Note IndexedDB consent gating. |
| `docs/source/privacy.rst` | Replace the localStorage key table with IndexedDB store descriptions. |

---

## Open questions

1. ~~Should the history panel show a search field?~~
   **Decided**: yes, from the start. Debounced text input at the top of
   the panel, cursor scan across all pages.
2. ~~Should pinned context be editable in-place?~~
   **Decided**: no. Pinned text is a read-only copy. The reader can
   unpin and re-pin a different entry but cannot modify the text.
3. ~~Should the migration from localStorage be silent or show a notice?~~
   **Decided**: silent. Old keys are preserved for debugging; no notice
   needed.
4. ~~Should /read summaries auto-pin?~~
   **Decided**: ask once per /read. After each /read summary renders,
   show a small inline "Pin this summary?" prompt below the message.
   One click to pin, otherwise it stays as regular history only.
5. ~~Should old localStorage keys be deleted after import?~~
   **Decided**: no. Kept for debugging and v1.x rollback safety.

---

## Verification

1. Open the chatbot on page A, ask a question, get an answer.
2. Navigate via `/goto` to page B. Confirm: the history panel shows
   page A's conversation under "All pages" but the chat area for page B
   is empty.
3. Ask a question on page B. Pin the answer.
4. Navigate back to page A. Confirm: page A's history is intact, page
   B's pinned answer does not appear in page A's system prompt.
5. Return to page B. The pinned answer is visible in the system prompt
   context and the model references it.
6. Decline consent via the footer link. Confirm: IndexedDB is not
   opened, no data persists, chatbot works in-memory only.
7. Purge via ⌧. Confirm: all IndexedDB stores are cleared.
