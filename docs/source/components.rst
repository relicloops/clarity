Components Gallery
==================

This page showcases every Sphinx element styled by Clarity. Use it to verify
rendering in both dark and light modes.

Admonitions
-----------

.. note::

   This is a **note** admonition. Use it for general information that
   complements the surrounding text.

.. tip::

   This is a **tip** admonition. Use it for helpful suggestions that
   improve the reader's workflow.

.. hint::

   This is a **hint** admonition. Styled identically to tip.

.. important::

   This is an **important** admonition. Use it for information the reader
   should not overlook.

.. warning::

   This is a **warning** admonition. Use it for potential pitfalls or
   things that could go wrong.

.. caution::

   This is a **caution** admonition. Styled identically to warning.

.. danger::

   This is a **danger** admonition. Use it for actions that may cause
   data loss or security issues.

.. error::

   This is an **error** admonition. Styled identically to danger.

.. seealso::

   This is a **seealso** admonition. Use it to point readers toward
   related content: :doc:`color-system`, :doc:`typography`.

.. deprecated:: 1.0

   The ``old_option`` parameter is deprecated. Use ``new_option`` instead.

.. versionadded:: 1.0

   The ``font_stack`` option was added.

.. versionchanged:: 1.0

   The default theme mode changed from ``"dark"`` to ``"system"``.

Custom Admonitions
~~~~~~~~~~~~~~~~~~

.. admonition:: Custom Title

   You can create admonitions with any title using the generic
   ``.. admonition::`` directive.

Code Blocks
-----------

Python
~~~~~~

.. code-block:: python

   from pathlib import Path
   from typing import Optional

   class ThemeConfig:
       """Clarity theme configuration."""

       def __init__(self, mode: str = "system") -> None:
           self.mode = mode
           self.accent_dark = "#39ff14"   # phosphor-green
           self.accent_light = "#7b2ff7"  # uv-violet
           self.version = 1

       def resolve(self) -> str:
           if self.mode == "system":
               return detect_system_preference()
           return self.mode

JavaScript
~~~~~~~~~~

.. code-block:: javascript

   function cycleTheme() {
     const themes = ['dark', 'light', 'system'];
     const current = getStoredTheme();
     const idx = themes.indexOf(current);
     const next = themes[(idx + 1) % themes.length];

     setStoredTheme(next);
     applyTheme(next);
     return next;
   }

Bash
~~~~

.. code-block:: bash

   # Install and build docs
   pip install -e .
   sphinx-build -W -b html docs/ docs/_build/html

   # Serve locally
   python -m http.server -d docs/_build/html 8000

reStructuredText
~~~~~~~~~~~~~~~~

.. code-block:: rst

   .. code-block:: python

      html_theme = "clarity"
      html_theme_options = {
          "default_theme": "system",
      }

CSS
~~~

.. code-block:: css

   :root,
   [data-theme="dark"] {
     --accent: var(--phosphor-green);
     --bg-primary: var(--void-light);
     --text-primary: #e0e0f0;
   }

Inline Code
~~~~~~~~~~~

Use ``inline code`` for short references like ``conf.py``, variable names
like ``html_theme``, and values like ``"clarity"``.

Literal Block
~~~~~~~~~~~~~

A plain literal block with no syntax highlighting::

   This is a literal block.
   It preserves whitespace and line breaks.
   No syntax highlighting is applied.

Tables
------

Simple Table
~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 20 15 65

   * - Option
     - Default
     - Description
   * - ``default_theme``
     - ``"system"``
     - Initial color mode
   * - ``font_stack``
     - ``"default"``
     - Font set: ``"default"`` or ``"system"``
   * - ``show_toc_level``
     - ``2``
     - Sidebar navigation depth

Grid Table
~~~~~~~~~~

+------------+------------+-----------+
| Header 1   | Header 2   | Header 3  |
+============+============+===========+
| Row 1, A   | Row 1, B   | Row 1, C  |
+------------+------------+-----------+
| Row 2, A   | Row 2, B   | Row 2, C  |
+------------+------------+-----------+
| Row 3, A   | Row 3, B   | Row 3, C  |
+------------+------------+-----------+

Lists
-----

Unordered List
~~~~~~~~~~~~~~

- Phosphor-green (``#39ff14``) -- dark mode accent
- UV-violet (``#7b2ff7``) -- light mode accent
- Void-black (``#0a0a0f``) -- deepest background
- Void-light (``#12121a``) -- card/surface background

Ordered List
~~~~~~~~~~~~

1. Install the theme with ``pip install sphinx-clarity``
2. Set ``html_theme = "clarity"`` in ``conf.py``
3. Build your docs with ``sphinx-build``
4. Open the output and toggle dark/light

Nested List
~~~~~~~~~~~

- Color system

  - Dark mode

    - Phosphor-green accents
    - Void backgrounds

  - Light mode

    - UV-violet accents
    - Soft backgrounds

- Typography

  - Default stack (Orbitron / Inter / Intel One Mono)
  - System stack (native OS fonts)

Definition List
~~~~~~~~~~~~~~~

``--accent``
   The current theme accent color. Resolves to phosphor-green in dark mode
   and UV-violet in light mode.

``--bg-primary``
   The primary surface background color.

``--font-heading``
   The font family used for headings, admonition titles, and table headers.

Links
-----

- Internal link: :doc:`color-system`
- Internal link: :doc:`getting-started`
- Reference link: :ref:`search`

Blockquotes
-----------

   "Clarity brings neon aesthetics to technical documentation without the
   noise."

   -- Theme description

   Nested blockquote:

      This is a nested blockquote inside the outer one.

Horizontal Rules
----------------

Content above the rule.

----

Content below the rule.

Rubric
------

.. rubric:: This is a Rubric

Rubrics are informal headings that do not appear in the table of contents.

Topic Box
---------

.. topic:: About This Page

   This page serves as a visual test of every Sphinx element styled by
   Clarity. Toggle between dark and light modes to verify rendering.

Field Lists
-----------

:Author: Simone Del Popolo
:Version: 1.0.1
:License: Apache-2.0
:Python: 3.10+
:Sphinx: 7.0+

Footnotes
---------

Clarity uses a dual-accent system [1]_ inspired by phosphor displays [2]_.

.. [1] Phosphor-green for dark mode, UV-violet for light mode.
.. [2] Green phosphor CRT monitors from the 1970s -- 1980s.

Images
------

.. note::

   Add images to your ``_static/`` directory and reference them:

   .. code-block:: rst

      .. image:: _static/screenshot.png
         :alt: Clarity theme screenshot
         :width: 600px
