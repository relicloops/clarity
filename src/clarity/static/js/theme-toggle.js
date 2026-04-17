/* ==========================================================================
   Clarity — Theme Toggle (dark / light / system)
   Storage:
     - consent granted  -> localStorage['clarity-theme'] (survives restart)
     - consent declined -> sessionStorage['clarity-theme'] (tab-scoped)
     - file:// protocol -> window.name fallback
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'clarity-theme';
  var THEMES = ['dark', 'light', 'system'];
  var NAME_PREFIX = 'cl:';

  /* --- Safe storage access --- */

  function pickStore() {
    if (window.__clarityConsent) {
      try { return window.localStorage; } catch (_) { return null; }
    }
    try { return window.sessionStorage; } catch (_) { return null; }
  }

  function safeGet(storage, key) {
    if (!storage) return null;
    try { return storage.getItem(key); }
    catch (_) { return null; }
  }

  function safeSet(storage, key, value) {
    if (!storage) return false;
    try { storage.setItem(key, value); return true; }
    catch (_) { return false; }
  }

  /* --- window.name fallback (file:// protocol) --- */

  var preferNameStore = typeof window !== 'undefined' &&
    window.location && window.location.protocol === 'file:';

  function readNameStore() {
    if (!window.name || window.name.indexOf(NAME_PREFIX) !== 0) return null;
    try { return JSON.parse(window.name.slice(NAME_PREFIX.length)) || {}; }
    catch (_) { return null; }
  }

  function writeNameStore(store, force) {
    if (!force && window.name && window.name.indexOf(NAME_PREFIX) !== 0) return false;
    try { window.name = NAME_PREFIX + JSON.stringify(store || {}); return true; }
    catch (_) { return false; }
  }

  function getNameValue(key) {
    var store = readNameStore();
    if (store && Object.prototype.hasOwnProperty.call(store, key)) return store[key];
    return null;
  }

  function setNameValue(key, value, force) {
    var store = readNameStore() || {};
    store[key] = value;
    writeNameStore(store, force);
  }

  /* --- System theme detection --- */

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  }

  function getEffectiveTheme(theme) {
    return theme === 'system' ? getSystemTheme() : theme;
  }

  /* --- Theme storage --- */

  function getStoredTheme() {
    var stored;

    if (preferNameStore) {
      stored = getNameValue(STORAGE_KEY);
      if (stored && THEMES.indexOf(stored) !== -1) return stored;
    }

    stored = safeGet(pickStore(), STORAGE_KEY);
    if (stored && THEMES.indexOf(stored) !== -1) return stored;

    if (!preferNameStore) {
      stored = getNameValue(STORAGE_KEY);
      if (stored && THEMES.indexOf(stored) !== -1) return stored;
    }

    return 'system';
  }

  function setStoredTheme(theme) {
    safeSet(pickStore(), STORAGE_KEY, theme);
    setNameValue(STORAGE_KEY, theme, preferNameStore);
  }

  /* --- Apply theme to DOM --- */

  function applyTheme(theme) {
    var effective = getEffectiveTheme(theme);
    document.documentElement.setAttribute('data-theme', effective);
    document.documentElement.setAttribute('data-theme-setting', theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var bg = getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-primary').trim();
      if (bg) meta.setAttribute('content', bg);
    }
  }

  /* --- Update toggle button UI --- */

  function updateToggleUI(theme) {
    var toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    var icons = toggle.querySelectorAll('.theme-icon');
    for (var i = 0; i < icons.length; i++) {
      icons[i].style.display = 'none';
    }

    var selector = theme === 'dark' ? '.icon-moon' :
                   theme === 'light' ? '.icon-sun' : '.icon-system';
    var active = toggle.querySelector(selector);
    if (active) active.style.display = 'inline-block';

    var labels = {
      dark: 'Dark theme. Click for Light.',
      light: 'Light theme. Click for System.',
      system: 'System theme. Click for Dark.'
    };
    toggle.setAttribute('title', labels[theme] || '');
    toggle.setAttribute('aria-label', labels[theme] || '');
  }

  /* --- Cycle through themes --- */

  function cycleTheme() {
    var current = getStoredTheme();
    var idx = THEMES.indexOf(current);
    var next = THEMES[(idx + 1) % THEMES.length];

    setStoredTheme(next);
    applyTheme(next);
    updateToggleUI(next);
    return next;
  }

  /* --- Initialize --- */

  var delegationInitialized = false;

  function initToggle() {
    if (!delegationInitialized) {
      delegationInitialized = true;
      document.addEventListener('click', function (e) {
        var target = e.target;
        while (target && target !== document) {
          if (target.id === 'theme-toggle') {
            cycleTheme();
            return;
          }
          target = target.parentElement;
        }
      });
    }

    var current = getStoredTheme();
    updateToggleUI(current);

    if (typeof MutationObserver !== 'undefined') {
      var observer = new MutationObserver(function () {
        var toggle = document.getElementById('theme-toggle');
        if (toggle) {
          updateToggleUI(getStoredTheme());
          observer.disconnect();
        }
      });
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  }

  function watchSystemTheme() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var handler = function () {
      if (getStoredTheme() === 'system') {
        applyTheme('system');
      }
    };
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
    }
  }

  /* --- Boot --- */

  applyTheme(getStoredTheme());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initToggle();
      watchSystemTheme();
    });
  } else {
    initToggle();
    watchSystemTheme();
  }
})();
