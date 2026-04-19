/* ==========================================================================
   Clarity — Core Theme JavaScript
   Sidebar, TOC highlight, keyboard nav, back-to-top, code badges
   ========================================================================== */

(function () {
  'use strict';

  /* --- Sidebar Toggle --- */

  function initSidebar() {
    var sidebar = document.getElementById('sidebar');
    var toggle = document.querySelector('.sidebar-toggle');
    if (!sidebar || !toggle) return;

    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    function openSidebar() {
      sidebar.classList.add('open');
      overlay.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    overlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeSidebar();
      }
    });

    /* Mark current page in sidebar */
    var links = sidebar.querySelectorAll('.sidebar-nav a');
    var currentPath = window.location.pathname;
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      if (href) {
        var linkPath;
        try { linkPath = new URL(href, window.location.origin).pathname; }
        catch (_) { linkPath = href; }
        if (linkPath === currentPath || currentPath.endsWith(href)) {
          links[i].classList.add('current');
        }
      }
    }
  }

  /* --- TOC Scroll Highlight --- */

  function initTocHighlight() {
    var tocLinks = document.querySelectorAll('.clarity-toc .toc-inner a');
    if (!tocLinks.length) return;

    var headings = [];
    for (var i = 0; i < tocLinks.length; i++) {
      var href = tocLinks[i].getAttribute('href');
      if (href && href.charAt(0) === '#') {
        var target = document.getElementById(href.slice(1));
        if (target) {
          headings.push({ el: target, link: tocLinks[i] });
        }
      }
    }
    if (!headings.length) return;

    var headerOffset = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--header-height'), 10
    ) || 56;

    var ticking = false;

    function updateHighlight() {
      var scrollY = window.scrollY + headerOffset + 20;
      var active = null;

      /* If we've reached the bottom of the page, force-select the last
         heading (the viewport cannot scroll far enough for its offsetTop
         to pass the threshold). */
      var atBottom = (window.innerHeight + window.scrollY) >=
        (document.documentElement.scrollHeight - 4);

      if (atBottom) {
        active = headings[headings.length - 1];
      } else {
        for (var i = 0; i < headings.length; i++) {
          if (headings[i].el.offsetTop <= scrollY) {
            active = headings[i];
          }
        }
      }

      for (var j = 0; j < headings.length; j++) {
        headings[j].link.classList.remove('active');
      }
      if (active) {
        active.link.classList.add('active');
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateHighlight);
        ticking = true;
      }
    }, { passive: true });

    updateHighlight();
  }

  /* --- Back to Top --- */

  function initBackToTop() {
    var btn = document.querySelector('.back-to-top');
    if (!btn) return;

    var ticking = false;

    function checkVisibility() {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
        btn.removeAttribute('hidden');
      } else {
        btn.classList.remove('visible');
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(checkVisibility);
        ticking = true;
      }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* --- Keyboard Navigation --- */

  function initKeyboardNav() {
    var navEnabled = document.body.getAttribute('data-nav-keys') !== 'false';
    if (!navEnabled) return;

    document.addEventListener('keydown', function (e) {
      /* Skip if user is typing in an input */
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' ||
          e.target.isContentEditable) return;

      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      if (e.key === 'ArrowLeft') {
        var prev = document.querySelector('.nav-prev');
        if (prev) { prev.click(); e.preventDefault(); }
      } else if (e.key === 'ArrowRight') {
        var next = document.querySelector('.nav-next');
        if (next) { next.click(); e.preventDefault(); }
      } else if (e.key === '/') {
        var search = document.querySelector('input[type="search"], input[name="q"]');
        if (search) { search.focus(); e.preventDefault(); }
      }
    });
  }

  /* --- Code Block Language Badges --- */

  function initCodeBadges() {
    var blocks = document.querySelectorAll('div.highlight');
    for (var i = 0; i < blocks.length; i++) {
      var cls = blocks[i].className;
      var match = cls.match(/highlight-(\w+)/);
      if (match && match[1] !== 'default' && match[1] !== 'none') {
        var badge = document.createElement('span');
        badge.className = 'code-lang-badge';
        badge.textContent = match[1];
        blocks[i].style.position = 'relative';
        blocks[i].appendChild(badge);
      }
    }
  }

  /* --- Text Size Controls --- */

  var TEXT_SIZE_KEY = 'clarity-text-size';
  var TEXT_SIZE_MIN = 75;
  var TEXT_SIZE_MAX = 150;
  var TEXT_SIZE_STEP = 10;
  var TEXT_SIZE_DEFAULT = 100;

  function textSizeStore() {
    var priv = window.__clarityPrivacy;
    if (priv && priv.canStore(TEXT_SIZE_KEY)) {
      try { return window.localStorage; } catch (_) { return null; }
    }
    try { return window.sessionStorage; } catch (_) { return null; }
  }

  function getStoredTextSize() {
    var store = textSizeStore();
    if (!store) return TEXT_SIZE_DEFAULT;
    try {
      var raw = store.getItem(TEXT_SIZE_KEY);
      var priv = window.__clarityPrivacy;
      var unwrapped = priv ? priv.unwrapEnvelope(raw, priv.ttl(TEXT_SIZE_KEY)) : raw;
      if (unwrapped === null && raw !== null) {
        try { store.removeItem(TEXT_SIZE_KEY); } catch (_) {}
        return TEXT_SIZE_DEFAULT;
      }
      var val = parseInt(unwrapped, 10);
      if (val >= TEXT_SIZE_MIN && val <= TEXT_SIZE_MAX) return val;
    } catch (_) {}
    return TEXT_SIZE_DEFAULT;
  }

  function applyTextSize(size) {
    var article = document.querySelector('.clarity-article');
    if (!article) return;
    article.style.setProperty('--content-font-size', (size / 100) + 'rem');
    updateTextSizeBadge(size);
    scheduleMermaidRerun();
    var store = textSizeStore();
    if (!store) return;
    var priv = window.__clarityPrivacy;
    var raw = priv ? priv.wrapEnvelope(size) : String(size);
    try { store.setItem(TEXT_SIZE_KEY, raw); } catch (_) {}
  }

  function updateTextSizeBadge(size) {
    var badge = document.getElementById('text-size-percent');
    if (badge) badge.textContent = size + '%';
  }

  /* Re-render every <pre class="mermaid"> so node bounding boxes and
     arrow endpoints reflow against the new text-size. Diagrams are
     laid out by mermaid.js at render time based on initial font
     metrics; on text-size change we restore each pre's original
     source (captured by mermaid-capture.js into data-src), clear
     mermaid's data-processed flag, and invoke mermaid.run() to
     re-layout. Debounced so rapid -/+ clicks coalesce into a single
     render pass instead of firing per keypress.

     sphinxcontrib-mermaid loads mermaid as an ESM module -- the
     `mermaid` binding lives inside module scope and is NOT exposed
     on window. We inject a one-shot ESM script that imports from the
     same CDN URL (browser dedupes by URL) and stashes the binding on
     window.__clarityMermaid for cross-script access. The loader
     resolves both a default export (today) and a namespace object
     (future-proof if mermaid ever drops the default export) so the
     handle survives API restructures. */
  var mermaidRerunTimer = null;
  var mermaidModuleUrl = null;
  var mermaidWarned = false;

  function getMermaidModuleUrl() {
    if (mermaidModuleUrl) return mermaidModuleUrl;
    var inline = document.querySelectorAll('script:not([src])');
    for (var i = 0; i < inline.length; i++) {
      var text = inline[i].textContent || '';
      var m = text.match(/https:\/\/[^"']+mermaid@[^"']+?mermaid\.esm\.min\.mjs/);
      if (m) { mermaidModuleUrl = m[0]; return mermaidModuleUrl; }
    }
    /* Fallback to a pinned recent version. Same-URL browser cache
       makes this a no-op network fetch if the inline script used the
       same URL. */
    mermaidModuleUrl = 'https://cdn.jsdelivr.net/npm/mermaid@11.2.0/dist/mermaid.esm.min.mjs';
    return mermaidModuleUrl;
  }

  function ensureMermaidHandle(cb) {
    if (window.__clarityMermaid) return cb(window.__clarityMermaid);
    var existing = document.getElementById('__clarity-mermaid-loader');
    function onReady() {
      window.removeEventListener('clarity:mermaid-ready', onReady);
      cb(window.__clarityMermaid);
    }
    window.addEventListener('clarity:mermaid-ready', onReady);
    if (existing) return;  /* loader already pending */
    var url = getMermaidModuleUrl();
    var s = document.createElement('script');
    s.id = '__clarity-mermaid-loader';
    s.type = 'module';
    /* Belt-and-braces: prefer the default export, but fall back to
       the namespace object if a future mermaid release moves to
       named-only exports. Either form resolves to something with
       run() / init() on today's v10-v11 builds. */
    s.textContent =
      'import * as ns from "' + url + '";' +
      'window.__clarityMermaid = (ns && ns.default) || ns;' +
      'window.dispatchEvent(new CustomEvent("clarity:mermaid-ready"));';
    document.head.appendChild(s);
  }

  /* Layered fallback over mermaid's evolving API:
       1. m.run({nodes:[...]})           v10.6+ targeted
       2. m.run({querySelector:...})     v10+
       3. m.run()                         v10+ bare
       4. m.init(undefined, pres)         v8-v9 deprecated (still
                                          present as of v11.14)
     Each step wraps the Promise .catch to swallow async rejections
     so unhandled errors don't bubble when mermaid's internals throw.
     If all four fail, one-time console.warn + silent degrade. */
  function invokeMermaidRun(m, pres) {
    if (!m) return false;
    function wrap(p) {
      if (p && typeof p.catch === 'function') p.catch(function () {});
    }
    if (typeof m.run === 'function') {
      try { wrap(m.run({ nodes: Array.prototype.slice.call(pres) })); return true; } catch (_) {}
      try { wrap(m.run({ querySelector: 'pre.mermaid' })); return true; } catch (_) {}
      try { wrap(m.run()); return true; } catch (_) {}
    }
    if (typeof m.init === 'function') {
      try { m.init(undefined, pres); return true; } catch (_) {}
    }
    return false;
  }

  function scheduleMermaidRerun() {
    /* Skip the whole dance when no diagram captured a source (page
       has no mermaid blocks). */
    if (!document.querySelector('pre.mermaid[data-src]')) return;
    if (mermaidRerunTimer) clearTimeout(mermaidRerunTimer);
    mermaidRerunTimer = setTimeout(rerunMermaid, 120);
  }

  function rerunMermaid() {
    mermaidRerunTimer = null;
    var pres = document.querySelectorAll('pre.mermaid[data-src]');
    if (!pres.length) return;
    for (var i = 0; i < pres.length; i++) {
      pres[i].removeAttribute('data-processed');
      pres[i].innerHTML = pres[i].dataset.src;
    }
    ensureMermaidHandle(function (m) {
      var ok = invokeMermaidRun(m, pres);
      if (!ok && !mermaidWarned && window.console && console.warn) {
        mermaidWarned = true;
        console.warn('[clarity] mermaid re-run skipped: unknown API shape. ' +
          'Diagrams stay at initial render size until the reader reloads.');
      }
    });
  }

  function initTextSize() {
    var decrease = document.getElementById('text-size-decrease');
    var increase = document.getElementById('text-size-increase');
    if (!decrease || !increase) return;

    var current = getStoredTextSize();
    /* Always update the badge so the reader sees the current percentage
       on boot, even when the size is at the default. Only re-apply the
       CSS variable when the stored value deviates from default. */
    updateTextSizeBadge(current);
    if (current !== TEXT_SIZE_DEFAULT) {
      applyTextSize(current);
    }

    decrease.addEventListener('click', function () {
      current = getStoredTextSize();
      var next = Math.max(TEXT_SIZE_MIN, current - TEXT_SIZE_STEP);
      if (next !== current) {
        current = next;
        applyTextSize(current);
      }
    });

    increase.addEventListener('click', function () {
      current = getStoredTextSize();
      var next = Math.min(TEXT_SIZE_MAX, current + TEXT_SIZE_STEP);
      if (next !== current) {
        current = next;
        applyTextSize(current);
      }
    });
  }

  /* --- Search Result Location Badges --- */

  function anchorToLabel(anchor) {
    return anchor
      .replace(/-/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function initSearchEnhancements() {
    var container = document.getElementById('search-results');
    if (!container) return;

    function enhanceResults() {
      var items = container.querySelectorAll('ul.search li');
      for (var i = 0; i < items.length; i++) {
        if (items[i].getAttribute('data-clarity-enhanced')) continue;
        items[i].setAttribute('data-clarity-enhanced', '1');

        var link = items[i].querySelector('a');
        if (!link) continue;

        var href = link.getAttribute('href') || '';
        var hashIdx = href.indexOf('#');
        if (hashIdx === -1) continue;

        var anchor = href.slice(hashIdx + 1);
        if (!anchor) continue;

        var badge = document.createElement('span');
        badge.className = 'search-location';
        badge.textContent = anchorToLabel(anchor);
        link.parentNode.insertBefore(badge, link.nextSibling);
      }
    }

    var observer = new MutationObserver(enhanceResults);
    observer.observe(container, { childList: true, subtree: true });

    enhanceResults();
  }

  /* --- Scroll-to & pulse first search highlight --- */

  function initHighlightScroll() {
    var first = document.querySelector('.page-content .highlighted');
    if (!first) return;

    var headerH = parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--header-height'), 10
    ) || 56;

    var top = first.getBoundingClientRect().top + window.scrollY - headerH - 40;
    window.scrollTo({ top: top, behavior: 'smooth' });

    first.classList.add('highlight-pulse');
  }

  /* --- TOC responsive toggle (open over 1100px, closed below) --- */

  function initTocResponsive() {
    var details = document.querySelector('.clarity-toc .toc-details');
    if (!details) return;
    var userToggled = false;

    details.addEventListener('toggle', function () {
      userToggled = true;
    });

    function syncState() {
      if (userToggled) return;
      details.open = window.innerWidth > 1100;
    }

    syncState();
    window.addEventListener('resize', syncState);

    /* On mobile, close the TOC after clicking a link so the target anchor
       lands at the correct scroll position (the sticky open TOC would
       otherwise push the target below the viewport top). */
    var tocLinks = details.querySelectorAll('a[href^="#"]');
    for (var i = 0; i < tocLinks.length; i++) {
      tocLinks[i].addEventListener('click', function () {
        if (window.innerWidth <= 1100) {
          details.open = false;
        }
      });
    }
  }

  /* --- Boot --- */

  /* --- Missing-version warning (DevTools console) --- */

  function warnIfVersionMissing() {
    if (document.querySelector('[data-clarity-warn="version-missing"]')) {
      console.warn(
        '[Clarity theme] No `release` or `version` is set in your ' +
        'Sphinx conf.py. Readers will see a warning badge in the ' +
        'sidebar until you set one. Example:\n' +
        '    # docs/source/conf.py\n' +
        '    version = "1.2"\n' +
        '    release = "v1.2.3-000"'
      );
    }
  }

  function init() {
    initSidebar();
    initTocHighlight();
    initBackToTop();
    initKeyboardNav();
    initCodeBadges();
    initTextSize();
    initSearchEnhancements();
    initHighlightScroll();
    initTocResponsive();
    warnIfVersionMissing();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
