Configuration
=============

All options are set in ``html_theme_options`` inside your ``conf.py``.

Core Theme Options
------------------

.. list-table::
   :header-rows: 1
   :widths: 25 15 60

   * - Option
     - Default
     - Description
   * - ``default_theme``
     - ``"system"``
     - Initial color mode: ``"dark"``, ``"light"``, or ``"system"``.
   * - ``font_stack``
     - ``"default"``
     - Font set: ``"default"`` (Orbitron / Inter / Intel One Mono) or
       ``"system"``.
   * - ``navigation_with_keys``
     - ``True``
     - Enable keyboard navigation with arrow keys and ``/`` to focus search.
   * - ``show_toc_level``
     - ``2``
     - Sidebar navigation depth from ``1`` to ``3``.
   * - ``light_logo``
     - ``""``
     - Path to the logo used in light mode, relative to ``_static/``.
   * - ``dark_logo``
     - ``""``
     - Path to the logo used in dark mode, relative to ``_static/``.
   * - ``sidebar_hide_name``
     - ``False``
     - Hide the project name and version block in the sidebar header.
   * - ``update_check``
     - ``False``
     - When ``True``, the theme fetches the PyPI JSON API once per session
       to check for newer versions of ``sphinx-clarity``. If newer versions
       exist, a top banner with version links appears. The fetch only runs
       after the reader accepts the privacy consent banner. Results are
       cached in ``sessionStorage`` so the check fires once per tab, not on
       every page navigation. Press ``Opt+U`` (macOS) or ``Alt+U``
       (Win/Linux) to force a fresh check at any time.
       Set to ``False`` (the default) to disable.
   * - ``retro_404``
     - ``True``
     - When ``True`` and the deployer adds
       ``html_additional_pages = {"404": "notfound.html"}`` to ``conf.py``,
       the 404 page heading renders in the Press Start 2P pixelated font
       (loaded via Google Fonts after consent). Set to ``False`` to use the
       normal heading font.
   * - ``skin``
     - ``"default"``
     - Active CSS skin. Available values: ``"default"`` (the built-in
       dark / light / system toggle), ``"unicorn"``, ``"programmer"``,
       ``"matrix"``, ``"rainbow"``, ``"darcula"``, ``"coder"``. When a skin
       other than ``"default"`` is set, the theme toggle is hidden and the
       skin owns the entire visual surface. The reader can also switch skins
       via the footer selector, which overrides this deployer default in
       ``localStorage``.

Chatbot Options
---------------

.. list-table::
   :header-rows: 1
   :widths: 28 16 56

   * - Option
     - Default
     - Description
   * - ``chatbot_enabled``
     - ``True``
     - Show the chatbot widget. When ``False``, the widget markup and its
       dedicated assets are omitted from the page.
   * - ``chatbot_model``
     - ``"openai/gpt-oss-120b:free"``
     - OpenRouter model ID. The value is also shown in the chatbot footer
       badge.
   * - ``chatbot_max_tokens``
     - ``1024``
     - Maximum completion length requested from OpenRouter.
   * - ``chatbot_temperature``
     - ``0.3``
     - Sampling temperature used for chat completions.
   * - ``chatbot_top_p``
     - ``1.0``
     - Top-p sampling value sent with the completion request.
   * - ``chatbot_frequency_penalty``
     - ``0.0``
     - Frequency penalty forwarded to the completion request.
   * - ``chatbot_presence_penalty``
     - ``0.0``
     - Presence penalty forwarded to the completion request.
   * - ``chatbot_page_text_limit``
     - ``8000``
     - Maximum number of characters extracted from the current page before
       building the prompt.
   * - ``chatbot_max_history``
     - ``50``
     - Number of recent messages retained in stored conversation history.
   * - ``chatbot_reasoning_effort``
     - ``""``
     - Optional reasoning setting passed through for models that support
       reasoning tokens.
   * - ``chatbot_system_prompt``
     - ``""``
     - Optional custom system prompt prepended to the built-in page-aware
       grounding prompt.

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
       "chatbot_enabled": True,
       "chatbot_model": "openai/gpt-oss-120b:free",
       "chatbot_page_text_limit": 8000,
       "chatbot_max_history": 50,
   }

Chatbot Example
---------------

.. code-block:: python

   html_theme_options = {
       "chatbot_enabled": True,
       "chatbot_model": "openai/gpt-oss-120b:free",
       "chatbot_max_tokens": 1024,
       "chatbot_temperature": 0.3,
       "chatbot_reasoning_effort": "medium",
       "chatbot_system_prompt": (
           "Answer only from the current documentation page."
       ),
   }

Set ``chatbot_enabled`` to ``False`` to remove the widget entirely.

Runtime overrides
~~~~~~~~~~~~~~~~~

Every ``chatbot_*`` option above can be overridden at runtime without
editing ``conf.py``. Readers click the ⚙ button in the chatbot header to
open a settings overlay with an editable field per option, a hint bar,
and ``Save`` / ``Reset`` / ``Cancel`` actions. Overrides are stored in the
reader's browser only; the values in ``conf.py`` remain the default for
everyone else. See :ref:`settings-panel` for the full field list.

Privacy Settings Entry Point
----------------------------

The footer ``Privacy settings`` link opens a standalone modal where
readers can toggle CAN / CANNOT for every storage key and external
request, and pick an automatic purge TTL (Never / 1 day / 1 week /
1 month) per category. See :ref:`granular-privacy` on the privacy
page for the full schema and categories.

The modal is also reachable from the consent banner's
``Customize...`` button and from a shortcut inside the chatbot
settings panel, so the three entry points share one surface.

Dual Logos
----------

Clarity supports separate logos for dark and light modes. Place your logo
files in your project's ``_static/`` directory and reference them in the
options above.

When ``dark_logo`` is set, it shows in dark mode while ``light_logo`` shows in
light mode. If only one is set, it displays in both modes.
