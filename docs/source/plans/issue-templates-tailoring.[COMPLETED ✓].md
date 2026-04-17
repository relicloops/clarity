---
title: Tailor .github/ISSUE_TEMPLATE/ to the Clarity repo
tags:
  - "#clarity"
  - "#github"
  - "#triage"
status: completed
updated: 2026-04-17
priority: low
phase: implementation
---

# Tailor GitHub Issue Templates

## Context

`.github/ISSUE_TEMPLATE/` currently ships two generic Markdown
templates that were copied verbatim from GitHub's default:

- **bug_report.md** -- asks for OS, "Node.js version", generic
  reproduction steps. Wrong ecosystem; nothing Sphinx/Clarity-aware.
- **feature_request.md** -- free-form prompts with no grounding in
  the project's feature surface.

Neither template asks the questions that actually triage well for a
Sphinx theme. Relevant inputs today are: Clarity version, Python
version, Sphinx version, browser (for UI bugs), active skin, the
reporter's `html_theme_options` snippet, and any DevTools console
output.

This plan redesigns both templates and adds a chooser so reporters
pick the right form before they start typing.

---

## Goals

1. Ask only relevant questions. No Node.js, no generic "Desktop" OS
   with an iOS example.
2. Structured input where possible, so triage can scan fields
   mechanically.
3. Pre-fill labels (`bug`, `type:feature`, `needs-triage`) so tag
   hygiene is automatic.
4. Link out to existing audit docs (`docs/source/audit/bugs.rst`)
   for readers who want to check whether the issue is already known.
5. Route release-process questions away from issues via
   `config.yml` contact links (discussions, docs).

---

## Approach

Two complementary options -- pick one or combine.

### Option A -- YAML form templates (recommended)

Convert each Markdown template to a GitHub issue form (YAML). Forms
render as a structured UI with required fields, dropdowns, and
validation. Example:

```yaml
# .github/ISSUE_TEMPLATE/bug_report.yml
name: Bug report
description: A behaviour or rendering defect in the Clarity theme.
title: "[bug] "
labels: ["bug", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for reporting! Before filing, please check the
        audit log at
        https://github.com/relicloops/clarity/blob/main/docs/source/audit/bugs.rst
        and skim open issues to avoid duplicates.

  - type: input
    id: clarity-version
    attributes:
      label: Clarity version
      description: Run `pip show sphinx-clarity` or read the sidebar badge.
      placeholder: "v1.5.0-000"
    validations:
      required: true

  - type: dropdown
    id: feature-area
    attributes:
      label: Feature area
      options:
        - Theme (dark / light / skin)
        - Chatbot
        - Search
        - Privacy / consent
        - Update checker
        - Text-size controls
        - Retro 404
        - Docs / CI / packaging
        - Other
    validations:
      required: true

  - type: input
    id: python-version
    attributes:
      label: Python version
      placeholder: "3.12.3"
    validations:
      required: true

  - type: input
    id: sphinx-version
    attributes:
      label: Sphinx version
      placeholder: "7.3.7"
    validations:
      required: true

  - type: input
    id: browser
    attributes:
      label: Browser + OS
      description: Only for rendering / UI bugs.
      placeholder: "Firefox 126 on macOS 14.5"

  - type: dropdown
    id: active-skin
    attributes:
      label: Active skin
      options:
        - default (dark/light/system)
        - unicorn
        - programmer
        - matrix
        - rainbow
        - darcula
        - coder

  - type: textarea
    id: theme-options
    attributes:
      label: Your html_theme_options (if relevant)
      render: python
      placeholder: |
        html_theme_options = {
            "default_theme": "system",
            "chatbot_enabled": True,
            ...
        }

  - type: textarea
    id: repro
    attributes:
      label: Steps to reproduce
      value: |
        1.
        2.
        3.
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected vs actual behaviour
    validations:
      required: true

  - type: textarea
    id: console
    attributes:
      label: Browser DevTools console output
      description: Paste any errors / warnings relevant to the bug.
      render: shell

  - type: textarea
    id: screenshots
    attributes:
      label: Screenshots / screen recording
      description: Drag images or video files into this field.
```

Same shape for `feature_request.yml` with fields: feature area,
problem statement, proposed solution, alternatives considered,
target milestone (v1.x vs v2), willingness to PR.

Pros:
- Structured triage; labels and titles pre-filled.
- Required fields prevent the "bug report with no version" class
  of drive-by issues.
- Dropdowns and pickers reduce typos on ecosystem values.

Cons:
- Form YAML is stricter; requires a short review cycle to get fields
  right.
- The raw issue body on GitHub mixes structured fields with
  Markdown, so some maintainers prefer the MD experience.

### Option B -- keep Markdown, rewrite content

If we prefer to stay in Markdown (simpler diff, easier to hand-edit),
keep `.md` files but rewrite each section to match Clarity:

- Drop the Node.js line.
- Replace "iOS example" with "macOS 14 / Safari 17.3" placeholder.
- Add Clarity version, Python version, Sphinx version, skin,
  `html_theme_options` snippet, and console output sections.
- Add a brief preamble linking to the audit page and the FAQ.

Pros: tiny diff, no new format to learn.
Cons: no validation, no labels pre-applied, no dropdowns.

### Recommendation

**Option A.** The extra structure pays for itself after one or two
triage rounds. Ship both templates as YAML forms plus a
`config.yml` chooser; keep the old `.md` files removed to avoid
template confusion.

---

## Chooser + contact links

Ship `.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: Discussions
    url: https://github.com/relicloops/clarity/discussions
    about: General questions, theme customization help, deployment.
  - name: Documentation
    url: https://github.com/relicloops/clarity/tree/main/docs/source
    about: Browse the full docs before filing.
  - name: Existing audits
    url: https://github.com/relicloops/clarity/tree/main/docs/source/audit
    about: Check if the issue is already tracked under bugs / security / refactoring.
```

`blank_issues_enabled: false` forces the picker so no one bypasses
the triage fields.

---

## Labels pre-applied

Each template declares `labels:` so the issue lands with at least:

- `bug_report.yml`:      `bug`, `needs-triage`
- `feature_request.yml`: `type:feature`, `needs-triage`

If the labels don't exist yet, seed them via a one-off repo admin
action or a `.github/labels.yml` + a label-sync workflow (not
required for v1.5.0-000; tracked as follow-up).

---

## Files to create / modify

| File | Change |
|------|--------|
| **NEW** `.github/ISSUE_TEMPLATE/bug_report.yml` | Structured form per Option A. |
| **NEW** `.github/ISSUE_TEMPLATE/feature_request.yml` | Structured form for feature asks. |
| **NEW** `.github/ISSUE_TEMPLATE/config.yml` | Chooser + contact links + `blank_issues_enabled: false`. |
| **DELETE** `.github/ISSUE_TEMPLATE/bug_report.md` | Superseded by YAML form. |
| **DELETE** `.github/ISSUE_TEMPLATE/feature_request.md` | Superseded. |
| `docs/source/maintainer-workflow.rst` | Brief note under a new "Issue triage" subsection describing the templates so maintainers know what fields to expect. |
| `README.md` | (optional) one-line "Report a bug" link pointing at the New Issue URL. |

---

## Verification

1. Land the commits and open the repo's **Issues -> New** page.
2. Confirm the chooser shows exactly **Bug report** + **Feature
   request** + contact links (Discussions / Documentation / Audits).
3. Pick **Bug report** -- every required field blocks submission
   when empty, dropdowns list the expected options, title template
   is `[bug] `.
4. Submit a dummy issue -- labels `bug` and `needs-triage` apply
   automatically.
5. Same for Feature request.
6. Close the dummy issues.

---

## Rollout

Can land as a single `chore(github): tailor issue templates` commit
or split into:

1. `chore(github): bug report YAML form`
2. `chore(github): feature request YAML form`
3. `chore(github): chooser config with contact links`
4. `docs(maintainer-workflow): issue triage notes`

The commits touch only `.github/` + docs and don't affect the
wheel, so the conditional-publish gate will correctly skip a PyPI
release for any tag that bundles just this work.

---

## Open questions

1. **Preserve `.md` fallbacks?** GitHub picks the YAML form when
   both exist with matching names. Cleaner to delete the `.md` files
   outright; this plan assumes deletion.
2. **Ship a triage workflow?** `actions/issues-label-when-opened` +
   a stale-issue workflow would round out the triage story. Deferred
   to a follow-up -- templates first.
3. **Security-report template?** Clarity has a security audit page
   but no dedicated security template. Consider a separate
   `security_report.yml` if we expect CVE-adjacent reports; for now
   the bug template covers it. Deferred.

---

## Not in scope

- Label seeding workflow (`.github/labels.yml` + repo-label-sync).
- Stale-issue automation.
- CODEOWNERS routing.
- PR templates (separate concern; covered by `.github/pull_request_template.md`
  if we adopt one later).
