/* ==========================================================================
   Clarity -- Mermaid Source Capture

   Snapshots the textContent of every <pre class="mermaid"> element
   BEFORE sphinxcontrib-mermaid's client-side render replaces it with
   an inline SVG. The source is stashed on `data-src` so clarity.js
   can restore + re-run mermaid later (e.g. when the reader bumps
   text size and diagrams need to reflow at the new font metrics).

   Uses a MutationObserver wired as early as possible so the capture
   wins the race against mermaid's DOMContentLoaded auto-run,
   regardless of script load order. Disconnects once the DOM is fully
   parsed to avoid running forever.

   Must be loaded synchronously from <head> (no async / no defer).
   ========================================================================== */

(function () {
  'use strict';

  if (typeof MutationObserver === 'undefined') return;

  function capture(el) {
    if (!el || !el.matches) return;
    if (!el.matches('pre.mermaid') || el.dataset.src) return;
    var src = (el.textContent || '').trim();
    if (src) el.dataset.src = src;
  }

  var obs = new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var added = records[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var n = added[j];
        if (n.nodeType !== 1) continue;
        capture(n);
        if (n.querySelectorAll) {
          var subs = n.querySelectorAll('pre.mermaid');
          for (var k = 0; k < subs.length; k++) capture(subs[k]);
        }
      }
    }
  });

  obs.observe(document, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', function () {
    /* Final sweep in case any pre.mermaid was added before the
       observer wired up (edge case with certain async parsers). */
    var remaining = document.querySelectorAll('pre.mermaid');
    for (var i = 0; i < remaining.length; i++) capture(remaining[i]);
    obs.disconnect();
  });
})();
