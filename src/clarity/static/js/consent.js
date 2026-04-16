/* ==========================================================================
   Clarity — GDPR / ePrivacy Consent Gate
   Runs synchronously before all other scripts.
   Consent choice stored in localStorage as 'clarity-consent' (strictly
   necessary for the consent mechanism itself, exempt from consent).
   ========================================================================== */

(function () {
  'use strict';

  var CONSENT_KEY = 'clarity-consent';
  /* Values: 'accepted', 'declined', or absent (not yet decided) */

  function getConsent() {
    try { return localStorage.getItem(CONSENT_KEY); }
    catch (_) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(CONSENT_KEY, value); }
    catch (_) {}
  }

  /* Expose globally so other scripts can check */
  var consent = getConsent();
  window.__clarityConsent = consent === 'accepted';
  window.__clarityConsentDecided = consent !== null;

  /* --- Load Google Fonts dynamically (only after consent) --- */

  function loadGoogleFonts() {
    var fontStack = document.body && document.body.getAttribute('data-font-stack');
    if (fontStack === 'system') return;

    var preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    var preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = '';
    document.head.appendChild(preconnect2);

    var fontUrl = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Intel+One+Mono:wght@400;500;600;700';

    /* If the 404 retro class is on the page, also load Press Start 2P. */
    if (document.querySelector('.clarity-404-retro')) {
      fontUrl += '&family=Press+Start+2P';
    }

    fontUrl += '&display=swap';

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = fontUrl;
    link.onload = function () {
      /* Set the retro font CSS variable so the 404 heading picks it up. */
      if (document.querySelector('.clarity-404-retro')) {
        document.documentElement.style.setProperty('--font-retro', "'Press Start 2P', cursive");
      }
    };
    document.head.appendChild(link);
  }

  /* --- Purge all non-essential localStorage on decline --- */

  function purgeNonEssential() {
    var keys = [
      'clarity-theme', 'clarity-text-size',
      'clarity-chatbot-key', 'clarity-chatbot-mgmt-key',
      'clarity-chatbot-history', 'clarity-chatbot-state',
      'clarity-chatbot-requests',
      'clarity-chatbot-geometry',
      'clarity-chatbot-settings-override',
      'clarity-update-dismissed',
      'clarity-skin'
    ];
    for (var i = 0; i < keys.length; i++) {
      try { localStorage.removeItem(keys[i]); } catch (_) {}
    }
  }

  /* --- Banner logic --- */

  function initBanner() {
    var banner = document.getElementById('clarity-consent');
    if (!banner) return;

    var acceptBtn = document.getElementById('consent-accept');
    var declineBtn = document.getElementById('consent-decline');
    /* Show banner if no decision yet */
    if (!window.__clarityConsentDecided) {
      banner.hidden = false;
    }

    acceptBtn.addEventListener('click', function () {
      setConsent('accepted');
      window.__clarityConsent = true;
      window.__clarityConsentDecided = true;
      banner.hidden = true;
      loadGoogleFonts();
    });

    declineBtn.addEventListener('click', function () {
      setConsent('declined');
      window.__clarityConsent = false;
      window.__clarityConsentDecided = true;
      banner.hidden = true;
      purgeNonEssential();
    });
  }

  /* --- Revoke consent (called from footer link) --- */

  window.__clarityRevokeConsent = function () {
    try { localStorage.removeItem(CONSENT_KEY); } catch (_) {}
    window.__clarityConsent = false;
    window.__clarityConsentDecided = false;
    var banner = document.getElementById('clarity-consent');
    if (banner) banner.hidden = false;
  };

  /* --- Boot --- */

  /* Load fonts immediately if already consented */
  if (window.__clarityConsent) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadGoogleFonts);
    } else {
      loadGoogleFonts();
    }
  }

  /* Init banner on DOMContentLoaded */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBanner);
  } else {
    initBanner();
  }
})();
