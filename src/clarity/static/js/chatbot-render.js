/* ==========================================================================
   Clarity -- Chatbot Render Layer
   Markdown-to-HTML, message elements, history rendering, rate/limit UI.
   Pure DOM output; no localStorage, no network.
   ========================================================================== */

(function () {
  'use strict';

  var Clarity = window.Clarity = window.Clarity || {};
  var Chatbot = Clarity.Chatbot = Clarity.Chatbot || {};

  /* --- Lightweight Markdown --> HTML --- */

  function mdToHtml(md) {
    /* Preserve a small whitelist of inline HTML tags the model may
       emit directly. Translate them to sentinels BEFORE escaping so
       the < and > do not get turned into &lt;/&gt;, then substitute
       the real tags back at the end of the pipeline. */
    var html = md
      .replace(/<br\s*\/?>/gi, '\x01BR\x01')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    var codeBlocks = [];
    /* Support both backtick (```) and tilde (~~~) fenced code blocks.
       The backreference \1 ensures the closing fence matches the
       opening one so ```foo~~~ is not treated as a block. Accept
       optional \r before the first \n for CRLF-emitting models. */
    html = html.replace(/(```|~~~)(\w*)\r?\n([\s\S]*?)\1/g, function (_, fence, lang, code) {
      var idx = codeBlocks.length;
      codeBlocks.push('<pre><code>' + code.trim() + '</code></pre>');
      return '\x00CODEBLOCK' + idx + '\x00';
    });

    /* Inline code: extract to sentinels BEFORE running the bold /
       italic / underscore passes so identifiers like
       `html_theme_options["default_theme"]` are not eaten by the
       emphasis rules (every pair of underscores inside code was being
       turned into <em>, stripping the underscore pairs and corrupting
       the identifier). The restore pass at the end of the function
       swaps the sentinels back to real <code>...</code> spans.
       `[^`\n]` also restricts inline code to a single line so stray
       backticks do not swallow paragraph breaks. */
    var inlineCodes = [];
    html = html.replace(/`([^`\n]+)`/g, function (_, code) {
      var idx = inlineCodes.length;
      inlineCodes.push('<code>' + code + '</code>');
      return '\x02INLINECODE' + idx + '\x02';
    });

    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    html = html.replace(/^[\-\*]{3,}\s*$/gm, '\x00HR\x00');

    var lines = html.split('\n');
    var out = [];
    var listType = null;
    var inTable = false;
    var tableRows = [];

    function closeList() {
      if (listType) { out.push('</' + listType + '>'); listType = null; }
    }

    function flushTable() {
      if (!tableRows.length) { inTable = false; return; }
      var t = '<table>';
      t += '<thead><tr>';
      for (var c = 0; c < tableRows[0].length; c++) {
        t += '<th>' + tableRows[0][c] + '</th>';
      }
      t += '</tr></thead>';
      if (tableRows.length > 1) {
        t += '<tbody>';
        for (var r = 1; r < tableRows.length; r++) {
          t += '<tr>';
          for (var c2 = 0; c2 < tableRows[r].length; c2++) {
            t += '<td>' + tableRows[r][c2] + '</td>';
          }
          t += '</tr>';
        }
        t += '</tbody>';
      }
      t += '</table>';
      out.push(t);
      tableRows = [];
      inTable = false;
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var trimmed = line.trim();

      if (trimmed === '\x00HR\x00') {
        closeList();
        if (inTable) flushTable();
        out.push('<hr>');
        continue;
      }

      var cbMatch = trimmed.match(/^\x00CODEBLOCK(\d+)\x00$/);
      if (cbMatch) {
        closeList();
        if (inTable) flushTable();
        out.push(codeBlocks[parseInt(cbMatch[1], 10)]);
        continue;
      }

      if (trimmed.indexOf('|') === 0 && trimmed.lastIndexOf('|') === trimmed.length - 1) {
        closeList();
        if (/^\|[\s\-:]+\|$/.test(trimmed)) continue;
        var cells = trimmed.slice(1, -1).split('|');
        for (var c = 0; c < cells.length; c++) cells[c] = cells[c].trim();
        tableRows.push(cells);
        inTable = true;
        continue;
      }

      if (inTable) flushTable();

      var h6 = trimmed.match(/^#{6}\s+(.+)$/);
      var h5 = !h6 && trimmed.match(/^#{5}\s+(.+)$/);
      var h4 = !h5 && !h6 && trimmed.match(/^#{4}\s+(.+)$/);
      var h3 = !h4 && !h5 && !h6 && trimmed.match(/^#{3}\s+(.+)$/);
      var h2 = !h3 && !h4 && !h5 && !h6 && trimmed.match(/^#{2}\s+(.+)$/);
      var h1 = !h2 && !h3 && !h4 && !h5 && !h6 && trimmed.match(/^#{1}\s+(.+)$/);

      if (h1) { closeList(); out.push('<h4>' + h1[1] + '</h4>'); continue; }
      if (h2) { closeList(); out.push('<h5>' + h2[1] + '</h5>'); continue; }
      if (h3) { closeList(); out.push('<h6>' + h3[1] + '</h6>'); continue; }
      if (h4 || h5 || h6) {
        closeList();
        var hText = (h4 && h4[1]) || (h5 && h5[1]) || (h6 && h6[1]);
        out.push('<h6>' + hText + '</h6>');
        continue;
      }

      var listMatch = trimmed.match(/^[\-\*]\s+(.*)/);
      if (listMatch) {
        if (listType === 'ol') closeList();
        if (!listType) { out.push('<ul>'); listType = 'ul'; }
        out.push('<li>' + listMatch[1] + '</li>');
        continue;
      }

      var olMatch = trimmed.match(/^\d+\.\s+(.*)/);
      if (olMatch) {
        if (listType === 'ul') closeList();
        if (!listType) { out.push('<ol>'); listType = 'ol'; }
        out.push('<li>' + olMatch[1] + '</li>');
        continue;
      }

      closeList();

      if (trimmed === '') continue;

      out.push('<p>' + trimmed + '</p>');
    }

    closeList();
    if (inTable) flushTable();

    var result = out.join('\n');
    /* Restore inline code spans first so the sentinel digits are not
       matched by the <br> restore below. */
    result = result.replace(/\x02INLINECODE(\d+)\x02/g, function (_, idx) {
      return inlineCodes[parseInt(idx, 10)];
    });
    /* Restore whitelisted inline HTML tags. */
    result = result.replace(/\x01BR\x01/g, '<br>');
    return result;
  }

  /* --- Message rendering --- */

  function appendMessage(container, role, text, extraClass, label) {
    var div = document.createElement('div');
    div.className = 'chatbot-msg chatbot-msg-' + role;
    if (extraClass) div.className += ' ' + extraClass;

    if (!label) label = role === 'user' ? 'you' : 'assistant';
    var details = document.createElement('details');
    details.open = true;
    var summary = document.createElement('summary');
    summary.className = 'chatbot-msg-toggle';
    summary.textContent = label;
    details.appendChild(summary);

    var content = document.createElement('div');
    content.className = 'chatbot-msg-content';
    if (role === 'assistant' && !extraClass) {
      content.innerHTML = mdToHtml(text);
    } else {
      content.textContent = text;
    }
    details.appendChild(content);

    div.appendChild(details);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function renderHistory(container, history, assistantLabel) {
    container.innerHTML = '';
    for (var i = 0; i < history.length; i++) {
      var msg = history[i];
      if (msg.reasoning && msg.role === 'assistant') {
        var rDiv = document.createElement('div');
        rDiv.className = 'chatbot-msg chatbot-msg-reasoning';
        rDiv.innerHTML = '<details open><summary class="chatbot-thinking-label">reasoning</summary>'
          + '<div class="chatbot-reasoning-text">' + msg.reasoning.replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</div>'
          + '</details>';
        container.appendChild(rDiv);
      }
      var lbl = msg.role === 'user' ? 'you' : assistantLabel;
      appendMessage(container, msg.role, msg.content, null, lbl);
    }
  }

  /* --- Rate/limit UI --- */

  function formatRateInfo(todayCount, activity, keyInfo) {
    var parts = [];
    parts.push(todayCount + ' req today');
    if (activity !== null && activity && activity.requests > 0) {
      parts.push(activity.requests + ' last 30d');
    }
    if (keyInfo) {
      if (keyInfo.limit != null && keyInfo.limit_remaining != null) {
        parts.push('remaining: $' + keyInfo.limit_remaining.toFixed(4));
      }
      if (keyInfo.is_free_tier) {
        parts.push('free tier');
      } else if (keyInfo.usage_daily != null) {
        parts.push('today: $' + keyInfo.usage_daily.toFixed(4));
      }
    }
    return parts.join(' \u00b7 ');
  }

  function updateWarning(warningEl, todayCount, keyInfo) {
    if (!warningEl) return;
    var limitHit = false;
    var nearLimit = false;

    if (keyInfo && keyInfo.limit != null && keyInfo.limit_remaining != null) {
      if (keyInfo.limit_remaining <= 0) limitHit = true;
      else if (keyInfo.limit_remaining < keyInfo.limit * 0.1) nearLimit = true;
    }

    if (keyInfo && keyInfo.is_free_tier) {
      var dailyCap = (keyInfo.limit != null && keyInfo.limit >= 10) ? 1000 : 50;
      if (todayCount >= dailyCap) limitHit = true;
      else if (todayCount >= dailyCap * 0.8) nearLimit = true;
    }

    if (limitHit) {
      warningEl.hidden = false;
      warningEl.className = 'chatbot-limit-warning limit-reached';
      warningEl.textContent = '\u25b2 Rate limit reached (' + todayCount + ' requests today). Requests may fail until the limit resets.';
    } else if (nearLimit) {
      warningEl.hidden = false;
      warningEl.className = 'chatbot-limit-warning';
      warningEl.textContent = '\u25b2 Approaching rate limit: ' + todayCount + ' requests used today.';
    } else {
      warningEl.hidden = true;
      warningEl.className = 'chatbot-limit-warning';
    }
  }

  function updateRateDisplay(el, warningEl, apiKey, mgmtKey, todayCount, api) {
    if (!el || !apiKey) return;
    el.textContent = '...';

    var keyInfo = null;
    var activity = null;
    var done = 0;

    function finish() {
      done++;
      if (done < 2) return;
      el.textContent = formatRateInfo(todayCount, activity, keyInfo);
      updateWarning(warningEl, todayCount, keyInfo);
    }

    api.fetchKeyInfo(apiKey, function (_, info) {
      keyInfo = info;
      finish();
    });

    api.fetchActivity(mgmtKey, function (err, data) {
      if (!err) activity = data;
      finish();
    });
  }

  /* --- API key form state --- */

  function showApiKeyForm(apikeyForm, messagesEl, form) {
    apikeyForm.classList.remove('has-key');
    messagesEl.style.display = 'none';
    form.style.display = 'none';
  }

  function hideApiKeyForm(apikeyForm, messagesEl, form) {
    apikeyForm.classList.add('has-key');
    messagesEl.style.display = '';
    form.style.display = '';
  }

  Chatbot.render = {
    mdToHtml: mdToHtml,
    appendMessage: appendMessage,
    renderHistory: renderHistory,
    formatRateInfo: formatRateInfo,
    updateWarning: updateWarning,
    updateRateDisplay: updateRateDisplay,
    showApiKeyForm: showApiKeyForm,
    hideApiKeyForm: hideApiKeyForm
  };
})();
