/* ==========================================================================
   Clarity -- Chatbot Slash Commands
   Parser and autocomplete source for /goto and /read. No persistence,
   no network -- just pure helpers and autocomplete markup builder.
   ========================================================================== */

(function () {
  'use strict';

  var Clarity = window.Clarity = window.Clarity || {};
  var Chatbot = Clarity.Chatbot = Clarity.Chatbot || {};

  function parseSlashCommand(val) {
    if (val.indexOf('/goto ') === 0) return { cmd: 'goto', query: val.slice(6).toLowerCase() };
    if (val.indexOf('/read ') === 0) return { cmd: 'read', query: val.slice(6).toLowerCase() };
    if (val === '/goto' || val === '/read') return { cmd: val.slice(1), query: '' };
    return null;
  }

  /* Collect links from .page-content and .sidebar-nav, deduplicated. */
  function getPageLinks() {
    var links = [];
    var seen = {};
    var els = document.querySelectorAll('.page-content a[href]');
    for (var i = 0; i < els.length; i++) {
      var href = els[i].getAttribute('href');
      if (!href || href.charAt(0) === '#') continue;
      var text = (els[i].textContent || '').trim();
      if (seen[href]) continue;
      seen[href] = true;
      links.push({ text: text, href: href });
    }
    var navEls = document.querySelectorAll('.sidebar-nav a[href]');
    for (var j = 0; j < navEls.length; j++) {
      var navHref = navEls[j].getAttribute('href');
      var navText = (navEls[j].textContent || '').trim();
      if (!navHref || seen[navHref]) continue;
      seen[navHref] = true;
      links.push({ text: navText, href: navHref });
    }
    return links;
  }

  function filterLinks(links, query, maxResults) {
    if (!maxResults) maxResults = 8;
    var matches = [];
    for (var i = 0; i < links.length && matches.length < maxResults; i++) {
      var link = links[i];
      if (link.text.toLowerCase().indexOf(query) !== -1 ||
          link.href.toLowerCase().indexOf(query) !== -1) {
        matches.push(link);
      }
    }
    if (!matches.length && !query) matches = links.slice(0, maxResults);
    return matches;
  }

  function renderAutocomplete(autocompleteEl, matches) {
    if (!matches.length) {
      autocompleteEl.hidden = true;
      return;
    }
    var html = '';
    for (var m = 0; m < matches.length; m++) {
      html += '<div class="chatbot-ac-item" data-href="' + matches[m].href.replace(/"/g, '&quot;') + '">'
        + '<span class="chatbot-ac-text">' + matches[m].text.replace(/</g, '&lt;') + '</span>'
        + '<span class="chatbot-ac-href">' + matches[m].href.replace(/</g, '&lt;') + '</span>'
        + '</div>';
    }
    autocompleteEl.innerHTML = html;
    autocompleteEl.hidden = false;
  }

  Chatbot.commands = {
    parseSlashCommand: parseSlashCommand,
    getPageLinks: getPageLinks,
    filterLinks: filterLinks,
    renderAutocomplete: renderAutocomplete
  };
})();
