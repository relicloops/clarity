/* ==========================================================================
   Clarity -- Chatbot Storage Layer
   Settings, localStorage (consent-gated), XOR key obfuscation, history,
   request counter, geometry. No DOM, no network.
   ========================================================================== */

(function () {
  'use strict';

  var Clarity = window.Clarity = window.Clarity || {};
  var Chatbot = Clarity.Chatbot = Clarity.Chatbot || {};

  var KEY_STORAGE = 'clarity-chatbot-key';
  var MGMT_KEY_STORAGE = 'clarity-chatbot-mgmt-key';
  var HISTORY_STORAGE = 'clarity-chatbot-history';
  var STATE_STORAGE = 'clarity-chatbot-state';
  var REQUESTS_STORAGE = 'clarity-chatbot-requests';
  var GEOMETRY_STORAGE = 'clarity-chatbot-geometry';
  var SETTINGS_OVERRIDE_STORAGE = 'clarity-chatbot-settings-override';

  /* Settings read from data-* attributes on #clarity-chatbot (set via
     conf.py), merged with any per-reader overrides stored in
     localStorage via the in-panel settings form. */
  function loadSettings() {
    var el = document.getElementById('clarity-chatbot');
    function attr(name, fallback) {
      if (!el) return fallback;
      var v = el.getAttribute(name);
      return v === null || v === '' ? fallback : v;
    }
    function num(name, fallback) {
      var v = attr(name, null);
      if (v === null) return fallback;
      var n = parseFloat(v);
      return isNaN(n) ? fallback : n;
    }
    function intn(name, fallback) {
      var v = attr(name, null);
      if (v === null) return fallback;
      var n = parseInt(v, 10);
      return isNaN(n) ? fallback : n;
    }
    var base = {
      model: attr('data-model', 'openai/gpt-oss-120b:free'),
      maxTokens: intn('data-max-tokens', 1024),
      temperature: num('data-temperature', 0.3),
      topP: num('data-top-p', 1.0),
      frequencyPenalty: num('data-frequency-penalty', 0.0),
      presencePenalty: num('data-presence-penalty', 0.0),
      pageTextLimit: intn('data-page-text-limit', 8000),
      maxHistory: intn('data-max-history', 50),
      reasoningEffort: attr('data-reasoning-effort', ''),
      systemPrompt: attr('data-system-prompt', '')
    };
    var override = loadSettingsOverride();
    if (override) {
      for (var k in override) {
        if (!Object.prototype.hasOwnProperty.call(base, k)) continue;
        if (override[k] === null || override[k] === undefined || override[k] === '') continue;
        base[k] = override[k];
      }
    }
    return base;
  }

  function loadSettingsOverride() {
    var raw = safeGet(SETTINGS_OVERRIDE_STORAGE);
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch (_) { return null; }
  }

  function saveSettingsOverride(obj) {
    safeSet(SETTINGS_OVERRIDE_STORAGE, JSON.stringify(obj || {}));
  }

  function clearSettingsOverride() {
    safeRemove(SETTINGS_OVERRIDE_STORAGE);
  }

  /* --- Safe localStorage helpers (consent-gated) --- */

  function safeGet(key) {
    if (!window.__clarityConsent) return null;
    try { return localStorage.getItem(key); }
    catch (_) { return null; }
  }

  function safeSet(key, value) {
    if (!window.__clarityConsent) return false;
    try { localStorage.setItem(key, value); return true; }
    catch (_) { return false; }
  }

  function safeRemove(key) {
    try { localStorage.removeItem(key); }
    catch (_) {}
  }

  /* --- Key obfuscation (not encryption) ---
     XOR with origin-derived pad so keys are not plain-text in the
     localStorage inspector. A determined XSS attacker can still reverse
     this; see security audit entry. */

  function deriveKeyPad() {
    var src = window.location.origin + '/clarity-chatbot-pad';
    var pad = [];
    for (var i = 0; i < src.length; i++) pad.push(src.charCodeAt(i));
    return pad;
  }

  var KEY_PAD = deriveKeyPad();

  function obfuscate(plaintext) {
    var bytes = [];
    for (var i = 0; i < plaintext.length; i++) {
      bytes.push(plaintext.charCodeAt(i) ^ KEY_PAD[i % KEY_PAD.length]);
    }
    return btoa(String.fromCharCode.apply(null, bytes));
  }

  function deobfuscate(encoded) {
    try {
      var raw = atob(encoded);
      var chars = [];
      for (var i = 0; i < raw.length; i++) {
        chars.push(String.fromCharCode(raw.charCodeAt(i) ^ KEY_PAD[i % KEY_PAD.length]));
      }
      return chars.join('');
    } catch (_) { return null; }
  }

  function saveKey(storageKey, value) {
    return safeSet(storageKey, obfuscate(value));
  }

  function loadKey(storageKey) {
    var raw = safeGet(storageKey);
    if (!raw) return null;
    /* Legacy plain-text keys upgrade on next save */
    if (raw.indexOf('sk-or-') === 0) return raw;
    return deobfuscate(raw);
  }

  /* --- History --- */

  function loadHistory() {
    var raw = safeGet(HISTORY_STORAGE);
    if (!raw) return [];
    try { return JSON.parse(raw); }
    catch (_) { return []; }
  }

  function saveHistory(messages, maxHistory) {
    var trimmed = messages.slice(-maxHistory);
    safeSet(HISTORY_STORAGE, JSON.stringify(trimmed));
  }

  /* --- Purge --- */

  function purgeAll() {
    safeRemove(KEY_STORAGE);
    safeRemove(MGMT_KEY_STORAGE);
    safeRemove(HISTORY_STORAGE);
    safeRemove(STATE_STORAGE);
    safeRemove(REQUESTS_STORAGE);
    safeRemove(GEOMETRY_STORAGE);
    safeRemove(SETTINGS_OVERRIDE_STORAGE);
    safeRemove('clarity-update-dismissed');
    safeRemove('clarity-skin');
  }

  /* --- Local request counter (fallback when no mgmt key) --- */

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function getLocalRequestCount() {
    var raw = safeGet(REQUESTS_STORAGE);
    if (!raw) return { count: 0, date: today() };
    try {
      var data = JSON.parse(raw);
      if (data.date !== today()) return { count: 0, date: today() };
      return data;
    } catch (_) { return { count: 0, date: today() }; }
  }

  function incrementLocalRequests() {
    var data = getLocalRequestCount();
    data.count++;
    data.date = today();
    safeSet(REQUESTS_STORAGE, JSON.stringify(data));
    return data.count;
  }

  /* --- Geometry --- */

  function loadGeometry() {
    var raw = safeGet(GEOMETRY_STORAGE);
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch (_) { return null; }
  }

  function saveGeometry(geo) {
    safeSet(GEOMETRY_STORAGE, JSON.stringify(geo));
  }

  /* --- Panel state (open/closed/minimized) --- */

  function loadState() {
    return safeGet(STATE_STORAGE) || 'closed';
  }

  function saveState(state) {
    safeSet(STATE_STORAGE, state);
  }

  /* --- Exports --- */

  Chatbot.storage = {
    keys: {
      KEY: KEY_STORAGE,
      MGMT_KEY: MGMT_KEY_STORAGE,
      HISTORY: HISTORY_STORAGE,
      STATE: STATE_STORAGE,
      REQUESTS: REQUESTS_STORAGE,
      GEOMETRY: GEOMETRY_STORAGE
    },
    loadSettings: loadSettings,
    loadSettingsOverride: loadSettingsOverride,
    saveSettingsOverride: saveSettingsOverride,
    clearSettingsOverride: clearSettingsOverride,
    safeGet: safeGet,
    safeSet: safeSet,
    safeRemove: safeRemove,
    saveKey: saveKey,
    loadKey: loadKey,
    loadHistory: loadHistory,
    saveHistory: saveHistory,
    purgeAll: purgeAll,
    today: today,
    getLocalRequestCount: getLocalRequestCount,
    incrementLocalRequests: incrementLocalRequests,
    loadGeometry: loadGeometry,
    saveGeometry: saveGeometry,
    loadState: loadState,
    saveState: saveState
  };
})();
