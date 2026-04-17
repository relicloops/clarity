/* ==========================================================================
   Clarity -- Enhanced Search Results
   Overrides Sphinx's default search output to show per-match line/column
   positions grouped by file. Each match links to the nearest heading
   anchor with ?highlight= so the existing highlighter fires.

   Supports plain text (default) and optional regex via a toggle.
   Auto-scans pages when <= 20 results; shows a "Show positions" button
   per file when > 20.
   ========================================================================== */

(function () {
  'use strict';

  var AUTO_SCAN_THRESHOLD = 20;
  var MATCHES_PER_FILE_DEFAULT = 10;
  var CONTEXT_CHARS = 60;
  var useRegex = false;

  function whenReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  whenReady(function () {
    /* Sphinx's Search object is global. We need to wait for it AND for
       the search page to be the active page. On non-search pages this
       script is a no-op. */
    if (typeof Search === 'undefined') return;

    var resultsContainer = document.querySelector('[role="main"]');
    if (!resultsContainer) return;

    /* Only activate on the search page (Sphinx renders the search
       form into [role=main] and sets a specific title). */
    var searchInput = document.getElementById('search-input') ||
                      document.querySelector('input[name="q"]');
    if (!document.querySelector('.search')) {
      /* Not on the search results page — check for #search-results
         which Sphinx creates on the search page. */
      if (!document.getElementById('search-results')) return;
    }

    /* --- Regex toggle --- */

    var regexToggle = document.createElement('label');
    regexToggle.className = 'clarity-search-regex-toggle';
    regexToggle.innerHTML = '<input type="checkbox"> /regex/';
    var regexCheckbox = regexToggle.querySelector('input');
    regexCheckbox.addEventListener('change', function () {
      useRegex = regexCheckbox.checked;
      regexToggle.classList.toggle('active', useRegex);
    });

    /* Insert the regex toggle next to the search input on the search
       results page. */
    var searchForm = document.querySelector('form[action]') ||
                     (searchInput && searchInput.closest('form'));
    if (searchForm) {
      searchForm.style.display = 'inline-flex';
      searchForm.style.alignItems = 'center';
      searchForm.parentNode.insertBefore(regexToggle, searchForm.nextSibling);
    }

    /* --- Intercept Sphinx search results --- */

    /* Sphinx's Search.query() eventually populates #search-results.
       We use a MutationObserver to detect when Sphinx writes results
       and then enhance them. */
    var searchResults = document.getElementById('search-results');
    if (!searchResults) return;

    var observer = new MutationObserver(function () {
      /* Sphinx populates #search-results incrementally:
         1. A <p> status line ("Searching...", then "Search finished, found N pages...")
         2. A <ul class="search"> with <li> items added one by one.
         Wait until the status says "Search finished" so we process
         the COMPLETE result set, not just the first page. */
      var statusP = searchResults.querySelector('p');
      if (!statusP) return;
      var statusText = statusP.textContent || '';
      if (statusText.indexOf('Search finished') === -1 &&
          statusText.indexOf('search did not return') === -1) return;

      observer.disconnect();

      var resultList = searchResults.querySelector('ul.search');
      var searchTerm = getSearchTerm();
      if (!searchTerm) return;

      var items = resultList ? resultList.querySelectorAll('li') : [];
      if (!items.length) return;

      /* Extract file URLs from Sphinx's result links. */
      var fileEntries = [];
      for (var i = 0; i < items.length; i++) {
        var link = items[i].querySelector('a');
        if (!link) continue;
        var href = link.getAttribute('href');
        if (!href) continue;
        var cleanHref = href.split('?')[0].split('#')[0];
        fileEntries.push({
          title: link.textContent,
          href: cleanHref,
          originalHref: href
        });
      }

      if (!fileEntries.length) return;

      /* Hide Sphinx's default results immediately and show a
         full-width searching overlay with the rainbow spinner. */
      resultList.style.display = 'none';
      if (statusP) statusP.style.display = 'none';

      var overlay = createSearchingOverlay(fileEntries.length, searchTerm);
      searchResults.appendChild(overlay);

      /* Build the enhanced results container (hidden until the
         spinner minimum time elapses). */
      var container = document.createElement('div');
      container.className = 'clarity-search-results';
      container.style.display = 'none';

      var summary = document.createElement('div');
      summary.className = 'clarity-search-summary';
      summary.textContent = fileEntries.length + ' page' +
        (fileEntries.length !== 1 ? 's' : '') + ' match "' + searchTerm + '"';
      container.appendChild(summary);

      searchResults.appendChild(container);

      var overlayStart = Date.now();
      var MIN_OVERLAY_MS = 3000;

      function revealResults() {
        var elapsed = Date.now() - overlayStart;
        var remaining = Math.max(0, MIN_OVERLAY_MS - elapsed);
        setTimeout(function () {
          overlay.remove();
          container.style.display = '';
        }, remaining);
      }

      if (fileEntries.length <= AUTO_SCAN_THRESHOLD) {
        scanAllFiles(fileEntries, searchTerm, container, revealResults);
      } else {
        renderFileListWithButtons(fileEntries, searchTerm, container);
        revealResults();
      }
    });

    observer.observe(searchResults, { childList: true, subtree: true });
  });

  /* --- Get the search term from the URL or input --- */

  function getSearchTerm() {
    var params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  }

  /* --- Scan all files (auto mode, <= threshold) --- */

  function scanAllFiles(fileEntries, term, container, onDone) {
    var promises = fileEntries.map(function (entry) {
      return fetchAndScan(entry.href, term).then(function (matches) {
        return { entry: entry, matches: matches };
      });
    });

    Promise.all(promises).then(function (results) {
      var totalMatches = 0;
      for (var i = 0; i < results.length; i++) {
        totalMatches += results[i].matches.length;
        renderFileGroup(results[i].entry, results[i].matches, term, container);
      }
      var summary = container.querySelector('.clarity-search-summary');
      if (summary) {
        summary.textContent = results.length + ' page' +
          (results.length !== 1 ? 's' : '') + ', ' +
          totalMatches + ' match' + (totalMatches !== 1 ? 'es' : '') +
          ' for "' + term + '"';
      }
      if (onDone) onDone();
    });
  }

  /* --- Searching overlay with rainbow spinner --- */

  function createSearchingOverlay(pageCount, term) {
    var overlay = document.createElement('div');
    overlay.className = 'clarity-search-overlay';

    var icon = document.createElement('div');
    icon.className = 'clarity-search-overlay-icon';
    icon.textContent = '\u2047';  /* ⁇ double question mark */
    overlay.appendChild(icon);

    var label = document.createElement('div');
    label.className = 'clarity-search-overlay-label';
    label.textContent = 'Searching ' + pageCount + ' page' +
      (pageCount !== 1 ? 's' : '') + ' for "' + term + '"';
    overlay.appendChild(label);

    return overlay;
  }

  /* --- File list with expand buttons (> threshold) --- */

  function renderFileListWithButtons(fileEntries, term, container) {
    for (var i = 0; i < fileEntries.length; i++) {
      (function (entry) {
        var group = document.createElement('div');
        group.className = 'clarity-search-file';

        var header = document.createElement('div');
        header.className = 'clarity-search-file-header';

        var nameEl = document.createElement('span');
        nameEl.className = 'clarity-search-file-name';
        nameEl.textContent = extractFileName(entry.href);
        header.appendChild(nameEl);

        var btn = document.createElement('button');
        btn.className = 'clarity-search-expand-btn';
        btn.type = 'button';
        btn.textContent = 'Show positions';
        header.appendChild(btn);

        group.appendChild(header);
        container.appendChild(group);

        btn.addEventListener('click', function () {
          btn.disabled = true;
          btn.textContent = 'Scanning...';
          fetchAndScan(entry.href, term).then(function (matches) {
            btn.remove();
            var countEl = document.createElement('span');
            countEl.className = 'clarity-search-file-count';
            countEl.textContent = '[' + matches.length + ' match' +
              (matches.length !== 1 ? 'es' : '') + ']';
            header.appendChild(countEl);
            renderMatches(matches, term, entry.href, group);
          });
        });
      })(fileEntries[i]);
    }
  }

  /* --- Fetch a page and scan for term occurrences --- */

  function fetchAndScan(href, term) {
    return fetch(href)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var content = doc.querySelector('.page-content') ||
                      doc.querySelector('[role="main"]') ||
                      doc.body;
        var text = content ? (content.innerText || content.textContent || '') : '';
        var headings = extractHeadings(doc);
        return findMatches(text, term, headings, href);
      })
      .catch(function () {
        return [];
      });
  }

  /* --- Find all matches with line/column and nearest heading --- */

  function findMatches(text, term, headings, href) {
    var lines = text.split('\n');
    var matches = [];
    var charOffset = 0;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var positions = findInLine(line, term);

      for (var j = 0; j < positions.length; j++) {
        var col = positions[j];
        var absOffset = charOffset + col;
        var anchor = findNearestHeading(headings, i, absOffset);
        matches.push({
          line: i + 1,
          col: col + 1,
          context: extractContext(line, col, term.length),
          anchor: anchor,
          href: href
        });
      }

      charOffset += line.length + 1;
    }

    return matches;
  }

  /* --- Find term positions in a single line --- */

  function findInLine(line, term) {
    var positions = [];
    if (useRegex) {
      try {
        var re = new RegExp(term, 'gi');
        var m;
        while ((m = re.exec(line)) !== null) {
          positions.push(m.index);
          if (m[0].length === 0) re.lastIndex++;
        }
      } catch (_) {
        /* Invalid regex -- fall through to plain text. */
        return findInLinePlain(line, term);
      }
    } else {
      return findInLinePlain(line, term);
    }
    return positions;
  }

  function findInLinePlain(line, term) {
    var positions = [];
    var lower = line.toLowerCase();
    var target = term.toLowerCase();
    var idx = lower.indexOf(target);
    while (idx !== -1) {
      positions.push(idx);
      idx = lower.indexOf(target, idx + 1);
    }
    return positions;
  }

  /* --- Extract headings with their text offsets --- */

  function extractHeadings(doc) {
    var headings = [];
    var content = doc.querySelector('.page-content') ||
                  doc.querySelector('[role="main"]') ||
                  doc.body;
    if (!content) return headings;

    var els = content.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
    /* Also check for section wrappers with IDs. */
    var sections = content.querySelectorAll('section[id]');

    for (var i = 0; i < els.length; i++) {
      headings.push({
        id: els[i].id,
        text: els[i].textContent,
        offsetTop: approximateLineOffset(content, els[i])
      });
    }

    for (var j = 0; j < sections.length; j++) {
      var firstH = sections[j].querySelector('h1, h2, h3, h4, h5, h6');
      if (firstH && !firstH.id) {
        headings.push({
          id: sections[j].id,
          text: firstH ? firstH.textContent : sections[j].id,
          offsetTop: approximateLineOffset(content, sections[j])
        });
      }
    }

    return headings;
  }

  /* Rough line offset of an element within the content text. */
  function approximateLineOffset(content, el) {
    var allText = content.innerText || content.textContent || '';
    var elText = el.textContent || '';
    var idx = allText.indexOf(elText);
    if (idx === -1) return 0;
    var before = allText.substring(0, idx);
    return before.split('\n').length;
  }

  /* --- Find nearest heading above a line number --- */

  function findNearestHeading(headings, lineNum, absOffset) {
    var best = null;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].offsetTop <= lineNum + 1) {
        best = headings[i];
      }
    }
    return best ? best.id : '';
  }

  /* --- Extract context snippet around a match --- */

  function extractContext(line, col, termLen) {
    var half = Math.floor((CONTEXT_CHARS - termLen) / 2);
    var start = Math.max(0, col - half);
    var end = Math.min(line.length, col + termLen + half);
    var prefix = start > 0 ? '...' : '';
    var suffix = end < line.length ? '...' : '';
    return {
      before: prefix + line.substring(start, col),
      match: line.substring(col, col + termLen),
      after: line.substring(col + termLen, end) + suffix
    };
  }

  /* --- Render a file group with matches --- */

  function renderFileGroup(entry, matches, term, container) {
    var group = document.createElement('div');
    group.className = 'clarity-search-file';

    var header = document.createElement('div');
    header.className = 'clarity-search-file-header';

    var nameEl = document.createElement('span');
    nameEl.className = 'clarity-search-file-name';
    nameEl.textContent = extractFileName(entry.href);
    header.appendChild(nameEl);

    var countEl = document.createElement('span');
    countEl.className = 'clarity-search-file-count';
    countEl.textContent = '[' + matches.length + ' match' +
      (matches.length !== 1 ? 'es' : '') + ']';
    header.appendChild(countEl);

    group.appendChild(header);
    renderMatches(matches, term, entry.href, group);
    container.appendChild(group);
  }

  /* --- Render match rows (capped + "show all" toggle) --- */

  function renderMatches(matches, term, href, group) {
    var limit = MATCHES_PER_FILE_DEFAULT;
    var showAll = matches.length <= limit;

    for (var i = 0; i < matches.length; i++) {
      var row = createMatchRow(matches[i], term);
      if (!showAll && i >= limit) row.style.display = 'none';
      row.setAttribute('data-match-idx', i);
      group.appendChild(row);
    }

    if (!showAll) {
      var moreBtn = document.createElement('button');
      moreBtn.className = 'clarity-search-more';
      moreBtn.type = 'button';
      moreBtn.textContent = '+ ' + (matches.length - limit) + ' more (show all)';
      group.appendChild(moreBtn);

      moreBtn.addEventListener('click', function () {
        var hidden = group.querySelectorAll('[data-match-idx]');
        for (var j = 0; j < hidden.length; j++) {
          hidden[j].style.display = '';
        }
        moreBtn.remove();
      });
    }
  }

  /* --- Create a single match row --- */

  function createMatchRow(match, term) {
    var a = document.createElement('a');
    a.className = 'clarity-search-match';
    var anchor = match.anchor ? '#' + match.anchor : '';
    a.href = match.href + '?highlight=' + encodeURIComponent(term) + anchor;

    var pos = document.createElement('span');
    pos.className = 'clarity-search-pos';
    pos.textContent = '[' + match.line + ':' + match.col + ']';
    a.appendChild(pos);

    var ctx = document.createElement('span');
    ctx.className = 'clarity-search-context';
    ctx.appendChild(document.createTextNode(match.context.before));
    var mark = document.createElement('mark');
    mark.textContent = match.context.match;
    ctx.appendChild(mark);
    ctx.appendChild(document.createTextNode(match.context.after));
    a.appendChild(ctx);

    var arrow = document.createElement('span');
    arrow.className = 'clarity-search-arrow';
    arrow.textContent = '\u2192';
    a.appendChild(arrow);

    return a;
  }

  /* --- Extract filename from URL --- */

  function extractFileName(href) {
    var parts = href.split('/');
    var last = parts[parts.length - 1] || parts[parts.length - 2];
    return last.replace('.html', '.rst').replace('.htm', '.rst');
  }

})();
