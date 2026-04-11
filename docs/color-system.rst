Color System
============

Clarity uses a **dual-accent** color system -- the accent color changes based
on the active theme mode.

Philosophy
----------

- **Dark mode** → phosphor-green (``#39ff14``) accents on void backgrounds
- **Light mode** → UV-violet (``#7b2ff7``) accents on soft backgrounds

This is not just a color swap -- it creates two distinct reading atmospheres
that share the same layout and typography.

Palette Reference
-----------------

Primary Colors
~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 30 20 50

   * - Variable
     - Value
     - Usage
   * - ``--phosphor-green``
     - ``#39ff14``
     - Dark mode accent, links, borders
   * - ``--uv-violet``
     - ``#7b2ff7``
     - Light mode accent, links, borders

Dark Mode Backgrounds
~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 30 20 50

   * - Variable
     - Value
     - Usage
   * - ``--void-black``
     - ``#0a0a0f``
     - Page background
   * - ``--void-deep``
     - ``#050508``
     - Secondary surfaces, code blocks
   * - ``--void-light``
     - ``#12121a``
     - Primary surfaces, cards, sidebar

Light Mode Backgrounds
~~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 30 20 50

   * - Variable
     - Value
     - Usage
   * - ``--bg-primary``
     - ``#f0f0f5``
     - Page and primary surface background
   * - ``--bg-secondary``
     - ``#ffffff``
     - Cards, secondary surfaces

Text Colors
~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 30 20 20

   * - Variable
     - Dark
     - Light
   * - ``--text-primary``
     - ``#e0e0f0``
     - ``#1a1a2e``
   * - ``--text-secondary``
     - ``rgba(224,224,240,0.7)``
     - ``rgba(26,26,46,0.7)``
   * - ``--text-tertiary``
     - ``rgba(224,224,240,0.5)``
     - ``rgba(26,26,46,0.5)``

Customizing Colors
------------------

Override any CSS variable in your project's custom stylesheet:

.. code-block:: css

   /* _static/custom.css */
   :root,
   [data-theme="dark"] {
     --phosphor-green: #00ff88;  /* your own accent */
   }

   [data-theme="light"] {
     --uv-violet: #6366f1;  /* your own accent */
   }

Then add it to your ``conf.py``:

.. code-block:: python

   html_css_files = ["custom.css"]
