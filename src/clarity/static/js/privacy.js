/* ==========================================================================
   Clarity -- Privacy Foundation
   Per-key CAN/CANNOT + scheduled purge (TTL). Lives behind
   window.__clarityPrivacy so every IIFE can ask canStore(key) /
   canFetch(host) / ttl(key) before touching storage or the network.

   Legacy clarity-consent ("accepted" / "declined") still drives the
   defaults when the new clarity-privacy blob is absent -- no forced
   migration for existing readers. When the reader opens the Privacy
   Settings modal and saves, clarity-privacy gets written and the
   per-key / per-host values take over.

   Envelope helpers (wrapEnvelope / unwrapEnvelope) let consumer IIFEs
   add a {v, t} wrapper to their values so a boot-time TTL sweep and
   lazy per-read checks can purge expired data.
   ========================================================================== */

(function () {
  'use strict';

  var SCHEMA       = 'clarity-privacy/v1';
  var PRIVACY_KEY  = 'clarity-privacy';
  var CONSENT_KEY  = 'clarity-consent';

  var TTL_MS = {
    'never': Infinity,
    '1d':    24 * 60 * 60 * 1000,
    '1w':    7  * 24 * 60 * 60 * 1000,
    '1m':    30 * 24 * 60 * 60 * 1000
  };

  /* Storage keys the theme writes to (excludes clarity-consent and
     clarity-privacy themselves -- those are meta, exempt from their
     own consent gate). */
  var KNOWN_STORAGE_KEYS = [
    'clarity-theme',
    'clarity-text-size',
    'clarity-skin',
    'clarity-chatbot-key',
    'clarity-chatbot-mgmt-key',
    'clarity-chatbot-history',
    'clarity-chatbot-state',
    'clarity-chatbot-geometry',
    'clarity-chatbot-settings-override',
    'clarity-chatbot-requests',
    'clarity-update-dismissed'
  ];

  /* External resources the theme may request. Short bucket names, not
     full hostnames -- one bucket may cover multiple hosts (e.g.
     fonts.googleapis covers fonts.googleapis.com + fonts.gstatic.com). */
  var KNOWN_HOSTS = [
    'fonts.googleapis',
    'pypi.update-check',
    'openrouter.ai'
  ];

  /* --- Privacy blob load / save --- */

  function loadPrivacy() {
    var raw;
    try { raw = localStorage.getItem(PRIVACY_KEY); } catch (_) { return null; }
    if (!raw) return null;
    try {
      var obj = JSON.parse(raw);
      if (!obj || obj.schema !== SCHEMA) return null;
      if (!obj.consent || typeof obj.consent !== 'object') return null;
      return obj;
    } catch (_) { return null; }
  }

  function savePrivacy(obj) {
    obj.schema = SCHEMA;
    obj.updated = Date.now();
    try { localStorage.setItem(PRIVACY_KEY, JSON.stringify(obj)); }
    catch (_) {}
    notify();
  }

  function clearPrivacy() {
    try { localStorage.removeItem(PRIVACY_KEY); } catch (_) {}
    notify();
  }

  function loadLegacyConsent() {
    try { return localStorage.getItem(CONSENT_KEY); } catch (_) { return null; }
  }

  /* --- Effective entry lookup for a key / host ---
     Resolution order:
       1. clarity-privacy blob, specific entry present -> use it.
       2. clarity-privacy blob, entry missing           -> fall through.
       3. No blob                                       -> derive from
          clarity-consent (accepted => allow:true/never; else deny). */

  function entryFor(name) {
    var priv = loadPrivacy();
    if (priv && priv.consent && Object.prototype.hasOwnProperty.call(priv.consent, name)) {
      var e = priv.consent[name];
      if (e && typeof e === 'object') {
        return {
          allow: e.allow === true,
          ttl:   typeof e.ttl === 'string' && (e.ttl in TTL_MS) ? e.ttl : 'never'
        };
      }
    }
    return {
      allow: loadLegacyConsent() === 'accepted',
      ttl:   'never'
    };
  }

  function canStore(key) { return entryFor(key).allow === true; }
  function canFetch(host) { return entryFor(host).allow === true; }

  function ttl(key) {
    var label = entryFor(key).ttl;
    return TTL_MS[label] === undefined ? Infinity : TTL_MS[label];
  }

  /* --- Envelope helpers ---
     Values stored via consumer IIFEs are wrapped in { v, t } so the
     boot sweep and lazy expiration know when each value was last
     written. Legacy plain strings (pre-v1.5) round-trip transparently
     on first read; the next write re-wraps them. */

  function wrapEnvelope(value) {
    return JSON.stringify({ v: String(value == null ? '' : value), t: Date.now() });
  }

  function unwrapEnvelope(raw, ttlMs) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== 'string') return null;
    /* Envelope starts with { */
    if (raw.charAt(0) === '{') {
      try {
        var obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' &&
            Object.prototype.hasOwnProperty.call(obj, 'v') &&
            Object.prototype.hasOwnProperty.call(obj, 't')) {
          if (ttlMs !== Infinity && ttlMs > 0 && (Date.now() - obj.t) > ttlMs) {
            return null;  /* expired */
          }
          return obj.v;
        }
      } catch (_) { /* fall through: treat as legacy plain string */ }
    }
    return raw;
  }

  /* --- Preset writers used by the Privacy Settings modal ---
     acceptAll / declineAll produce a concrete blob so the modal's
     "Apply presets" menu and the consent banner's Accept / Decline
     buttons share one code path. */

  function _withAll(allow) {
    var blob = { schema: SCHEMA, updated: Date.now(), consent: {} };
    var names = KNOWN_STORAGE_KEYS.concat(KNOWN_HOSTS);
    for (var i = 0; i < names.length; i++) {
      blob.consent[names[i]] = { allow: allow, ttl: 'never' };
    }
    return blob;
  }

  function acceptAll()  { savePrivacy(_withAll(true)); }
  function declineAll() { savePrivacy(_withAll(false)); }
  function reset()      { clearPrivacy(); }

  function setEntry(name, allow, ttlLabel) {
    var priv = loadPrivacy() || { schema: SCHEMA, consent: {} };
    priv.consent[name] = {
      allow: allow === true,
      ttl:   (typeof ttlLabel === 'string' && ttlLabel in TTL_MS) ? ttlLabel : 'never'
    };
    savePrivacy(priv);
  }

  /* Snapshot of the current state. When no blob exists, returns a
     derived view with `derived: true` so callers (the modal) can
     distinguish "never customized" from "saved presets". */
  function getAll() {
    var priv = loadPrivacy();
    if (priv) return priv;
    var allow = loadLegacyConsent() === 'accepted';
    var consent = {};
    var names = KNOWN_STORAGE_KEYS.concat(KNOWN_HOSTS);
    for (var i = 0; i < names.length; i++) {
      consent[names[i]] = { allow: allow, ttl: 'never' };
    }
    return { schema: SCHEMA, derived: true, consent: consent };
  }

  /* --- TTL sweep ---
     Boot-time pass over known keys in both storages. Removes any
     envelope whose t + ttl is in the past. Cheap (< 15 keys * 2
     stores) and keeps storage tidy for readers who return after a
     long absence. Lazy expiration on read still happens via
     unwrapEnvelope (belt + braces). */

  function sweep() {
    for (var i = 0; i < KNOWN_STORAGE_KEYS.length; i++) {
      var key = KNOWN_STORAGE_KEYS[i];
      var keyTtl = ttl(key);
      if (keyTtl === Infinity) continue;
      sweepStore(safeLocal(), key, keyTtl);
      sweepStore(safeSession(), key, keyTtl);
    }
  }

  function sweepStore(store, key, ttlMs) {
    if (!store) return;
    var raw;
    try { raw = store.getItem(key); } catch (_) { return; }
    if (!raw || typeof raw !== 'string' || raw.charAt(0) !== '{') return;
    try {
      var env = JSON.parse(raw);
      if (env && 't' in env && (Date.now() - env.t) > ttlMs) {
        store.removeItem(key);
      }
    } catch (_) {}
  }

  function safeLocal()   { try { return window.localStorage; }   catch (_) { return null; } }
  function safeSession() { try { return window.sessionStorage; } catch (_) { return null; } }

  /* --- Change subscription --- */

  var listeners = [];

  function onChange(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      var idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  function notify() {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](); } catch (_) {}
    }
  }

  /* --- Exports --- */

  window.__clarityPrivacy = {
    SCHEMA:             SCHEMA,
    TTL_MS:             TTL_MS,
    TTL_LABELS:         ['never', '1d', '1w', '1m'],
    KNOWN_STORAGE_KEYS: KNOWN_STORAGE_KEYS,
    KNOWN_HOSTS:        KNOWN_HOSTS,
    canStore:           canStore,
    canFetch:           canFetch,
    ttl:                ttl,
    wrapEnvelope:       wrapEnvelope,
    unwrapEnvelope:     unwrapEnvelope,
    acceptAll:          acceptAll,
    declineAll:         declineAll,
    reset:              reset,
    setEntry:           setEntry,
    getAll:             getAll,
    sweep:              sweep,
    onChange:           onChange
  };

  /* Run the TTL sweep on boot. Safe even before consent.js has
     populated window.__clarityConsent -- entryFor() reads
     clarity-consent directly from localStorage. */
  try { sweep(); } catch (_) {}

  /* Re-run the sweep when the tab regains focus after a long pause
     so a reader who leaves a doc open overnight gets a fresh purge
     at wake-up. Debounced to once per minute to avoid rerunning on
     every rapid tab switch. */
  var lastSweep = Date.now();
  function maybeResweep() {
    if (document.visibilityState && document.visibilityState !== 'visible') return;
    if (Date.now() - lastSweep < 60 * 1000) return;
    lastSweep = Date.now();
    try { sweep(); } catch (_) {}
  }
  if (typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', maybeResweep);
    window.addEventListener('focus', maybeResweep);
  }

  /* Cross-tab coordination: when another tab writes clarity-privacy,
     rebuild the derived view so canStore/canFetch reflect the new
     rules in all open tabs. */
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('storage', function (e) {
      if (e && (e.key === PRIVACY_KEY || e.key === CONSENT_KEY)) {
        try { sweep(); } catch (_) {}
        notify();
      }
    });
  }
})();
