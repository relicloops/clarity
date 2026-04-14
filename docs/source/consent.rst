GDPR / ePrivacy Consent
=======================

Clarity includes a built-in consent banner that complies with the
**General Data Protection Regulation (GDPR)** and the **ePrivacy Directive**
("cookie law"). No external consent plugins or services are required.

How It Works
------------

On first visit, before any non-essential data is stored or external requests
are made, a consent banner appears at the bottom of the page:

- **Accept** -- enables ``localStorage`` for all features (theme preference,
  text size, chatbot keys and history) and loads Google Fonts if the default
  font stack is active.
- **Decline** -- clears any previously stored non-essential data. All features
  continue to work on the current page but preferences are not persisted across
  navigation.

The consent choice itself is stored as ``clarity-consent`` in
``localStorage``. This is considered strictly necessary for the consent
mechanism and is exempt from consent under the ePrivacy Directive.

What Is Blocked Before Consent
------------------------------

.. list-table::
   :header-rows: 1
   :widths: 35 65

   * - Feature
     - Without consent
   * - Theme toggle
     - Works, but defaults to ``system`` on every page load.
       Choice is not persisted.
   * - Text size controls
     - Work, but reset to 100% on every page load.
   * - AI assistant
     - API keys and history cannot be saved. The chatbot does not persist
       any data.
   * - Google Fonts
     - Not loaded. The theme falls back to the ``system`` font stack
       (native OS fonts).

All features become fully functional immediately after accepting.

What Is Blocked After Declining
-------------------------------

Same as above. Additionally, any data that was stored from a previous
acceptance is purged. The following ``localStorage`` keys are removed:

- ``clarity-theme``
- ``clarity-text-size``
- ``clarity-chatbot-key``
- ``clarity-chatbot-mgmt-key``
- ``clarity-chatbot-history``
- ``clarity-chatbot-state``
- ``clarity-chatbot-requests``

The ``clarity-consent`` key (set to ``declined``) is retained to prevent
the banner from reappearing on every page.

Revoking Consent
----------------

Users can change their consent choice at any time by clicking
**Privacy settings** in the page footer. This reopens the consent banner
and allows them to accept or decline again.

Implementation
--------------

The consent system consists of three files:

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - File
     - Role
   * - ``consent.html``
     - Jinja2 template for the banner markup.
   * - ``static/js/consent.js``
     - Consent gate. Runs before all other scripts. Sets
       ``window.__clarityConsent`` (boolean) that other scripts check before
       writing to ``localStorage``. Loads Google Fonts dynamically after
       acceptance.
   * - ``static/css/consent.css``
     - Banner styling with dark/light theme support and responsive layout.

Other scripts check the global gate:

.. code-block:: javascript

   // In theme-toggle.js, clarity.js, chatbot.js:
   if (!window.__clarityConsent) return;  // skip localStorage write

Google Fonts are no longer loaded via static ``<link>`` tags in the HTML
``<head>``. Instead, ``consent.js`` injects them dynamically after the user
accepts, or immediately on page load if consent was previously granted.

Script Load Order
~~~~~~~~~~~~~~~~~

.. code-block:: text

   consent.js        -- sets window.__clarityConsent
   clarity.js        -- checks consent before persisting text size
   theme-toggle.js   -- checks consent before persisting theme choice
   chatbot.js        -- checks consent before all localStorage operations

No Cookies
----------

The consent banner itself does not set any cookies. Clarity uses
``localStorage`` exclusively. This distinction matters for compliance: the
ePrivacy Directive covers "information stored on the user's device", which
includes both cookies and ``localStorage``.

For Deployers
-------------

The consent banner is active by default with no configuration needed. If your
deployment operates in a context where GDPR/ePrivacy does not apply and you
want to skip the banner, you can auto-accept consent in your ``conf.py`` by
adding a custom script:

.. code-block:: python

   # conf.py -- skip consent banner (use only if GDPR does not apply)
   html_js_files = ["auto-consent.js"]

.. code-block:: javascript

   // _static/auto-consent.js
   try { localStorage.setItem('clarity-consent', 'accepted'); } catch(e) {}
   window.__clarityConsent = true;
   window.__clarityConsentDecided = true;

This script must load before the theme scripts. Place it in your project's
``_static/`` directory.
