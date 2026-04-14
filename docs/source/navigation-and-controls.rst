Navigation and Controls
=======================

Clarity adds a small set of reading and navigation helpers around the standard
Sphinx page structure.

Header Search
-------------

Every page includes a search input in the header. Press ``/`` to focus it when
``navigation_with_keys`` is enabled.

On the search results page, Clarity adds a small location badge beside results
that point to an anchor. This helps readers see which section of a page matched
the query.

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

Keyboard shortcuts are ignored while the reader is typing in an input,
textarea, select field, or other editable region.
