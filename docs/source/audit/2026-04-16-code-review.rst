.. _audit-2026-04-16-code-review:

Code Review Backlog -- 2026-04-16
=================================

This snapshot re-checks the current working tree and records code-review
findings that are still true and not already tracked as open backlog items.

Method
------

- Re-read the live theme source under ``src/clarity/``, docs under
  ``docs/source/``, packaging in ``pyproject.toml``, build targets in
  ``docs/Makefile``, and CI workflows under ``.github/workflows/``.
- Cross-checked the current code-review topic page and the
  ``2026-04-14`` engineering snapshot to avoid duplicating already-open rows.
- Kept file-level references only, to avoid stale line-number citations in a
  moving tree.
- Ran ``make html-dev`` from ``docs/`` during this pass.

Code Review
-----------

.. list-table::
   :header-rows: 1
   :widths: 8 12 20 32 18 10

   * - Priority
     - Audience
     - Code target
     - Finding
     - Recommended action
     - Status
   * - Medium
     - maintainer
     - ``src/clarity/theme.conf``, ``src/clarity/layout.html``,
       ``src/clarity/sidebar.html``
     - The theme still ships and declares ``sidebars = sidebar.html``, but
       the actual sidebar UI is rendered inline by ``layout.html``. The
       standalone ``sidebar.html`` has already drifted from live behavior: it
       does not cover ``release`` fallback, ``sidebar_hide_name``, or the
       missing-version warning badge.
     - Remove the stale sidebar template from the shipped surface or make the
       layout consume one shared sidebar partial so a single code path defines
       sidebar behavior.
     - Open
   * - Medium
     - maintainer
     - ``src/clarity/static/js/chatbot.js``,
       ``src/clarity/static/js/chatbot-api.js``, ``src/clarity/theme.conf``,
       ``docs/source/configuration.rst``
     - Regular page chat reads ``chatbot_page_text_limit`` through
       ``Chatbot.api.getPageContent()``, but ``/read`` reintroduces a
       hard-coded ``8000`` character substring inside ``chatbot.js``. The
       feature now has two prompt-size code paths that can drift from each
       other and from the documented setting.
     - Route ``/read`` through the same truncation helper or shared setting
       path and document whether it intentionally shares
       ``chatbot_page_text_limit``.
     - Open
   * - Medium
     - maintainer
     - ``.github/workflows/build-and-docs.yml``, ``src/clarity/layout.html``,
       ``src/clarity/static/js/clarity.js``,
       ``src/clarity/static/js/chatbot.js``
     - CI builds the wheel and renders docs, but the repo still has no
       automated regression coverage for theme-option wiring or client-side
       flows such as consent gating, keyboard navigation, text sizing, slash
       commands, and chatbot history/state handling.
     - Add a small regression suite that exercises option wiring and the
       highest-risk client flows before more UI behavior is added.
     - Open
