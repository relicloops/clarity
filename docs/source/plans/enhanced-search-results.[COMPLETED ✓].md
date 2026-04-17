---
title: Enhanced search results with per-match line and column positions
tags:
  - "#clarity"
  - "#search"
status: completed
updated: 2026-04-17
priority: high
phase: implementation
---

# Enhanced Search Results

## Context

Sphinx's built-in search shows one entry per matching page with a
context snippet. The user wants:

1. **Multiple matches per page** -- every occurrence of the search term
   in a document, not just the first or the highest-scoring one.
2. **Position info** -- each match shows `file -> [line][column]` so the
   reader can see exactly where the term appears.
3. **Direct links** -- each match links to the page with the term
   highlighted (the existing `?highlight=` parameter already handles
   this).

The existing highlight-on-navigate behavior works well and stays as-is.

---

## Why this is hard with vanilla Sphinx

Sphinx's `searchindex.js` maps **terms to document IDs**, not to
character positions. It stores term frequency for scoring but not
byte/line offsets. The search results page (`search.html`) renders one
card per document with a truncated context snippet extracted at build
time.

Adding position data to the search index requires either:

- A custom Sphinx extension that hooks into the indexer and writes
  richer data.
- OR client-side post-processing that fetches each matched page and
  finds positions dynamically.

---

## Recommended approach: client-side position resolver

After Sphinx's built-in search returns matching documents, a custom
results renderer fetches each matched page's HTML, scans the text
content for all occurrences of the search term, computes line/column
for each, and renders the results in the enhanced format.

### Flow

```
1. Reader types "chatbot" in the search bar.
2. Sphinx's built-in search runs against searchindex.js.
3. Matching document IDs are returned (e.g. chatbot.html,
   configuration.html, privacy.html).
4. For each matched document:
   a. Fetch the page HTML via fetch().
   b. Parse with DOMParser, extract .page-content text.
   c. Split text into lines.
   d. For each line, find all occurrences of the search term.
   e. Record { file, line, column, contextSnippet } per match.
5. Render results grouped by file, with one row per match:

   chatbot.rst
     [12:23] ...built-in chatbot widget that answers questions...
     [45:8]  ...the chatbot uses the configured OpenRouter model...
     [89:15] ...chatbot header provides four control buttons...

   configuration.rst
     [49:5]  ...chatbot_enabled controls whether the chatbot...
```

### Advantages

- No Sphinx extension required. Pure client-side JS.
- Works with the existing searchindex.js (document-level matching).
- Each result row links to `page.html?highlight=chatbot#line-N` (or
  a computed anchor for the nearest heading).
- Scales to any number of matches without bloating the search index.

### Limitations

- Fetching each matched page adds latency (~50-200ms per page over
  localhost, more on slow connections). Mitigated by fetching in
  parallel (Promise.all) and showing a "scanning N pages..." progress
  indicator.
- Line/column numbers are computed from the RENDERED text content, not
  the RST source. The reader sees "line 12" which means line 12 of
  the visible page text, not line 12 of the `.rst` file. This is
  acceptable because the reader navigates to the rendered page.
- Very common terms (e.g. "the") will produce hundreds of matches.
  Cap at 10 matches per document + a "show all" toggle.

---

## UI design

### Results page layout

```
Search results for "chatbot"                    [3 pages, 47 matches]

chatbot.rst                                              [28 matches]
  [12:23] ...built-in chatbot widget that answers...          ->
  [45:8]  ...the chatbot uses the configured OpenRouter...    ->
  [89:15] ...chatbot header provides four control buttons...  ->
  ... +25 more (show all)

configuration.rst                                        [12 matches]
  [49:5]  ...chatbot_enabled controls whether the chatbot...  ->
  [62:18] ...chatbot_model sets the OpenRouter model ID...    ->
  ... +10 more (show all)

privacy.rst                                               [7 matches]
  [156:3] ...When the AI documentation chatbot is used...     ->
  ... +6 more (show all)
```

### Per-match row

Each match row shows:
- `[line:col]` in monospace, muted color.
- Context snippet (~60 chars) with the search term **bolded**.
- A `->` link to the page at the nearest heading anchor, with
  `?highlight=term` so the existing highlighter fires.

### Progress indicator

While fetching pages for position scanning, the `⊛` spinner (or a
simpler dots animation) shows below the search input with
"Scanning N pages...".

---

## Files to create / modify

| File | Change |
|------|--------|
| **NEW** `src/clarity/static/js/search-enhance.js` | IIFE that overrides Sphinx's default `Search.setOutput` / result rendering. Fetches matched pages, computes positions, renders enhanced results. |
| **NEW** `src/clarity/static/css/search-results.css` | Styles for the enhanced results: file headers, match rows, line/col badge, context snippet, "show all" toggle. |
| `src/clarity/layout.html` | Load `search-enhance.js` after Sphinx's `searchtools.js`. Link `search-results.css`. |
| `docs/source/navigation-and-controls.rst` | Document the enhanced search results format. |

---

## Implementation phases

### Phase 1: Override Sphinx search output

Sphinx's `Search` object (from `searchtools.js`) is global. After it
runs, it calls `Search.setOutput()` to render results into
`[role=main]`. We hook into this by:

```js
/* Wait for Sphinx's Search to be defined, then monkey-patch
   the output renderer. */
var origOutput = Search.setOutput;
Search.setOutput = function (results) {
  enhancedRender(results);
};
```

Or use a MutationObserver on the results container to intercept
Sphinx's output and rewrite it.

### Phase 2: Fetch + scan

For each result document:

```js
fetch(docUrl)
  .then(r => r.text())
  .then(html => {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var content = doc.querySelector('.page-content');
    var text = content.innerText;
    var lines = text.split('\n');
    var matches = [];
    var term = searchTerm.toLowerCase();
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var col = line.toLowerCase().indexOf(term);
      while (col !== -1) {
        matches.push({
          line: i + 1,
          col: col + 1,
          context: extractContext(line, col, term.length)
        });
        col = line.toLowerCase().indexOf(term, col + 1);
      }
    }
    return { file: docUrl, matches: matches };
  });
```

### Phase 3: Render

Build the grouped result UI and insert into the search results
container, replacing Sphinx's default list.

---

## Resolved questions

1. ~~Regex or plain text?~~
   **Decided**: plain text by default + optional regex toggle. A small
   toggle or `/regex/` syntax in the search input activates regex mode.
   Default is case-insensitive substring matching.

2. ~~Link target per match?~~
   **Decided**: nearest heading anchor. Link to the closest `<hN>` with
   an `id` above the match (e.g. `chatbot.html#controls?highlight=term`).
   No per-line anchor injection needed.

3. ~~Auto-scan or on-demand?~~
   **Decided**: auto for <= 20 matched pages, "Show positions" button
   for > 20. The threshold is 20 (not 10) to cover most real searches
   while avoiding the "search for 'the' fetches 200 pages" problem.

4. **Spinner symbol**: use `⁇` (U+2047, double question mark) inside
   a rainbow-glowing circle, centered as a full-overlay above a
   "Searching N pages for <term>" label. Replaces the initial
   `⊛` (U+229B) proposal -- the larger circular overlay reads
   better on a full search page than an inline spinner. The update
   check keeps `⊛` in the header; they remain visually distinct so
   the two flows aren't confused. Minimum display time: 3 seconds
   so the reader always sees that work happened.

---

## Verification

1. Search for "chatbot" -- results show multiple matches per page
   with line/column.
2. Click a match row -- navigates to the page with the term
   highlighted.
3. Search for a term that appears 100+ times -- results are capped
   at 10 per page with a "show all" toggle.
4. Search with skins active -- results render in the skin's palette.
5. Search on mobile -- results are readable and scrollable.
