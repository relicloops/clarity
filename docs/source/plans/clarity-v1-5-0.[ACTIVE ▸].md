---
title: Clarity v1.5.0-000 -- "Peak v1" release
tags:
  - "#clarity"
  - "#release"
  - "#v1-5-0"
status: active
updated: 2026-04-17
priority: critical
phase: implementation
---

# Clarity v1.5.0-000 -- "Peak v1" Release

## Context

Clarity v1.4.0-000 shipped the theme's first feature-complete release:
dark/light/system, chatbot, 6 skins, update checker, retro 404, enhanced
search. Since then the working tree has grown three new capabilities:

- **sessionStorage fallback** so declined-consent readers still keep
  preferences for the tab session.
- **Chatbot digest/ingest** for local conversation export/import.
- **Conditional PyPI publish gate** so docs-only tags don't pollute
  the release train.

Next up is the **granular privacy system**: per-key CAN/CANNOT +
scheduled purge (TTL), a standalone Privacy Settings modal, and
reader-level kill-switches for Google Fonts, PyPI, OpenRouter. That
closes the "I own my data" story and lets users pick exactly what the
theme may remember and for how long.

Release direction:

- **One release**: bundle everything into v1.5.0-000. No intermediate
  tag.
- **Strategic positioning**: v1.5.0-000 is **peak v1** -- simpler, more
  invasive, full-featured. Users can pin v1.x for a stable theme; v2
  (IndexedDB, shared counter, source-in-docs) becomes a bigger,
  optional leap later.
- Surface coverage: `src/`, `docs/`, `README.md`, `CHANGELOG.md`.

Decisions made up-front:

- **Release cadence**: one release (v1.5.0-000).
- **Panel surface**: standalone page-level modal.
- **Default TTL profile**: all "Never" on Accept all (conservative,
  matches today's behaviour exactly).

---

## Waves

Three execution waves. Each wave lands as 1-N commits. The whole thing
culminates in a single tag.

### Wave 0 -- close the backlog, commit what's staged

Goal: get to a clean, committed main with enhanced-search and the
currently staged work closed out, BEFORE starting granular privacy.

**0.1 Enhanced-search loose ends**

- Delete dead code: `createSpinner` function in
  `src/clarity/static/js/search-enhance.js` (lines 499-513; never
  called; leftover from the `⊛` -> `⁇` overlay migration).
- Update `docs/source/navigation-and-controls.rst` "Header Search"
  section (~15 lines replacing the stale "small location badge"
  paragraph): describe per-match `[line:col]`, regex toggle,
  "Show positions" button, rainbow-glowing `⁇` overlay.
- Amend plan text in `enhanced-search-results.[DRAFT ○].md`
  (Resolved Questions #4): spinner is `⁇` (U+2047) in a rainbow-glowing
  circle, not `⊛`.
- Rename plan file to `[COMPLETED ✓]`, update YAML `status`, update
  `docs/source/plans/index.rst` toctree (move under Completed caption).

**0.2 Commit the staged work** (4 commits from the earlier evaluation)

1. `feat(storage): sessionStorage fallback when consent is declined`
   - chatbot-storage.js, theme-toggle.js, skin-switcher.js,
     consent.js purge, layout.html early-loader hunk only,
     privacy.rst sessionStorage-only hunks.
2. `feat(chatbot): digest and ingest conversation history`
   - chatbot-digest.js (new), chatbot-ingest.js (new), chatbot.html,
     chatbot.css, chatbot.js, layout.html script-include hunks,
     chatbot.rst, privacy.rst "Chatbot digest and ingest" hunk.
3. `ci: publish to PyPI only when wheel-relevant paths change`
   - .github/workflows/ci.yml, maintainer-workflow.rst.
4. `docs(plans): mark digest/ingest, publish-gate, enhanced-search
   completed; add drafts`
   - plans/index.rst + the four new plan files.

Two files need `git add -p`:

- `src/clarity/layout.html` (split across commits 1 and 2).
- `docs/source/privacy.rst` (split across commits 1 and 2).

### Wave 1 -- granular privacy + TTL

Implement `docs/source/plans/granular-privacy-and-ttl.[DRAFT ○].md`
in its 6-phase structure. Default profile = all `Never` TTL on Accept,
all `CANNOT` on Decline (current behaviour preserved; TTL strictly
opt-in via the panel).

**Inventory to replace / add** (confirmed via exploration):

- Create `src/clarity/static/js/privacy.js` (IIFE, envelope helpers,
  `window.__clarityPrivacy.canStore(key)` / `canFetch(host)` /
  `ttl(key)` / `onChange()`).
- Create `src/clarity/privacy-panel.html` (Jinja partial) and
  `src/clarity/static/css/privacy-panel.css`.
- Replace 11 read sites of `window.__clarityConsent` (per audit):
  - consent.js:132 -> `canFetch('fonts.googleapis')` before fonts load
  - theme-toggle.js:19, skin-switcher.js:45, chatbot-storage.js:90
    -> `canStore(key)` inside pickStore
  - skin-switcher.js:113 -> `canFetch('fonts.googleapis')` for skin
    fonts
  - clarity.js:213, 225 -> text-size storage check
  - update-check.js:147 -> `canFetch('pypi.update-check')`
- 3 write sites for `clarity-consent` in consent.js (20, 103, 111,
  122) each should also update or clear `clarity-privacy`.
- Refactor `update-check.js`: currently writes DISMISSED_KEY directly
  via `localStorage.setItem` (line 129). Route through a helper so
  CAN/CANNOT and envelope rules apply.
- Wrap external fetches: PyPI (update-check.js:177), OpenRouter
  (chatbot-api.js:45, 60, 116), Google Fonts (consent.js:37-64,
  skin-switcher.js:118-134). When blocked, chatbot-api shows a
  one-line "OpenRouter access is disabled in Privacy Settings"
  notice.
- Add third "Customize..." button to `src/clarity/consent.html`
  alongside Accept/Decline (the flex layout has room, confirmed).
- Rewire footer "Privacy settings" link to open the new modal
  instead of re-showing the old banner.
- Add a small "Privacy" shortcut inside the chatbot settings panel
  near the Digest/Ingest buttons.
- Boot-time TTL sweep in privacy.js: once per load, iterate known
  keys, clear expired envelopes even without a subsequent read.

**Same-origin fetches stay ungated**:

- search-enhance.js:257 (page scan for positions)
- chatbot.js:822 (`/read` command)

These are navigation-adjacent, not third-party -- explicitly out of
scope per the plan.

**Docs updates in this wave**:

- `docs/source/privacy.rst`: new "Granular controls and retention"
  section, TTL reference table, consent-profile matrix.
- `docs/source/configuration.rst`: note the new footer link and any
  deployer-level hook (deferred to v2 per the plan's open question
  #3).
- `docs/source/plans/granular-privacy-and-ttl.[DRAFT ○].md` ->
  `[COMPLETED ✓]` at the end of this wave.

**Commit breakdown for Wave 1** (~7 commits, all scoped):

1. `feat(privacy): foundation module with envelope + canStore/canFetch`
2. `refactor(storage): route JS IIFEs through privacy.canStore`
3. `feat(privacy): gate external fetches on canFetch(host)`
4. `feat(privacy): Customize button + standalone settings modal`
5. `feat(privacy): boot-time TTL sweep`
6. `docs(privacy): granular controls section + TTL table`
7. `docs(plans): mark granular-privacy completed`

### Wave 1.5 -- text-size polish

Small final UI touch before the release ceremony: the text-size
controls currently give zero feedback about the active zoom level.
Add a small percentage badge that **floats above** the `-`/`+` pair
at a higher z-index so the buttons stay fully clickable while the
current percentage reads out at the top centre of the control group.

- Markup: `<span id="text-size-percent" class="text-size-percent">100%</span>`
  added as a child of `.text-size-controls` in
  `src/clarity/layout.html`.
- Style: the parent `.text-size-controls` becomes
  `position: relative`. The span is `position: absolute` anchored
  top centre (`top: -1em; left: 50%; transform: translateX(-50%);`)
  with `z-index: 2` (buttons implicitly at 1). CSS
  `text-decoration: overline` on the span produces the thin line
  above the number. Muted colour by default, accent on hover/focus.
  `pointer-events: none` so clicks pass through to the buttons.
- JS: `initTextSize()` in `src/clarity/static/js/clarity.js` renders
  the current size into the span on boot and on every `-` / `+`
  click. Shares `getStoredTextSize` / `applyTextSize` -- no extra
  state.

Commit: `feat(text-size): show current percentage between controls`.

### Wave 2 -- release ceremony

**2.1 README audit + surgical edits** (per the audit report, 4-5
targeted additions; no rewrite):

- New Features bullet: Chatbot Digest/Ingest.
- New Features bullet: Enhanced search (`[line:col]` positions +
  regex toggle + spinner).
- New Features bullet: sessionStorage fallback on consent decline.
- New Features bullet: Granular privacy + TTL.
- New Step in the walkthrough (after step 8 "update checker"): a
  short section for enhanced search and privacy settings.

**2.2 Version mirror + CHANGELOG**

**Invoke the `version-bumping` skill** before cutting the tag. The
skill's decision table will confirm the bump type; granular-privacy
and digest/ingest are new features with no breaking API -> MINOR
bump -> **v1.5.0-000** derived from latest tag `v1.4.0-000`. Reset
semantics: PATCH -> 0, BUILD -> 3-digit padded zeros (MINOR stays
single-digit so BUILD stays 3-wide).

After the skill confirms the version:

- Bump `pyproject.toml` version from `1.4.0.0` to `1.5.0.0`
  (PEP 440 4-segment mirror, hyphen rejected so build `-000` -> `.0`).
- Bump `docs/source/conf.py`: `version = "1.5"`, `release = "v1.5.0-000"`.
- Regenerate `CHANGELOG.md` via `git-cliff --config cliff.toml
  --unreleased --tag v1.5.0-000 --prepend CHANGELOG.md` OR the
  equivalent project workflow.
- Commit order inside Wave 2:
  1. `docs(readme): digest/ingest, enhanced search, sessionStorage,
     granular privacy`
  2. `chore(release): bump to v1.5.0-000` (pyproject + conf.py +
     CHANGELOG regeneration together, per the repo's convention
     that CHANGELOG lands LAST with the version bump).

**2.3 Tag and push**

- `git tag -s v1.5.0-000 -m "release: v1.5.0-000 -- peak v1
  (digest/ingest, sessionStorage fallback, conditional publish,
  granular privacy + TTL)"`
- Verify GPG signature: `git log --show-signature -1`.
- Push commits first, then tag, per repo policy.
- CI gate verifies wheel-relevant paths changed -> publishes
  automatically. GitHub release created from git-cliff notes.

---

## File inventory (aggregate across all waves)

**New files**:

- `src/clarity/static/js/privacy.js`
- `src/clarity/privacy-panel.html`
- `src/clarity/static/css/privacy-panel.css`
- Already staged: `src/clarity/static/js/chatbot-digest.js`,
  `chatbot-ingest.js`.

**Modified files** (src/):

- `src/clarity/static/js/chatbot-storage.js`
- `src/clarity/static/js/theme-toggle.js`
- `src/clarity/static/js/skin-switcher.js`
- `src/clarity/static/js/consent.js`
- `src/clarity/static/js/update-check.js`
- `src/clarity/static/js/chatbot-api.js`
- `src/clarity/static/js/chatbot.js`
- `src/clarity/static/js/clarity.js`
- `src/clarity/static/js/search-enhance.js` (remove createSpinner)
- `src/clarity/consent.html`
- `src/clarity/chatbot.html`
- `src/clarity/layout.html` (include privacy.js + modal + CSS link)
- `src/clarity/static/css/chatbot.css`

**Modified files** (docs/):

- `docs/source/navigation-and-controls.rst`
- `docs/source/chatbot.rst`
- `docs/source/privacy.rst`
- `docs/source/configuration.rst`
- `docs/source/maintainer-workflow.rst`
- `docs/source/plans/index.rst`
- `docs/source/plans/enhanced-search-results.*.md` (-> COMPLETED)
- `docs/source/plans/granular-privacy-and-ttl.*.md` (-> COMPLETED at
  Wave 1 close)
- `docs/source/conf.py` (version / release mirror)

**Root files**:

- `README.md` (4-5 surgical additions)
- `CHANGELOG.md` (regenerated by git-cliff)
- `pyproject.toml` (version bump)
- `.github/workflows/ci.yml` (already staged)

**Not modified** (intentional):

- `src/clarity/layout.html` early skin loader: stays read-only,
  consent-agnostic; flicker-avoidance only, does not create data.
- search-enhance.js same-origin fetch (out of scope).
- chatbot.js `/read` same-origin fetch (out of scope).

---

## Reuse (existing utilities referenced)

- `Chatbot.storage.safeGet/safeSet/safeRemove` already use
  consent-aware pickStore -- extend, don't replace.
- `window.__clarityConsent` stays as a convenience alias equal to
  "any key allowed" so third-party embeds don't break.
- `consent.js:purgeNonEssential` list is already exhaustive per
  audit; no key inventory updates needed inside consent.js.
- Same envelope pattern as the digest JSON schema (`schema`, `v`,
  `t`) -- stylistically consistent across the codebase.
- CSS tokens (`--accent`, `--bg-card`, `--border-subtle`) -- reuse
  so the privacy modal inherits all 6 skins for free.
- Unicode symbol policy (`.prompt/instruction.md`): no emoji.
  Modal uses `\u00D7` for close, `\u25BE` for dropdown, etc.

---

## Verification

**After Wave 0**:

- `make html-dev` builds clean under `-W`.
- Search for a term -- per-match `[line:col]` results, spinner,
  skin palette intact.
- Open chatbot, digest then ingest a conversation -- round-trip OK.
- Decline consent + refresh -- theme/skin/chat prefs persist via
  sessionStorage inside the tab, clear on tab close.

**After Wave 1**:

- Accept all -> every `canStore(key)` returns true, all TTLs Never.
- Decline all -> every `canStore(key)` returns false, sessionStorage
  used, chatbot-api shows a "disabled" notice on send.
- Customize -> block chat history only -> chat works per tab but no
  history across reloads.
- Set chat-history TTL = 1 day via the panel, advance system clock
  25 h, reload -> history cleared.
- Uncheck PyPI update -> Opt+U does NOT fire the fetch (check
  DevTools network tab).
- Uncheck Google Fonts -> system fonts everywhere; skin fonts too.
- Reset privacy -> `clarity-privacy` cleared, banner returns on
  next load.
- All 6 skins render the modal correctly.
- `make html-dev` stays clean under `-W`.

**After Wave 2**:

- README renders correctly on PyPI preview and GitHub.
- CHANGELOG.md starts with `## v1.5.0-000` and lists every commit.
- `docs/source/conf.py` sidebar shows `v1.5.0-000`.
- `pyproject.toml` wheel version is `1.5.0.0`.
- GPG signature on tag verifies: `git log --show-signature -1`.
- CI runs, gate passes (code-relevant path diff since v1.4.0-000),
  PyPI publish fires, GitHub release created from git-cliff notes.

---

## Risks and mitigations

- **Scope creep during granular privacy** -- 15+ file changes. Keep
  the 7 Wave 1 commits small and scoped; no drive-by cleanups.
- **TTL clock drift** -- reader with a wrong system clock could purge
  early or late. Acceptable; document in privacy.rst.
- **Existing readers on v1.4.0-000 upgrading** -- legacy plain-string
  localStorage values need a one-shot read + envelope rewrite
  (handled in privacy.js envelope helper). No forced migration.
- **window.__clarityConsent third-party consumers** -- keep the flag
  exported as a convenience alias so embedded scripts don't break.
- **Release gate self-test** -- v1.5.0-000 is the first live-fire of
  the conditional publish gate against a real code tag. Expected:
  publish fires because src/clarity/ changed. If the gate wrongly
  skips, use `[force-publish]` on the tag message as fallback.
- **CHANGELOG commit order** -- per prior feedback, CHANGELOG lands
  LAST together with the version bump, not mid-batch. Wave 2
  enforces this.

---

## Out of scope (deferred to v2 or later)

- IndexedDB chatbot storage (plan exists, stays DRAFT).
- Shared request counter via Turso / Cloudflare Workers (plan exists,
  stays DRAFT).
- `src/` into docs chapter (plan exists, stays DRAFT).
- Deployer-level `privacy_defaults` theme option (granular-privacy
  open question #3, v2).
- Encrypted digest files / at-rest encryption of stored values.
- TTL granularities beyond Never / 1d / 1w / 1m.
- Stacked mobile card layout for the modal below 640px (done naively
  with responsive CSS in v1.5; richer layout deferred).
- Cross-device privacy sync.

---

## Commit order (explicit)

Total: ~15 commits culminating in the v1.5.0-000 tag.

0. `docs(plans): save v1.5.0-000 release plan` (copy this plan into
   `docs/source/plans/clarity-v1-5-0.[ACTIVE ▸].md` + index wire-up;
   happens first, before any code commits, so the plan is in repo
   history regardless of what happens later).
1. `fix(search): remove unused createSpinner; update docs; amend plan`
2. `feat(storage): sessionStorage fallback when consent is declined`
3. `feat(chatbot): digest and ingest conversation history`
4. `ci: publish to PyPI only when wheel-relevant paths change`
5. `docs(plans): mark digest/ingest, publish-gate, enhanced-search
   completed; add drafts`
6. `feat(privacy): foundation module with envelope + canStore/canFetch`
7. `refactor(storage): route JS IIFEs through privacy.canStore`
8. `feat(privacy): gate external fetches on canFetch(host)`
9. `feat(privacy): Customize button + standalone settings modal`
10. `feat(privacy): boot-time TTL sweep`
11. `docs(privacy): granular controls section + TTL table`
12. `feat(text-size): show current percentage between controls`
    (Wave 1.5 polish; floating badge above the -/+ pair with
    overline decoration and pointer-events: none).
13. `docs(readme): digest/ingest, enhanced search, sessionStorage,
    granular privacy, text-size percentage`
14. `chore(release): bump to v1.5.0-000` (pyproject + conf.py +
    CHANGELOG together, CHANGELOG last; invokes the `version-bumping`
    skill to confirm the bump type before editing files). Also
    renames `docs/source/plans/clarity-v1-5-0.[ACTIVE ▸].md` ->
    `[COMPLETED ✓]` and re-wires the plans toctree.

Tag: `v1.5.0-000` signed (`git tag -s`), message cites the four
headline features: granular privacy + TTL, chatbot digest/ingest,
sessionStorage fallback, conditional PyPI publish.
