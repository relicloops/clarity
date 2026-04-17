/* ==========================================================================
   Clarity -- Skin Switcher
   Loads standalone CSS skins from css/skins/<name>.css and manages the
   footer <select>. When a skin is active, the theme-toggle (dark/light/
   system) is hidden -- the skin owns the entire visual surface.
   Storage: localStorage key 'clarity-skin', consent-gated.
   ========================================================================== */

(function () {
  'use strict';

  var STORAGE_KEY = 'clarity-skin';

  /* Per-skin Google Fonts query strings. Empty = system fonts only.
     Fonts are loaded via consent.js's dynamic injection path. */
  /* Each skin has a fixed mode so the existing [data-theme="light"]
     and [data-theme="dark"] CSS selectors (code highlighting, chatbot
     panel bg, etc.) fire correctly. */
  var SKIN_MODE = {
    unicorn:    'light',
    programmer: 'light',
    matrix:     'dark',
    rainbow:    'light',
    darcula:    'dark',
    coder:      'dark'
  };

  var SKIN_FONTS = {
    unicorn:    'family=Quicksand:wght@400;500;600;700&family=Nunito:wght@400;500;600;700',
    programmer: '',
    matrix:     'family=Share+Tech+Mono',
    rainbow:    'family=Poppins:wght@400;500;600;700;800',
    darcula:    'family=Fira+Sans:wght@400;500;600;700&family=Fira+Mono:wght@400;500;700',
    coder:      'family=Source+Sans+3:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500;600;700'
  };

  /* The early loader in <head> may have already created this <link>.
     Reuse it so we don't duplicate the stylesheet. */
  var skinLink = document.getElementById('clarity-skin-css') || null;
  var fontLink = document.getElementById('clarity-skin-fonts') || null;

  /* --- Safe storage (privacy.canStore -> localStorage + envelope,
         else sessionStorage). Legacy plain strings round-trip via
         unwrapEnvelope on first read. --- */

  function pickStore(key) {
    var priv = window.__clarityPrivacy;
    if (priv && priv.canStore(key)) {
      try { return window.localStorage; } catch (_) { return null; }
    }
    try { return window.sessionStorage; } catch (_) { return null; }
  }

  function safeGet(key) {
    var store = pickStore(key);
    if (!store) return null;
    var raw;
    try { raw = store.getItem(key); }
    catch (_) { return null; }
    var priv = window.__clarityPrivacy;
    if (!priv) return raw;
    var val = priv.unwrapEnvelope(raw, priv.ttl(key));
    if (val === null && raw !== null) {
      try { store.removeItem(key); } catch (_) {}
    }
    return val;
  }

  function safeSet(key, value) {
    var store = pickStore(key);
    if (!store) return;
    var priv = window.__clarityPrivacy;
    var raw = priv ? priv.wrapEnvelope(value) : String(value);
    try { store.setItem(key, raw); }
    catch (_) {}
  }

  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (_) {}
    try { sessionStorage.removeItem(key); } catch (_) {}
  }

  /* --- Resolve the _static/ base path from an existing theme asset --- */

  function getStaticBase() {
    var existing = document.querySelector('link[href*="_static/css/clarity.css"]');
    if (existing) {
      /* Strip any ?v=... cache-bust query string before extracting
         the base path, otherwise the query leaks into the skin URL. */
      var href = existing.getAttribute('href').split('?')[0];
      return href.replace('css/clarity.css', '');
    }
    var any = document.querySelector('link[href*="_static/"]');
    if (any) {
      var h = any.getAttribute('href').split('?')[0];
      return h.substring(0, h.indexOf('_static/') + 8);
    }
    return '_static/';
  }

  /* --- Load / unload skin CSS --- */

  function loadSkinCSS(name) {
    if (skinLink) {
      skinLink.href = getStaticBase() + 'css/skins/' + name + '.css';
    } else {
      skinLink = document.createElement('link');
      skinLink.rel = 'stylesheet';
      skinLink.id = 'clarity-skin-css';
      skinLink.href = getStaticBase() + 'css/skins/' + name + '.css';
      document.head.appendChild(skinLink);
    }
  }

  function unloadSkinCSS() {
    if (skinLink) {
      skinLink.parentNode.removeChild(skinLink);
      skinLink = null;
    }
  }

  /* --- Load / unload skin fonts (consent-gated) --- */

  function loadSkinFonts(name) {
    unloadSkinFonts();
    /* Same per-reader kill-switch as the default font stack: if the
       reader blocked fonts.googleapis in Privacy Settings, skip the
       load regardless of consent flag. */
    var priv = window.__clarityPrivacy;
    if (priv && !priv.canFetch('fonts.googleapis')) return;
    if (!priv && !window.__clarityConsent) return;
    var query = SKIN_FONTS[name];
    if (!query) return;

    /* Preconnect */
    if (!document.querySelector('link[href="https://fonts.googleapis.com"][rel="preconnect"]')) {
      var pc1 = document.createElement('link');
      pc1.rel = 'preconnect';
      pc1.href = 'https://fonts.googleapis.com';
      document.head.appendChild(pc1);
      var pc2 = document.createElement('link');
      pc2.rel = 'preconnect';
      pc2.href = 'https://fonts.gstatic.com';
      pc2.crossOrigin = '';
      document.head.appendChild(pc2);
    }

    fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.id = 'clarity-skin-fonts';
    fontLink.href = 'https://fonts.googleapis.com/css2?' + query + '&display=swap';
    document.head.appendChild(fontLink);
  }

  function unloadSkinFonts() {
    if (fontLink) {
      fontLink.parentNode.removeChild(fontLink);
      fontLink = null;
    }
  }

  /* --- Theme toggle visibility --- */

  function hideThemeToggle() {
    var wrapper = document.querySelector('.theme-toggle-wrapper');
    if (wrapper) wrapper.style.display = 'none';
  }

  function showThemeToggle() {
    var wrapper = document.querySelector('.theme-toggle-wrapper');
    if (wrapper) wrapper.style.display = '';
  }

  /* --- Apply a skin --- */

  function applySkin(name) {
    if (!name || name === 'default') {
      document.documentElement.removeAttribute('data-skin');
      unloadSkinCSS();
      unloadSkinFonts();
      showThemeToggle();
      safeRemove(STORAGE_KEY);
      /* Restore the theme toggle's last-known choice so the reader
         returns to their dark/light/system preference. Honour the
         same consent-gated store used by theme-toggle.js. */
      var storedTheme = null;
      var themeStore = pickStore('clarity-theme');
      if (themeStore) {
        var rawTheme;
        try { rawTheme = themeStore.getItem('clarity-theme'); } catch (_) {}
        var priv = window.__clarityPrivacy;
        storedTheme = priv ? priv.unwrapEnvelope(rawTheme, priv.ttl('clarity-theme')) : rawTheme;
      }
      if (storedTheme) {
        var effective = storedTheme === 'system'
          ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
          : storedTheme;
        document.documentElement.setAttribute('data-theme', effective);
        document.documentElement.setAttribute('data-theme-setting', storedTheme);
      }
    } else {
      document.documentElement.setAttribute('data-skin', name);
      /* Set data-theme to the skin's fixed mode so all existing
         [data-theme="light"] / [data-theme="dark"] CSS selectors
         fire correctly (code highlighting, chatbot panel, etc.). */
      var mode = SKIN_MODE[name] || 'dark';
      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.setAttribute('data-theme-setting', mode);
      loadSkinCSS(name);
      loadSkinFonts(name);
      hideThemeToggle();
      safeSet(STORAGE_KEY, name);
    }
  }

  /* --- Boot --- */

  function init() {
    var select = document.getElementById('skin-select');
    if (!select) return;

    /* Determine active skin: localStorage override > deployer default */
    var stored = safeGet(STORAGE_KEY);
    var deployerDefault = document.documentElement.getAttribute('data-skin') || 'default';
    var active = stored || deployerDefault;

    /* Apply immediately */
    applySkin(active);

    /* Sync the <select> */
    select.value = active;

    /* Listen for changes */
    select.addEventListener('change', function () {
      applySkin(select.value);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
