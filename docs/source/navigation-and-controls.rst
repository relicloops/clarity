Navigation and Controls
=======================

Clarity adds a small set of reading and navigation helpers around the standard
Sphinx page structure.

Header Search
-------------

Every page includes a search input in the header. Press ``/`` to focus it when
``navigation_with_keys`` is enabled.

Enhanced results
~~~~~~~~~~~~~~~~

On the search results page, Clarity replaces Sphinx's default one-card-per-page
layout with a per-match breakdown. Each matching page is grouped and every
occurrence of the search term is listed with its ``[line:col]`` position and a
context snippet. The ``->`` link navigates to the nearest heading anchor on the
target page with ``?highlight=`` appended, so Sphinx's built-in highlighter
fires on arrival.

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Control
     - Behaviour
   * - ``/regex/`` toggle
     - Checkbox beside the search input. When enabled, the query string is
       interpreted as a JavaScript regular expression (case-insensitive).
       Invalid patterns silently fall back to plain-text matching.
   * - Auto-scan threshold
     - When the search matches **20 or fewer pages**, positions are fetched and
       rendered immediately. Above the threshold, each file gets a
       ``Show positions`` button so readers can opt in per file (avoids fetching
       a hundred pages for a common word).
   * - Per-file cap
     - Up to 10 match rows render per file. A ``+ N more (show all)`` button
       reveals the rest on click.
   * - Searching overlay
     - While pages are being scanned, a centred rainbow-glowing ``⁇``
       (U+2047) inside a circle spins above a ``Searching N pages for "term"``
       label. The overlay stays visible for at least three seconds so the reader
       sees that work happened even when the scan finishes instantly.

Match rows render in the active skin's palette -- no separate styling per
skin. Results remain readable and scrollable on narrow viewports.

Breadcrumbs
-----------

When a page has parents in the active toctree, Clarity renders breadcrumbs
above the article body. The final breadcrumb is the current page and is marked
as the active location.

Text Size Controls
------------------

Two buttons above the article let readers adjust text size without changing the
entire browser zoom level.

- The minimum content size is ``75`` percent.
- The maximum content size is ``150`` percent.
- Each click changes the size by ``10`` percent.

The chosen size is stored after consent and restored on later page loads.

Back to Top
-----------

Once the reader scrolls more than ``400`` pixels down the page, a **Top**
button appears near the lower edge of the viewport. Clicking it scrolls back to
the top smoothly.

Code Language Badges
--------------------

Highlighted code blocks receive a small language badge when Sphinx emits a
language-specific highlight class. The badge is derived from the highlight
class, so it follows the language Sphinx already detected for the block.

Keyboard Navigation
-------------------

When ``navigation_with_keys`` is enabled:

- ``ArrowLeft`` opens the previous-page link when one exists.
- ``ArrowRight`` opens the next-page link when one exists.
- ``/`` focuses the header search input.
- ``Opt+U`` (macOS) / ``Alt+U`` (Win/Linux) forces a PyPI version check
  when ``update_check`` is enabled. A rainbow-glowing ``⊛`` spinner
  appears in the header while the check runs.

Keyboard shortcuts are ignored while the reader is typing in an input,
textarea, select field, or other editable region.
