Typography
==========

Clarity ships two font stacks, selectable via the ``font_stack`` theme option.

Default Stack
-------------

The default stack loads three Google Fonts:

- **Orbitron** -- geometric sans-serif for headings (h1 -- h6, admonition titles,
  table headers, TOC title, sidebar captions)
- **Inter** -- clean sans-serif for body text (paragraphs, lists, admonition
  content, table cells)
- **Intel One Mono** -- modern monospace for code (inline ``code``, code blocks,
  version badges, project version)

.. code-block:: python

   html_theme_options = {
       "font_stack": "default",
   }

System Stack
------------

The system stack uses no custom fonts -- everything comes from the operating
system's native font families. This gives zero font-loading time and a
platform-native feel.

.. code-block:: python

   html_theme_options = {
       "font_stack": "system",
   }

The system stack resolves to:

- **Headings / body**: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
  Helvetica, Arial, sans-serif
- **Code**: ui-monospace, SF Mono, SFMono-Regular, Menlo, Monaco, Consolas,
  monospace

CSS Variables
-------------

You can override individual font families without changing the stack:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Variable
     - Description
   * - ``--font-heading``
     - Headings, admonition titles, table headers
   * - ``--font-body``
     - Body text, paragraphs, lists
   * - ``--font-mono``
     - Inline code, code blocks, version badges

Example override:

.. code-block:: css

   /* _static/custom.css */
   :root {
     --font-heading: 'Audiowide', sans-serif;
     --font-mono: 'JetBrains Mono', monospace;
   }
