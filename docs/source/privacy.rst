Privacy and Data Storage
========================

Clarity does not use cookies. All user preferences and chatbot data are stored
in your browser's ``localStorage``, scoped to the documentation site origin.
No data is sent to the documentation host server beyond normal page requests.

This page documents every piece of data the theme stores or transmits.

Consent Banner
--------------

In compliance with the GDPR and the ePrivacy Directive, Clarity shows a
consent banner on first visit. Until you make a choice:

- **No data** is written to ``localStorage`` (except the consent choice itself)
- **No external requests** are made to Google Fonts
- The theme toggle and text size controls still work but preferences are not
  persisted across pages

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Choice
     - Effect
   * - **Accept**
     - Enables ``localStorage`` for all features (theme, text size, chatbot).
       Loads Google Fonts if the default font stack is active.
   * - **Decline**
     - Clears any previously stored non-essential data. Features continue to
       work in the current page but preferences reset on navigation.

Your consent choice is stored as ``clarity-consent`` in ``localStorage``.
This key is considered strictly necessary for the consent mechanism and is
exempt from consent under the ePrivacy Directive.

You can change your choice at any time by clicking **Privacy settings** in the
page footer.

Local Storage
-------------

The following keys are written to ``localStorage`` only after consent is
granted. All data stays in your browser and is never sent to the
documentation server.

.. list-table::
   :header-rows: 1
   :widths: 30 15 55

   * - Key
     - Feature
     - Content
   * - ``clarity-consent``
     - Consent banner
     - Your privacy choice: ``accepted`` or ``declined``. Strictly necessary,
       stored before consent.
   * - ``clarity-theme``
     - Theme toggle
     - Your color mode preference: ``dark``, ``light``, or ``system``.
   * - ``clarity-text-size``
     - Text size controls
     - Content font size as a percentage (75--150).
   * - ``clarity-chatbot-key``
     - AI assistant
     - OpenRouter model API key (obfuscated, not plain text).
   * - ``clarity-chatbot-mgmt-key``
     - AI assistant
     - OpenRouter management API key (obfuscated, not plain text). Optional.
   * - ``clarity-chatbot-history``
     - AI assistant
     - Conversation history as JSON (last 50 messages). May include
       reasoning traces from the model.
   * - ``clarity-chatbot-state``
     - AI assistant
     - Panel state: ``open``, ``minimized``, or ``closed``.
   * - ``clarity-chatbot-requests``
     - AI assistant
     - Local request counter for the current UTC day.
   * - ``clarity-chatbot-geometry``
     - AI assistant
     - Saved chatbot panel width, height, and screen position.
   * - ``clarity-chatbot-settings-override``
     - AI assistant
     - JSON blob of per-field chatbot parameter overrides saved from the
       ⚙ settings panel. Only fields the reader actually edited appear
       here; the rest fall back to ``conf.py`` defaults.
   * - ``clarity-skin``
     - Skins
     - The reader's chosen skin name (e.g. ``"matrix"``). Absent when the
       default dark / light / system toggle is active.
   * - ``clarity-update-dismissed``
     - Update checker
     - Set to ``"1"`` when the reader dismisses the update banner. Persists
       permanently until cleared via the chatbot ⌧ Purge or a consent
       revoke. Prevents the banner from reappearing on every page.

API key obfuscation
~~~~~~~~~~~~~~~~~~~

API keys are XOR-obfuscated with an origin-derived pad before being written to
``localStorage``. The stored values are base64-encoded and not readable as
plain text in the browser's storage inspector.

.. admonition:: Important

   This obfuscation is not encryption. It prevents casual inspection but does
   not protect against a determined attacker with same-origin JavaScript
   execution (e.g. XSS). Treat your documentation site origin with the same
   care as any site that handles credentials.

Clearing stored data
~~~~~~~~~~~~~~~~~~~~

You can clear all chatbot data (keys, history, state, geometry, counter) by
clicking the **\u2327** (purge) button in the chatbot panel header. This
requires confirmation before proceeding.

To clear all Clarity data including theme and text size preferences, use your
browser's developer tools:

.. code-block:: javascript

   // Clear all Clarity keys
   Object.keys(localStorage)
     .filter(function(k) { return k.indexOf('clarity-') === 0; })
     .forEach(function(k) { localStorage.removeItem(k); });

``window.name`` Fallback
~~~~~~~~~~~~~~~~~~~~~~~~

When the documentation is served via the ``file://`` protocol (local HTML
files), ``localStorage`` may be unavailable. In this case, the theme toggle
stores preferences in ``window.name`` using a ``cl:`` JSON prefix. This data
does not persist across browser sessions.

External Requests
-----------------

The theme may make requests to third-party services depending on configuration.

Google Fonts
~~~~~~~~~~~~

When ``font_stack`` is set to ``"default"`` (the default), the theme loads
three font families from Google's servers:

- ``fonts.googleapis.com`` -- font CSS
- ``fonts.gstatic.com`` -- font files

These requests transmit your IP address and browser metadata to Google.
Consult the `Google Fonts privacy FAQ
<https://developers.google.com/fonts/faq/privacy>`_ for details.

To avoid this, set ``font_stack`` to ``"system"`` in your ``conf.py``:

.. code-block:: python

   html_theme_options = {
       "font_stack": "system",
   }

This uses your operating system's native fonts and makes no external requests.

PyPI Update Check
~~~~~~~~~~~~~~~~~

When ``update_check`` is set to ``True`` in ``html_theme_options`` **and** the
reader has accepted the privacy consent banner, the theme makes a single
``GET`` request to ``https://pypi.org/pypi/sphinx-clarity/json`` once per tab
session. This request transmits the reader's IP address and browser metadata
to PyPI's CDN (Fastly). No cookies, no API keys, and no page content are
sent.

The response (a JSON listing of all published versions) is cached in
``sessionStorage`` so subsequent page navigations within the same tab do not
trigger additional requests. ``sessionStorage`` data is cleared automatically
when the tab is closed.

If ``update_check`` is ``False`` (the default) or the reader declined consent,
no request to PyPI is made.

OpenRouter API
~~~~~~~~~~~~~~

When the AI documentation assistant is used, the following requests are made to
``openrouter.ai``:

.. list-table::
   :header-rows: 1
   :widths: 35 20 45

   * - Endpoint
     - Key used
     - Data transmitted
   * - ``/api/v1/chat/completions``
     - Model key
     - Your question, conversation history, and up to 8,000 characters of the
       current page's text content. Also sends the site origin in the
       ``HTTP-Referer`` header.
   * - ``/api/v1/key``
     - Model key
     - No request body. Returns credit balance and account tier.
   * - ``/api/v1/activity``
     - Management key
     - No request body. Returns request counts for the last 30 completed
       UTC days.

.. admonition:: Important

   Page text sent to OpenRouter is processed by a third-party language model.
   Do not use the chatbot on pages containing sensitive, confidential, or
   proprietary information unless your organization's policy permits it.

No requests are made to OpenRouter until you enter an API key and submit a
question. If no API keys are stored, no external requests are made by the
chatbot feature.

No Cookies
----------

Clarity does not currently set any cookies. The theme has no server-side
component and does not use session identifiers, tracking pixels, analytics
scripts, or advertising integrations.

Future Cookie Usage
~~~~~~~~~~~~~~~~~~~

While no cookies are set today, the following scenarios may introduce cookie
usage in future versions of the theme or in sites that deploy it:

.. list-table::
   :header-rows: 1
   :widths: 30 15 55

   * - Scenario
     - Type
     - Purpose
   * - Server-side search
     - Functional
     - If full-text search is moved to a server backend, a session cookie may
       be used to throttle requests or maintain search context.
   * - Authentication-gated docs
     - Strictly necessary
     - Deployers who add login or access control may set session or
       authentication cookies. These are outside the theme's scope but would
       appear on the same origin.
   * - Analytics integration
     - Non-essential
     - If a deployer adds analytics (e.g. Plausible, Matomo, Google
       Analytics), those tools may set their own cookies. The consent banner
       should be extended to cover them.
   * - CDN or WAF
     - Strictly necessary
     - Hosting providers (Cloudflare, AWS CloudFront) may set cookies for bot
       detection or load balancing (e.g. ``__cf_bm``). These are set by the
       infrastructure, not by the theme.
   * - A/B testing or feedback
     - Non-essential
     - If user feedback widgets or layout experiments are added, cookies may
       be used to track variant assignment or submission state.

.. admonition:: Note

   Any future introduction of cookies will require updating the consent
   banner to include cookie-specific categories and obtaining prior consent
   for non-essential cookies as required by the ePrivacy Directive.

No Telemetry
------------

The theme does not collect usage metrics, error reports, or any form of
telemetry. All functionality runs entirely in the browser.

Summary
-------

.. list-table::
   :header-rows: 1
   :widths: 25 20 55

   * - Category
     - Scope
     - Details
   * - Cookies
     - None
     - No cookies are set by the theme.
   * - Local storage
     - Origin-scoped
     - 12 keys for preferences, chatbot state, saved geometry, settings
       overrides, obfuscated API keys, skin choice, and update-check
       dismissed flag. Purgeable via UI button or browser tools. One
       additional ``sessionStorage`` key (``clarity-update-check``)
       caches the PyPI version check per tab session.
   * - Google Fonts
     - Optional
     - Loaded by default. Set ``font_stack: "system"`` to disable.
   * - OpenRouter API
     - User-initiated
     - Only active after API key entry. Sends page text and questions to a
       third-party LLM.
   * - Telemetry
     - None
     - No analytics, tracking, or error reporting.
