/* ==========================================================================
   Clarity -- Skin Bootstrap (runs in <head> BEFORE first paint)

   Avoids a flash of the default theme when the reader has a skin
   stored. Reads localStorage first, falls back to sessionStorage
   (declined-consent readers whose in-tab pick still lives there),
   sets data-skin on <html>, and injects the skin stylesheet <link>.

   Must be loaded synchronously from <head> (no async / no defer)
   because any asynchrony permits a paint before the skin is applied.
   Resolves the _static/ base from this script's own src attribute so
   the file stays template-free and can be cached cross-site.

   The full interactive skin-switcher (the <select> in the footer,
   Google Fonts wiring, skin-change events) runs later via
   skin-switcher.js; this bootstrap only handles the first-paint path.
   ========================================================================== */

(function () {
  'use strict';

  try {
    /* Resolve _static/ base from this script's own URL so the file
       doesn't depend on Jinja interpolation. */
    function baseFromScript() {
      var me = document.currentScript;
      if (me && me.src) {
        return me.src.replace(/js\/skin-bootstrap\.js(\?.*)?$/, '');
      }
      /* Fallback: derive from any existing _static/ asset link. */
      var any = document.querySelector('link[href*="_static/"]');
      if (any) {
        var h = (any.getAttribute('href') || '').split('?')[0];
        var idx = h.indexOf('_static/');
        if (idx !== -1) return h.substring(0, idx + 8);
      }
      return '_static/';
    }

    /* Check localStorage first (consent-granted readers), fall back
       to sessionStorage (declined-consent readers whose in-tab pick
       still lives there). Runs before privacy.js / consent.js so we
       try both stores manually. Values may be plain strings
       (pre-v1.5) or a {v, t} envelope -- parse transparently. */
    function readSkin(store) {
      var raw;
      try { raw = store.getItem('clarity-skin'); }
      catch (_) { return null; }
      if (!raw) return null;
      if (raw.charAt(0) === '{') {
        try {
          var env = JSON.parse(raw);
          if (env && Object.prototype.hasOwnProperty.call(env, 'v')) return env.v;
        } catch (_) {}
      }
      return raw;
    }

    var s = readSkin(localStorage) || readSkin(sessionStorage);
    if (!s || s === 'default') {
      var d = document.documentElement.getAttribute('data-skin');
      if (!d || d === 'default') return;
      s = d;
    }

    document.documentElement.setAttribute('data-skin', s);

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'clarity-skin-css';
    link.href = baseFromScript() + 'css/skins/' + s + '.css';
    document.head.appendChild(link);

    /* Set data-theme to match the skin's mode so [data-theme]
       selectors fire on first paint. */
    var modes = {
      unicorn:    'light',
      programmer: 'light',
      matrix:     'dark',
      rainbow:    'light',
      darcula:    'dark',
      coder:      'dark'
    };
    if (modes[s]) {
      document.documentElement.setAttribute('data-theme', modes[s]);
      document.documentElement.setAttribute('data-theme-setting', modes[s]);
    }
  } catch (_) {}
})();
