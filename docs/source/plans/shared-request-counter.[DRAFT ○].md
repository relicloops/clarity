---
title: Shared request counter via edge proxy and Turso
tags:
  - "#clarity"
  - "#chatbot"
  - "#turso"
  - "#cloudflare-workers"
  - "#privacy"
status: draft
updated: 2026-04-16
priority: high
phase: design
blocks: indexeddb-chatbot-storage
---

# Shared Request Counter

**Depends on**: `indexeddb-chatbot-storage.[DRAFT ○].md` (the IndexedDB
migration must land first so the local counter already lives in
IndexedDB; this plan adds a shared remote layer on top).

---

## Why this matters

The chatbot currently tracks "requests today" as a per-browser counter
in localStorage (migrating to IndexedDB per the sibling plan). This
counter is local to a single browser on a single site. When the same
OpenRouter API key is used by multiple chatbot instances across
different documentation sites (or even different browsers on the same
site), each instance sees only its own slice of the total usage.

OpenRouter's rate limits apply **per key globally**, not per site. So a
reader on site A may see "2 req today" while a reader on site B sees
"3 req today", but the real total is 5, and a free-tier cap of 50
would be reached at 50 -- not at the 2 or 3 each instance thinks it
has used.

A shared counter gives every chatbot instance a single source of truth
for the day's request count per key, regardless of which site or
browser the request came from.

### Important: no hosted service, no shared keys

Clarity does **not** operate a central counter service and does **not**
provide or subsidize OpenRouter API keys. Every reader supplies their
own OpenRouter key in the chatbot panel; the theme never ships a
built-in key. The shared counter follows the same principle: the
**deployer** provisions and self-hosts the Turso database + Cloudflare
Worker. Clarity ships the Worker source code and a deployment guide,
but the infrastructure belongs to the deployer, not to the theme
project.

This means:
- No relicloops-operated backend. No SaaS dependency.
- The deployer's Turso free tier and Cloudflare free tier are consumed
  by their own docs site traffic, not pooled across the Clarity
  ecosystem.
- If a deployer never sets `chatbot_counter_url`, zero remote requests
  are made and the chatbot falls back to its local-only counter.

---

## PlanetScale status

PlanetScale removed its free Hobby tier in March 2024. The cheapest
plan (Scaler) is $39/month. Not viable for a built-in feature of a
free open-source Sphinx theme.

---

## Chosen stack

### Turso (data store)

- **What**: edge-replicated libSQL (SQLite fork) database.
- **Free tier**: 5 GB storage, 500M row reads/month, 100 databases.
  More than sufficient for a counter table.
- **Why Turso over simpler KV**: gives us SQL for future analytics
  (per-model breakdowns, weekly/monthly rollups, usage dashboards)
  without migrating away from a key-value store later. The counter
  query itself is a single `INSERT ... ON CONFLICT DO UPDATE`.
- **Auth**: a read-write auth token issued by the Turso CLI. This
  token lives in the edge proxy's environment, never in browser JS.

### Cloudflare Workers (edge proxy)

- **What**: serverless edge function that sits between the browser
  and Turso. Validates the request, hashes the API key, writes to
  Turso, returns the count.
- **Free tier**: 100K requests/day (the chatbot counter fires once
  per chat message -- well within budget for any docs site).
- **Why a proxy**: the Turso auth token and the database URL must
  not be embedded in browser-shipped JavaScript. The Worker is the
  only component that talks to Turso; the browser talks only to the
  Worker.

### Architecture

```
Reader's browser                     Edge
 ┌─────────────┐                    ┌──────────────────┐
 │ chatbot.js  │── POST /count ──→  │ Cloudflare Worker │
 │             │←── { today: N } ── │   (proxy)         │
 └─────────────┘                    │                   │
                                    │  1. SHA-256(key)  │
                                    │  2. UPSERT row    │
                                    │  3. SELECT count  │
                                    │                   │
                                    └────────┬──────────┘
                                             │
                                    ┌────────▼──────────┐
                                    │   Turso (libSQL)   │
                                    │   edge-replicated  │
                                    └───────────────────┘
```

---

## Turso schema

A single table:

```sql
CREATE TABLE IF NOT EXISTS request_counts (
  key_hash  TEXT    NOT NULL,   -- SHA-256 of the OpenRouter API key
  day       TEXT    NOT NULL,   -- UTC date 'YYYY-MM-DD'
  count     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key_hash, day)
);
```

The Worker executes on every call:

```sql
INSERT INTO request_counts (key_hash, day, count)
VALUES (?1, ?2, 1)
ON CONFLICT (key_hash, day)
DO UPDATE SET count = count + 1
RETURNING count;
```

This atomically increments and returns the new count in one round-trip.

### Cleanup

Old rows are pruned by a scheduled Worker cron (e.g. daily) that runs:

```sql
DELETE FROM request_counts
WHERE day < date('now', '-7 days');
```

Seven days of history is enough for the 30-day activity display (the
rest comes from OpenRouter's own `/api/v1/activity` endpoint via the
management key). Turso's free tier has 5 GB -- this table will never
approach that even at millions of rows.

---

## Cloudflare Worker API

### `POST /count`

**Request** (from chatbot.js):

```json
{
  "keyHash": "a]2f8...64-char-hex",
  "origin":  "https://docs.example.com"
}
```

The browser **never sends the raw API key**. `chatbot.js` computes
`SHA-256(apiKey)` in the browser via `crypto.subtle.digest` and sends
only the hex hash.

**Response**:

```json
{
  "today": 7,
  "day":   "2026-04-16"
}
```

### `GET /count?keyHash=...`

Read-only variant for periodic refresh (no increment). Returns the
same shape.

### CORS

The Worker responds with:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

This is safe because the Worker receives only a hash (not a key) and
returns only a count (not sensitive data).

### Rate limiting

The Worker enforces a simple per-IP rate limit (e.g. 120 req/minute)
via Cloudflare's built-in rate-limiting rules to prevent abuse of the
free tier.

---

## Browser-side changes (chatbot.js)

### Hashing the API key

```js
async function hashKey(apiKey) {
  var enc = new TextEncoder().encode(apiKey);
  var buf = await crypto.subtle.digest('SHA-256', enc);
  var arr = Array.from(new Uint8Array(buf));
  return arr.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
}
```

`crypto.subtle` is available in all modern browsers (and in
Cloudflare Workers). The hash is computed once at boot (when the API
key is loaded from IndexedDB) and cached for the session.

### Increment flow

On every `sendMessageStream` call, **before** the fetch to OpenRouter:

1. `POST /count` to the Worker with `{ keyHash, origin }`.
2. Worker responds with `{ today: N }`.
3. The UI rate-info line uses this `N` as the authoritative today
   count instead of the local IndexedDB counter.

The local IndexedDB counter (`requests` key in the `state` store) is
still incremented as a fallback for:
- Offline usage (no internet but the docs are served from `file://`)
- Worker downtime or network errors

The display logic prefers the remote count when available, falls back
to the local count otherwise.

### Periodic refresh

The existing `setInterval(60000)` refresh now calls `GET /count` (no
increment) so the reader sees the global total even if other sites
are consuming requests on the same key.

---

## New theme option

```ini
# theme.conf
chatbot_counter_url =
```

```python
# conf.py
html_theme_options = {
    "chatbot_counter_url": "https://clarity-counter.your-worker.workers.dev",
}
```

When empty (the default), the chatbot falls back to the local-only
counter -- no remote calls are made. This keeps backward compatibility
and lets deployers opt in only when they run multi-site keys.

The URL is passed to the browser via a `data-counter-url` attribute on
`#clarity-chatbot`, same pattern as the other `chatbot_*` options.

---

## Privacy implications

### What is sent to the proxy

| Field | Content | Sensitivity |
|-------|---------|-------------|
| `keyHash` | SHA-256 of the OpenRouter API key | One-way hash. Cannot recover the key. An attacker who intercepts the hash can check if a known key matches, but cannot derive unknown keys. |
| `origin` | `window.location.origin` | The documentation site URL. Already visible in the OpenRouter `HTTP-Referer` header on every chat request. No new exposure. |

### What is NOT sent

- The raw API key is never transmitted to the proxy. The reader's key
  stays in their browser (IndexedDB) and is only ever sent to
  OpenRouter's own endpoints. The proxy receives a one-way SHA-256
  hash that cannot be reversed into the key.
- No page content, conversation history, user questions, or model
  responses reach the proxy. The proxy sees only a hash + origin +
  the fact that a request happened.
- No cookies, no user identifiers, no IP logging beyond what
  Cloudflare does by default (and Cloudflare Workers logs are
  ephemeral / opt-in).

### No central service

The proxy is self-hosted by the deployer. Clarity (the theme project)
does not operate, fund, or monitor any counter backend. There is no
"phone home" to relicloops infrastructure. If `chatbot_counter_url`
is empty (the default), the chatbot makes zero requests beyond the
OpenRouter calls the reader explicitly initiates by sending a message.

### Consent

The counter call is gated on `window.__clarityConsent` (same as every
other chatbot network call). If the reader declines consent, no
counter requests are made to the proxy -- the chatbot falls back to
the local-only counter.

Additionally, since `chatbot_counter_url` is empty by default, the
remote counter is strictly opt-in per deployer. A deployer who never
sets the URL ships zero additional network requests.

### Docs updates needed

- `docs/source/privacy.rst`: add a "Shared request counter" section
  in the External Requests block, documenting the proxy URL, what is
  sent (keyHash + origin), what is not sent, and the consent gate.
- `docs/source/chatbot.rst`: update the Rate Limits section to
  describe the shared counter, the fallback logic, and the
  `chatbot_counter_url` option.
- `docs/source/configuration.rst`: add `chatbot_counter_url` to the
  options table.
- `docs/source/consent.rst`: note that the counter request is
  consent-gated alongside the OpenRouter API calls.

---

## Deployment guide (for the deployer)

The counter infrastructure is entirely **self-hosted by the deployer**.
Clarity provides the Worker source code under `workers/counter/` and
this guide; nothing runs on relicloops-operated servers. Each reader
still supplies their own OpenRouter API key in the chatbot panel --
the counter simply tracks how many times that key has been used today,
aggregated across every site the deployer points at the same Worker.

1. Create a free Turso account at https://turso.tech and a database:

   ```bash
   turso db create clarity-counter
   turso db tokens create clarity-counter
   ```

2. Create the table:

   ```bash
   turso db shell clarity-counter \
     "CREATE TABLE IF NOT EXISTS request_counts (
        key_hash TEXT NOT NULL,
        day TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (key_hash, day)
     );"
   ```

3. Deploy the Cloudflare Worker (source shipped with the theme under
   `workers/counter/`):

   ```bash
   cd workers/counter
   wrangler secret put TURSO_URL     # paste the libsql:// URL
   wrangler secret put TURSO_TOKEN   # paste the DB token
   wrangler deploy
   ```

4. Set the Worker URL in `conf.py`:

   ```python
   html_theme_options = {
       "chatbot_counter_url": "https://clarity-counter.<you>.workers.dev",
   }
   ```

5. Rebuild the docs. The chatbot will now POST to the Worker on every
   request and display the global count.

---

## Files to add / modify

| File | Change |
|------|--------|
| **NEW** `workers/counter/src/index.js` | Cloudflare Worker: POST /count (increment + return), GET /count (read), CORS, rate limit, Turso client. |
| **NEW** `workers/counter/wrangler.toml` | Worker config: name, compatibility date, secrets binding. |
| **NEW** `workers/counter/package.json` | `@libsql/client` dependency for Turso. |
| `src/clarity/theme.conf` | Add `chatbot_counter_url =` option. |
| `src/clarity/chatbot.html` | Add `data-counter-url` attribute. |
| `src/clarity/static/js/chatbot-storage.js` | Add `counterUrl` to `loadSettings()`. |
| `src/clarity/static/js/chatbot.js` | `hashKey()` via crypto.subtle, POST/GET /count integration, fallback logic, periodic refresh upgrade. |
| `docs/source/privacy.rst` | Shared counter privacy section. |
| `docs/source/chatbot.rst` | Rate limits section update. |
| `docs/source/configuration.rst` | `chatbot_counter_url` option row. |
| `docs/source/consent.rst` | Note counter consent gating. |

---

## Open questions

1. Should the Worker source ship inside the Clarity repo (under
   `workers/counter/`) so deployers can fork and self-host, or should
   it live in a separate `clarity-counter` repo?
2. Should the response include yesterday's count too (for a quick
   "yesterday vs today" comparison in the UI)?
3. Should the `origin` field be optional (deployers running a single
   site may not want to send it)?

---

## Verification

1. Deploy the Worker + Turso DB locally (`wrangler dev`).
2. Open the chatbot on two different documentation sites (or two
   localhost ports) with the same API key.
3. Send a message on site A. Confirm the counter shows 1.
4. Send a message on site B. Confirm the counter shows 2 (not 1).
5. Refresh site A. Confirm the periodic refresh picks up the new
   total (2).
6. Decline consent on a fresh browser. Confirm no `/count` request
   is made (check DevTools Network tab).
7. Remove `chatbot_counter_url` from `conf.py`. Confirm the chatbot
   falls back to the local-only counter with no errors.

Sources:
- [PlanetScale Hobby Plan Deprecation FAQ](https://planetscale.com/docs/plans/hobby-plan-deprecation-faq)
- [Turso Pricing](https://turso.tech/pricing)
- [PlanetScale Alternatives with Free Tiers](https://blog.logrocket.com/11-planetscale-alternatives-free-tiers/)
- [Turso Edge Database](https://turso.tech/)
