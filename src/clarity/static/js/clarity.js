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

      for (var i = 0; i < headings.length; i++) {
        if (headings[i].el.offsetTop <= scrollY) {
          active = headings[i];
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

  /* --- Boot --- */

  function init() {
    initSidebar();
    initTocHighlight();
    initBackToTop();
    initKeyboardNav();
    initCodeBadges();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
