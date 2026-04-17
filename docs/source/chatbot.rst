AI Documentation Assistant
==========================

Clarity includes a built-in chatbot widget that answers questions about the
current page content using the `OpenRouter <https://openrouter.ai/>`_ API.

The assistant reads the visible page text, uses it as context, and refuses
off-topic questions -- summarizing the page instead and asking you to be
more specific.

Setup
-----

The chatbot uses the configured OpenRouter model. By default that is
``openai/gpt-oss-120b:free``. You can use the widget with only a model key.
The management key is optional and is only used for richer usage reporting.

.. list-table::
   :header-rows: 1
   :widths: 18 12 30 40

   * - Key Type
     - Required
     - Endpoint
     - Purpose
   * - **Model Key**
     - Yes
     - ``/api/v1/chat/completions`` and ``/api/v1/key``
     - Sends chat requests and fetches remaining credits plus account tier
       information.
   * - **Management Key**
     - No
     - ``/api/v1/activity``
     - Fetches real request counts and token usage for completed UTC days.

**Getting your keys:**

1. Create a free account at `openrouter.ai <https://openrouter.ai/>`_.
2. Go to **Keys** in your dashboard.
3. Create a **default key**. This is your required model key.
4. Optionally create a **management key** by toggling the **Management**
   option.
5. Click the **∂** button in the Clarity header bar.
6. Paste your model key, optionally add a management key, and click
   **✓ Save**.

.. admonition:: Important

   Management keys are shown only once at creation. Copy them immediately.
   They cannot make model requests, but they can read usage data and manage
   keys. Only store one if you actually want activity reporting in the widget.

Stored keys are kept in your browser's ``localStorage`` and are only sent to
their respective OpenRouter endpoints. Clarity obfuscates the stored values to
avoid plain-text display in browser storage tools, but this is not a security
boundary. See :doc:`privacy` for the full threat model.

How It Works
------------

When you open the chatbot and ask a question:

1. The widget extracts the text content of the current page up to the
   configured ``chatbot_page_text_limit`` value. The default is 8,000
   characters.
2. A system prompt instructs the model to answer only about that content.
3. Your question and recent conversation history are sent to the OpenRouter
   API. History is trimmed to the configured ``chatbot_max_history`` value.
4. The response streams into the panel incrementally and is rendered as
   formatted markdown.

If your question is unrelated to the page, the assistant summarizes what the
page covers and asks you to refine your question.

Streaming and Reasoning
-----------------------

Responses stream into the panel as tokens arrive from OpenRouter.

- While the model is still preparing a response, the panel shows a temporary
  ``thinking`` or ``summarizing`` status line.
- If the model emits reasoning text, Clarity keeps that material in a
  collapsible ``reasoning`` block above the final response.
- If no reasoning text is emitted, the temporary status collapses back to the
  normal response flow.

Reasoning output depends on the selected model and the optional
``chatbot_reasoning_effort`` setting. Some models never emit reasoning tokens.

Slash Commands
--------------

The chat input supports slash commands for navigation and page reading.
Type a command and an autocomplete dropdown will show matching links from the
current page and sidebar.

.. list-table::
   :header-rows: 1
   :widths: 25 75

   * - Command
     - Description
   * - ``/goto <url>``
     - Navigate to a documentation page. Autocomplete shows all links from the
       current page content and sidebar navigation. Use arrow keys to select,
       **Enter** to navigate, **Tab** to fill the URL into the input.
   * - ``/read <url>``
     - Fetch a documentation page, extract its text content, and ask the model
       to summarize it. The summary is streamed into the chat with full markdown
       rendering. Useful for getting a quick overview of another page without
       leaving the current one.

**Autocomplete controls:**

- **Arrow Down / Up** -- move through the suggestion list.
- **Enter** -- execute the command with the selected link.
- **Tab** -- fill the selected URL into the input without executing.
- **Escape** -- dismiss the autocomplete dropdown.

.. admonition:: Note

   ``/read`` works with same-origin pages on your own documentation site.
   Cross-origin URLs will fail due to browser CORS restrictions.

Controls
--------

The chatbot header provides four control buttons:

.. list-table::
   :header-rows: 1
   :widths: 16 16 68

   * - Button
     - Symbol
     - Action
   * - **Settings**
     - ⚙
     - Opens a full-panel overlay with editable fields for every ``chatbot_*``
       option from ``conf.py`` plus a hover hint bar. See
       :ref:`settings-panel` below.
   * - **Purge**
     - ⌧
     - Opens a confirmation dialog before deleting stored model and management
       keys, conversation history, panel state, saved panel geometry, the
       local request counter, and any settings overrides.
   * - **Minimize / Restore**
     - ─ / □
     - Collapses the panel to the header bar only. The glyph flips to ``□``
       and the label to "Restore" while minimized; clicking ``□`` expands the
       panel back to its previous size. Opening the settings panel while
       minimized auto-expands first.
   * - **Close**
     - ×
     - Hides the panel. Your stored data and current panel state are
       preserved.

.. _settings-panel:

Settings Panel
--------------

Click the ⚙ button in the header to open the settings overlay. It covers
the full chat panel and provides an editable field for every ``chatbot_*``
option declared in ``conf.py``.

.. list-table::
   :header-rows: 1
   :widths: 26 74

   * - Field
     - Overrides
   * - **Model**
     - ``chatbot_model`` -- any OpenRouter model slug.
   * - **Max tokens** / **Temperature** / **Top p**
     - ``chatbot_max_tokens``, ``chatbot_temperature``, ``chatbot_top_p``.
   * - **Frequency penalty** / **Presence penalty**
     - ``chatbot_frequency_penalty``, ``chatbot_presence_penalty``.
   * - **Page text limit** / **Max history**
     - ``chatbot_page_text_limit``, ``chatbot_max_history``.
   * - **Reasoning effort**
     - ``chatbot_reasoning_effort`` -- select between ``low``, ``medium``,
       ``high``, or the default.
   * - **System prompt**
     - ``chatbot_system_prompt`` -- leave empty to use the built-in
       page-aware prompt.

Each field placeholder shows the current effective default so you know what
you are overriding. Hovering any field, button, or label updates a warning
bar pinned at the bottom of the overlay with a one-line explanation --
this replaces the browser's native tooltip delay with an immediate description.

**Actions**

- ``✓ Save`` persists any non-empty field to ``localStorage`` under
  ``clarity-chatbot-settings-override`` and applies the values to the
  next request. Empty fields fall back to the ``conf.py`` default.
- ``↺ Reset`` clears the override entirely and reverts every field to the
  ``conf.py`` default, including reasoning effort and system prompt.
- ``× Cancel`` closes the overlay without writing any change.

Overrides are per-browser and per-reader. They do not affect other visitors
and they do not change the baseline shown in the model badge footer.

.. _digest-ingest:

Digest and Ingest
-----------------

The chatbot can **digest** the current conversation to a file and **ingest**
a previously digested file back into the panel. Both actions run entirely in
your browser -- no network requests, no uploads, no server.

Digest
~~~~~~

Digest downloads the in-memory conversation. It works whether you accepted or
declined the consent banner, because the digest reads the live messages array
rather than persistent storage.

Click **⇩ Digest history** at the top of the settings panel, or use
**⇩ Digest first** in the purge confirmation to save a copy before clearing
everything.

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Format
     - File delivered
   * - **JSON**
     - ``<filename>.json`` -- the canonical, machine-readable form. Ingest
       only accepts this format.
   * - **Markdown**
     - ``<filename>.zip`` containing ``digest.md`` (human-readable) and
       ``digest.json`` (round-trip source).
   * - **Plain text**
     - ``<filename>.zip`` containing ``digest.txt`` and ``digest.json``.

The JSON is always bundled with Markdown or Plain text so a later ingest
works without asking you to re-export.

**What the file contains**: schema identifier, export timestamp, origin,
current page URL and title, model name, system-prompt fingerprint (a short
hash, not the prompt itself), ``max_history`` setting, and the message list
with role, content, optional timestamp, and optional reasoning trace.

**What the file does not contain**: API keys, management keys, request
counter, saved panel geometry, or settings overrides. A digest is a
conversation artifact, not a full backup.

Ingest
~~~~~~

Click **⇧ Ingest history** in the settings panel. Pick a ``.json`` file
previously exported with Digest.

.. list-table::
   :header-rows: 1
   :widths: 20 80

   * - Mode
     - Effect
   * - **Replace** (default)
     - Discards the current in-panel conversation and installs the ingested
       messages in its place.
   * - **Append**
     - Concatenates the ingested messages after the current conversation.

The loader validates:

- ``schema`` equals ``clarity-chatbot-digest/v1``. Other values are rejected.
- ``messages`` is an array of ``{ role, content }`` pairs.
- Each ``role`` is one of ``user``, ``assistant``, or ``system``. Rows with
  other roles are dropped and reported in the status line.
- Total ingested message count is capped at ``max_history * 4`` (hard ceiling
  5,000) to keep pathological files from stalling the panel.
- Any ``api_key`` field in the file is ignored and not stored.

After a successful ingest, the conversation re-renders in place and your
next question continues the restored thread.

The footer of the chatbot panel shows two pieces of state:

- A model badge displaying the active ``chatbot_model`` value from
  ``conf.py``.
- A built-in disclaimer reminding readers that AI output may be inaccurate,
  incomplete, or outdated and should be checked against the official docs.

Persistence
-----------

The chatbot stores the following keys in ``localStorage`` after consent is
granted. When the reader declined (or has not yet decided), the same keys
are written to ``sessionStorage`` instead, which is cleared automatically
when the browser tab closes:

.. list-table::
   :header-rows: 1
   :widths: 35 65

   * - Key
     - Content
   * - ``clarity-chatbot-key``
     - Model API key for chat requests, remaining credits, and tier info.
   * - ``clarity-chatbot-mgmt-key``
     - Optional management API key for 30-day activity data.
   * - ``clarity-chatbot-history``
     - Conversation history as JSON, including reasoning traces when present.
   * - ``clarity-chatbot-state``
     - Panel state: ``open``, ``minimized``, or ``closed``.
   * - ``clarity-chatbot-requests``
     - Local request counter for the current UTC day.
   * - ``clarity-chatbot-geometry``
     - Saved panel position and size after drag or resize actions.
   * - ``clarity-chatbot-settings-override``
     - Per-field chatbot parameter overrides saved from the ⚙ settings
       panel (JSON). Only fields the reader actually filled in appear
       here; everything else falls back to the ``conf.py`` default.

The panel state and saved geometry are restored on page reload. Conversation
history persists across page navigations on the same origin.

Use the **⌧** button to clear all stored chatbot data. A confirmation dialog is
shown before deletion starts.

Rate Limits
-----------

The chatbot displays usage and account information in the panel header.

- With only a model key, the header can still show the local request counter,
  remaining credits, and free-tier status from ``/api/v1/key``.
- Adding a management key enables the 30-day activity count from
  ``/api/v1/activity``.
- Clicking the **(i)** button next to the status line opens the usage note.

Rate limits depend on your OpenRouter account tier:

.. list-table::
   :header-rows: 1
   :widths: 30 70

   * - Tier
     - Limits
   * - **Free** (no credits)
     - 50 requests per day on free models, 20 requests per minute
   * - **Free** (≥ 10 credits)
     - 1,000 requests per day on free models, 20 requests per minute
   * - **Pay-as-you-go**
     - No platform-level rate limits

The full status line can look like this:
``4 req today · 28 last 30d · free tier · remaining: $0.1234``

- **Today's requests** come from a local counter stored in ``localStorage``.
  The counter bumps the instant you submit a message, so you see the change
  immediately rather than at the end of the stream.
- **Last 30 days** comes from ``GET /api/v1/activity`` via the optional
  management key. The OpenRouter activity API only returns completed UTC
  days and does not include the current day.
- **Remaining credits** and **tier** come from ``GET /api/v1/key`` via the
  model key.

While the panel is open, the rate line auto-refreshes every 60 seconds so
the 30-day total and remaining credit stay current without a page reload.

.. admonition:: Note

   Today's requests appear in the 30-day count starting the next completed UTC
   day. For real-time today usage, check your
   `OpenRouter dashboard <https://openrouter.ai/activity>`_.

When approaching the daily cap at 80 percent, an orange warning appears above
the input. When the limit is reached, the warning turns red.

OpenRouter API Reference
------------------------

The chatbot uses three OpenRouter endpoints:

.. list-table::
   :header-rows: 1
   :widths: 12 35 20 33

   * - Method
     - Endpoint
     - Key Type
     - Purpose
   * - POST
     - ``/api/v1/chat/completions``
     - Model
     - Send chat messages to the LLM
   * - GET
     - ``/api/v1/key``
     - Model
     - Credit balance, tier, daily, weekly, and monthly usage
   * - GET
     - ``/api/v1/activity``
     - Management
     - Real request counts and token usage for the last 30 completed UTC
       days.

**Chat completions** (model key):

.. code-block:: javascript

   fetch('https://openrouter.ai/api/v1/chat/completions', {
     method: 'POST',
     headers: {
       'Authorization': 'Bearer ' + modelKey,
       'Content-Type': 'application/json',
       'HTTP-Referer': window.location.origin,
       'X-OpenRouter-Title': 'Clarity Docs Assistant'
     },
     body: JSON.stringify({
       model: 'openai/gpt-oss-120b:free',
       messages: messages,
       max_tokens: 1024,
       temperature: 0.3
     })
   });

The active model is also shown in the footer badge so readers can see which
model the current site is using.

**Key info** (model key):

.. code-block:: javascript

   fetch('https://openrouter.ai/api/v1/key', {
     headers: { 'Authorization': 'Bearer ' + modelKey }
   });

Returns ``limit``, ``limit_remaining``, ``is_free_tier``, and
``usage_daily`` / ``usage_weekly`` / ``usage_monthly`` dollar amounts.

**Activity** (management key):

.. code-block:: javascript

   fetch('https://openrouter.ai/api/v1/activity', {
     headers: { 'Authorization': 'Bearer ' + mgmtKey }
   });

Returns an array of activity items with ``requests``, ``prompt_tokens``,
``completion_tokens``, and ``usage`` per model per day covering the last 30
completed UTC days. The current day is not included. Clarity sums the
``requests`` field across every row to produce the 30-day count shown in
the panel header; the legacy ``request_count`` field name is accepted as a
fallback in case OpenRouter reverts the rename.

Markdown Rendering
------------------

Assistant responses are rendered from markdown to HTML. Supported elements:

- **Headings** (``#`` through ``######``).
- **Bold** (``**text**``) and **italic** (``*text*``).
- **Inline code** (````code````) and **code blocks** (triple backtick
  ``` ``` ``` or triple tilde ``~~~`` fences, both CRLF-tolerant).
- **Unordered lists** (``- item``) and **ordered lists** (``1. item``).
- **Tables** (pipe-delimited ``| col | col |``).
- **Horizontal rules** (``---``).
- **Line breaks**: literal ``<br>`` tags the model emits are preserved,
  everything else is HTML-escaped.

Inline code spans are extracted before any emphasis passes run, so
identifiers like ``html_theme_options["default_theme"]`` survive through
the ``_`` italic rule intact.
