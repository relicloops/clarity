Dark and Light Modes
====================

Clarity supports three theme modes: **dark**, **light**, and **system**.

How It Works
------------

The theme toggle cycles through modes on each click:

::

   dark → light → system → dark → ...

- **Dark** -- forces dark mode regardless of OS setting
- **Light** -- forces light mode regardless of OS setting
- **System** -- follows the operating system preference and reacts to
  changes in real time

The user's preference is stored in ``localStorage`` (key: ``clarity-theme``)
and persists across page loads.

.. tip::

   On ``file://`` protocol (local HTML files), the theme falls back to
   ``window.name`` storage since ``localStorage`` may be unavailable.

Toggle Button
-------------

The toggle button appears in the header with three SVG icons:

- ☼ (sun) -- shown when light mode is active
- ☽ (moon) -- shown when dark mode is active
- ◐ (half circle / monitor) -- shown when system mode is active

Technical Details
-----------------

The theme uses two ``data-`` attributes on the ``<html>`` element:

``data-theme``
   The *effective* theme (always ``"dark"`` or ``"light"``). CSS uses this
   for styling.

``data-theme-setting``
   The *user setting* (``"dark"``, ``"light"``, or ``"system"``). The toggle
   button uses this to show the correct icon.

Flash Prevention
~~~~~~~~~~~~~~~~

The theme applies the stored preference synchronously before the DOM renders.
The ``theme-toggle.js`` script runs immediately (not deferred), so there is
no flash of wrong theme on page load.

System Preference Sync
~~~~~~~~~~~~~~~~~~~~~~

When mode is set to ``system``, a ``matchMedia`` listener watches for changes
to ``prefers-color-scheme``. If you switch your OS from dark to light while
viewing docs, the theme updates instantly.

Default Mode
------------

Set the initial mode in ``conf.py``:

.. code-block:: python

   html_theme_options = {
       "default_theme": "dark",    # or "light" or "system"
   }

This only affects the first visit -- once the user clicks the toggle,
their preference takes precedence.
