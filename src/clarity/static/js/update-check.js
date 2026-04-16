/* ==========================================================================
   Clarity -- Update Check
   Fetches the PyPI JSON API for sphinx-clarity and renders a top banner
   when newer versions are available. Consent-gated: no fetch unless the
   reader accepted the privacy banner AND the deployer enabled the
   update_check theme option. Results cached in sessionStorage so the
   fetch fires once per tab session, not on every page navigation.

   Keybinding: Opt+U (macOS) / Alt+U (Win/Linux) forces a fresh check
   regardless of cache or dismissed state.
   ========================================================================== */

(function () {
  'use strict';

  var PYPI_URL = 'https://pypi.org/pypi/sphinx-clarity/json';
  var SESSION_KEY = 'clarity-update-check';
  /* Dismissed flag stored in localStorage (not sessionStorage) so the
     banner stays hidden permanently until the reader clears their
     localStorage or uses the chatbot Purge action. */
  var DISMISSED_KEY = 'clarity-update-dismissed';

  /* --- Gate: deployer opt-in --- */

  var enabled = document.body && document.body.getAttribute('data-update-check') === 'true';

  /* --- Resolve current version from the data attribute --- */

  function getCurrentVersion() {
    var raw = '';
    if (document.body) {
      raw = (document.body.getAttribute('data-clarity-version') || '').replace(/^v/, '');
    }
    if (!raw) return null;
    return raw.replace(/-/g, '.');
  }

  /* --- Version comparison --- */

  function parseVersion(v) {
    return v.replace(/^v/, '').split('.').map(function (s) {
      var n = parseInt(s, 10);
      return isNaN(n) ? 0 : n;
    });
  }

  function isNewer(a, b) {
    var pa = parseVersion(a);
    var pb = parseVersion(b);
    for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
      var ai = pa[i] || 0;
      var bi = pb[i] || 0;
      if (ai > bi) return true;
      if (ai < bi) return false;
    }
    return false;
  }

  /* --- Spinner (header, right after chatbot button) --- */

  var MIN_SPIN_MS = 3000;  /* stay visible at least 3 s so the reader sees it */

  function showSpinner() {
    var el = document.getElementById('clarity-update-spinner');
    if (el) {
      el.hidden = false;
      el._showTime = Date.now();
    }
    return el;
  }

  function hideSpinner(el) {
    if (!el) return;
    var elapsed = Date.now() - (el._showTime || 0);
    var remaining = Math.max(0, MIN_SPIN_MS - elapsed);
    setTimeout(function () { el.hidden = true; }, remaining);
  }

  /* --- Banner rendering --- */

  function removeBanner() {
    var existing = document.querySelector('.clarity-update-banner');
    if (existing) existing.remove();
  }

  function renderBanner(newerVersions, currentVersion) {
    removeBanner();

    var banner = document.createElement('div');
    banner.className = 'clarity-update-banner';
    banner.setAttribute('role', 'status');

    var text = document.createElement('span');
    text.className = 'update-banner-text';

    var intro = document.createTextNode(
      'You are on ' + currentVersion + '. Newer: '
    );
    text.appendChild(intro);

    for (var i = 0; i < newerVersions.length; i++) {
      if (i > 0) text.appendChild(document.createTextNode(', '));
      var link = document.createElement('a');
      link.href = 'https://pypi.org/project/sphinx-clarity/' + newerVersions[i] + '/';
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = newerVersions[i];
      link.className = 'update-banner-link';
      text.appendChild(link);
      if (i >= 4 && newerVersions.length > 5) {
        text.appendChild(document.createTextNode(
          ' + ' + (newerVersions.length - 5) + ' more'
        ));
        break;
      }
    }

    var upgrade = document.createElement('code');
    upgrade.className = 'update-banner-cmd';
    upgrade.textContent = 'pip install --upgrade sphinx-clarity';

    var dismiss = document.createElement('button');
    dismiss.className = 'update-banner-dismiss';
    dismiss.type = 'button';
    dismiss.setAttribute('aria-label', 'Dismiss update notice');
    dismiss.textContent = '\u00D7';
    dismiss.addEventListener('click', function () {
      banner.remove();
      try { localStorage.setItem(DISMISSED_KEY, '1'); } catch (_) {}
    });

    banner.appendChild(text);
    banner.appendChild(upgrade);
    banner.appendChild(dismiss);

    var header = document.querySelector('.clarity-header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    } else {
      document.body.insertBefore(banner, document.body.firstChild);
    }
  }

  /* --- Core fetch logic (reused by auto-check and keybinding) --- */

  function runCheck(force) {
    if (!window.__clarityConsent) return;

    if (!force) {
      try {
        if (localStorage.getItem(DISMISSED_KEY)) return;
      } catch (_) {}
    }

    var currentVersion = getCurrentVersion();
    if (!currentVersion) return;

    /* Check sessionStorage cache (skipped when force=true). */
    if (!force) {
      var cached = null;
      try {
        var raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) cached = JSON.parse(raw);
      } catch (_) {}

      if (cached && cached.current === currentVersion) {
        if (cached.newer && cached.newer.length > 0) {
          renderBanner(cached.newer, currentVersion);
        }
        return;
      }
    }

    /* Fetch from PyPI. */
    var spinner = showSpinner();

    fetch(PYPI_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        hideSpinner(spinner);

        var allVersions = Object.keys(data.releases || {});
        var newer = allVersions.filter(function (v) {
          return isNewer(v, currentVersion);
        });

        newer.sort(function (a, b) {
          return isNewer(a, b) ? -1 : isNewer(b, a) ? 1 : 0;
        });

        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({
            current: currentVersion,
            newer: newer
          }));
        } catch (_) {}

        if (newer.length > 0) {
          renderBanner(newer, currentVersion);
        }
      })
      .catch(function () {
        hideSpinner(spinner);
      });
  }

  /* --- Keybinding: Opt+U (macOS) / Alt+U (Win/Linux) --- */

  document.addEventListener('keydown', function (e) {
    /* On macOS, Opt+U is a dead key that produces e.key='Dead' and
       e.code='KeyU'. On Windows/Linux, Alt+U gives e.key='u'. Check
       both e.key and e.code to handle all platforms. */
    var isU = (e.key === 'u' || e.key === 'U' || e.code === 'KeyU');
    if (e.altKey && isU) {
      e.preventDefault();
      try { localStorage.removeItem(DISMISSED_KEY); } catch (_) {}
      try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
      removeBanner();
      runCheck(true);
    }
  });

  /* --- Auto-check on page load (if enabled) --- */

  if (enabled) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { runCheck(false); });
    } else {
      runCheck(false);
    }
  }
})();
