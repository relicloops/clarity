Color System
============

Clarity uses a **dual-accent** color system. The active accent changes with
the theme mode.

Philosophy
----------

- **Dark mode** → phosphor-green (``#39ff14``) accents on void backgrounds.
- **Light mode** → UV-violet (``#7b2ff7``) accents on soft backgrounds.

This is not just a color swap. It creates two distinct reading atmospheres
that share the same layout and typography.

Palette Reference
-----------------

Core Accent Tokens
~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 30 20 50

   * - Variable
     - Value
     - Usage
   * - ``--phosphor-green``
     - ``#39ff14``
     - Dark-mode accent, links, borders
   * - ``--phosphor-green-dark``
     - ``#1a8a0a``
     - Dark-mode accent shadow and deeper hover tone
   * - ``--uv-violet``
     - ``#7b2ff7``
     - Light-mode accent, links, borders
   * - ``--uv-violet-dark``
     - ``#5a1db5``
     - Light-mode accent shadow and deeper hover tone

Surface Tokens
~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 28 22 50

   * - Variable
     - Typical value
     - Usage
   * - ``--void-black``
     - ``#0a0a0f``
     - Dark-mode page background
   * - ``--void-deep``
     - ``#050508``
     - Dark secondary surfaces and deep code backgrounds
   * - ``--void-light``
     - ``#12121a``
     - Dark primary surfaces, cards, sidebar
   * - ``--bg-primary``
     - ``#12121a`` / ``#f0f0f5``
     - Primary content surface for the active theme
   * - ``--bg-secondary``
     - ``#050508`` / ``#ffffff``
     - Secondary surfaces
   * - ``--bg-page``
     - ``#0a0a0f`` / ``#f0f0f5``
     - Page background
   * - ``--bg-header``
     - translucent dark / light value
     - Sticky header background
   * - ``--bg-code``
     - translucent dark / light value
     - Code blocks and code-adjacent surfaces
   * - ``--bg-input``
     - translucent dark / light value
     - Inputs, search, and field surfaces
   * - ``--bg-card``
     - translucent dark / ``#ffffff``
     - Cards, panels, and elevated surfaces

Text Tokens
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

Mapped Theme Tokens
~~~~~~~~~~~~~~~~~~~

These variables are the stable layer most components read from directly:

.. list-table::
   :header-rows: 1
   :widths: 28 22 50

   * - Variable
     - Source
     - Usage
   * - ``--accent``
     - phosphor-green / UV-violet
     - Primary interactive accent
   * - ``--accent-dark``
     - phosphor-green-dark / uv-violet-dark
     - Deeper accent for shadows or stronger emphasis
   * - ``--accent-glow``
     - phosphor-glow / violet-glow
     - Glow, focus, and selection effects

Interaction Tokens
~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 28 22 50

   * - Variable
     - Typical value
     - Usage
   * - ``--border-subtle``
     - translucent dark / light value
     - Thin separators and low-contrast borders
   * - ``--border-accent``
     - accent color
     - Emphasized border state
   * - ``--link-color``
     - accent color
     - Default link color
   * - ``--link-hover``
     - accent color
     - Link hover color
   * - ``--selection-bg``
     - translucent accent value
     - Text selection highlight
   * - ``--scrollbar-thumb``
     - translucent neutral value
     - Custom scrollbar thumb
   * - ``--scrollbar-track``
     - ``transparent``
     - Custom scrollbar track

Accent Extras
~~~~~~~~~~~~~

These colors are available for component-specific callouts and future accents:

.. list-table::
   :header-rows: 1
   :widths: 30 20 50

   * - Variable
     - Value
     - Usage
   * - ``--neon-cyan``
     - ``#00ffff``
     - Optional information accent
   * - ``--neon-pink``
     - ``#ff00ff``
     - Optional warning or highlight accent
   * - ``--neon-orange``
     - ``#ff6600``
     - Optional warning accent
   * - ``--neon-red``
     - ``#ff3366``
     - Optional danger accent
   * - ``--phosphor-glow``
     - ``rgba(57, 255, 20, 0.4)``
     - Green glow source token
   * - ``--violet-glow``
     - ``rgba(123, 47, 247, 0.3)``
     - Violet glow source token

Customizing Colors
------------------

Override any CSS variable in your project's custom stylesheet:

.. code-block:: css

   /* _static/custom.css */
   :root,
   [data-theme="dark"] {
     --phosphor-green: #00ff88;
     --border-subtle: rgba(255, 255, 255, 0.12);
   }

   [data-theme="light"] {
     --uv-violet: #6366f1;
     --bg-card: #f8f8ff;
   }

Then add it to your ``conf.py``:

.. code-block:: python

   html_css_files = ["custom.css"]
