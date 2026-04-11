Configuration
=============

All options are set in ``html_theme_options`` inside your ``conf.py``.

Theme Options
-------------

.. list-table::
   :header-rows: 1
   :widths: 25 15 60

   * - Option
     - Default
     - Description
   * - ``default_theme``
     - ``"system"``
     - Initial color mode: ``"dark"``, ``"light"``, or ``"system"``
   * - ``font_stack``
     - ``"default"``
     - Font set: ``"default"`` (Orbitron / Inter / Intel One Mono) or ``"system"``
   * - ``navigation_with_keys``
     - ``True``
     - Enable keyboard navigation with arrow keys and ``/`` for search
   * - ``show_toc_level``
     - ``2``
     - Sidebar navigation depth (1 -- 3)
   * - ``light_logo``
     - ``""``
     - Path to logo image for light mode (relative to ``_static/``)
   * - ``dark_logo``
     - ``""``
     - Path to logo image for dark mode (relative to ``_static/``)
   * - ``sidebar_hide_name``
     - ``False``
     - Hide the project name in the sidebar header

Full Example
------------

.. code-block:: python

   html_theme = "clarity"
   html_theme_options = {
       "default_theme": "system",
       "font_stack": "default",
       "navigation_with_keys": True,
       "show_toc_level": 2,
       "light_logo": "logo-light.svg",
       "dark_logo": "logo-dark.svg",
       "sidebar_hide_name": False,
   }

Dual Logos
----------

Clarity supports separate logos for dark and light modes. Place your logo files
in your project's ``_static/`` directory and reference them in the options above.

When ``dark_logo`` is set, it shows in dark mode while ``light_logo`` shows in
light mode. If only one is set, it displays in both modes.
