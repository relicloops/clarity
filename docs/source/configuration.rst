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

Dual Logos
----------

Clarity supports separate logos for dark and light modes. Place your logo
files in your project's ``_static/`` directory and reference them in the
options above.

When ``dark_logo`` is set, it shows in dark mode while ``light_logo`` shows in
light mode. If only one is set, it displays in both modes.
