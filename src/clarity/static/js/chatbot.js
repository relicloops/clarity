/* ==========================================================================
   Clarity -- Page-Aware Chatbot (boot/orchestration)
   Layers live in sibling modules and attach to window.Clarity.Chatbot:
     chatbot-storage.js   -- settings, localStorage, XOR keys, history
     chatbot-api.js       -- OpenRouter requests, streaming
     chatbot-render.js    -- markdown, message DOM, rate UI
     chatbot-commands.js  -- slash command parser + autocomplete helpers
   This file only wires DOM events and drives the stream state machine.
   ========================================================================== */

(function () {
  'use strict';

  var Chatbot = window.Clarity && window.Clarity.Chatbot;
  if (!Chatbot || !Chatbot.storage || !Chatbot.api || !Chatbot.render || !Chatbot.commands) {
    console.warn('[chatbot] required modules missing; boot aborted');
    return;
  }

  var storage = Chatbot.storage;
  var api = Chatbot.api;
  var render = Chatbot.render;
  var commands = Chatbot.commands;

  var settings = storage.loadSettings();

  function initChatbot() {
    var chatbot = document.getElementById('clarity-chatbot');
    var toggle = document.getElementById('chatbot-toggle');
    var panel = document.getElementById('chatbot-panel');
    if (!toggle || !panel) return;

    var projectName = (chatbot && chatbot.getAttribute('data-project')) || 'assistant';

    var messagesEl = document.getElementById('chatbot-messages');
    var chatForm = document.getElementById('chatbot-form');
    var chatInput = document.getElementById('chatbot-input');
    var closeBtn = document.getElementById('chatbot-close');
    var minimizeBtn = document.getElementById('chatbot-minimize');
    var purgeBtn = document.getElementById('chatbot-purge');
    var apikeyForm = document.getElementById('chatbot-apikey-form');
    var apikeyInput = document.getElementById('chatbot-apikey-input');
    var mgmtInput = document.getElementById('chatbot-mgmt-input');
    var apikeySave = document.getElementById('chatbot-apikey-save');
    var rateInfo = document.getElementById('chatbot-rate-info');
    var infoBtn = document.getElementById('chatbot-info-btn');
    var infoTip = document.getElementById('chatbot-info-tip');
    var limitWarning = document.getElementById('chatbot-limit-warning');
    var resizeHandle = document.getElementById('chatbot-resize');
    var panelHeader = panel.querySelector('.chatbot-header');
    var settingsBtn = document.getElementById('chatbot-settings-btn');
    var settingsPanel = document.getElementById('chatbot-settings');
    var settingsSave = document.getElementById('chatbot-settings-save');
    var settingsReset = document.getElementById('chatbot-settings-reset');
    var settingsCancel = document.getElementById('chatbot-settings-cancel');
    var digestBtn = document.getElementById('chatbot-digest-btn');
    var ingestBtn = document.getElementById('chatbot-ingest-btn');
    var digestModal = document.getElementById('chatbot-digest-modal');
    var digestFilenameInput = document.getElementById('chatbot-digest-filename');
    var digestSave = document.getElementById('chatbot-digest-save');
    var digestCancel = document.getElementById('chatbot-digest-cancel');
    var digestStatus = document.getElementById('chatbot-digest-status');
    var ingestModal = document.getElementById('chatbot-ingest-modal');
    var ingestFileInput = document.getElementById('chatbot-ingest-input');
    var ingestLoad = document.getElementById('chatbot-ingest-load');
    var ingestCancel = document.getElementById('chatbot-ingest-cancel');
    var ingestStatus = document.getElementById('chatbot-ingest-status');
    var purgeDigest = document.getElementById('chatbot-purge-digest');

    /* --- Geometry restore --- */

    function applyGeometry(geo) {
      if (!geo) return;
      var maxW = window.innerWidth - 20;
      var maxH = window.innerHeight - 20;
      var w = Math.min(Math.max(geo.w || 380, 280), maxW);
      var h = Math.min(Math.max(geo.h || 400, 200), maxH);
      var x = Math.min(Math.max(geo.x != null ? geo.x : 16, 0), window.innerWidth - w);
      var y = Math.min(Math.max(geo.y != null ? geo.y : 60, 0), window.innerHeight - 60);
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = 'auto';
      panel.style.width = w + 'px';
      panel.style.height = h + 'px';
      panel.style.maxHeight = 'none';
    }

    var savedGeo = storage.loadGeometry();
    if (savedGeo) applyGeometry(savedGeo);

    /* --- Drag via header --- */

    (function initDrag() {
      if (!panelHeader) return;
      var dragging = false;
      var startX, startY, startLeft, startTop;

      panelHeader.addEventListener('mousedown', function (e) {
        if (e.target.closest('button, input, a')) return;
        dragging = true;
        var rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        panel.style.left = startLeft + 'px';
        panel.style.top = startTop + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      });

      document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        var newLeft = Math.max(0, Math.min(startLeft + dx, window.innerWidth - panel.offsetWidth));
        var newTop = Math.max(0, Math.min(startTop + dy, window.innerHeight - 40));
        panel.style.left = newLeft + 'px';
        panel.style.top = newTop + 'px';
      });

      document.addEventListener('mouseup', function () {
        if (!dragging) return;
        dragging = false;
        document.body.style.userSelect = '';
        var rect = panel.getBoundingClientRect();
        storage.saveGeometry({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
      });
    })();

    /* --- Resize via bottom-right handle --- */

    (function initResize() {
      if (!resizeHandle) return;
      var resizing = false;
      var startX, startY, startW, startH;

      resizeHandle.addEventListener('mousedown', function (e) {
        /* Resize is a no-op while minimized; only dragging the header
           should move the pill around in that state. */
        if (panel.classList.contains('minimized')) return;
        resizing = true;
        var rect = panel.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startW = rect.width;
        startH = rect.height;
        panel.style.left = rect.left + 'px';
        panel.style.top = rect.top + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.maxHeight = 'none';
        document.body.style.userSelect = '';
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('mousemove', function (e) {
        if (!resizing) return;
        var rect = panel.getBoundingClientRect();
        var newW = Math.max(280, Math.min(startW + (e.clientX - startX), window.innerWidth - rect.left - 10));
        var newH = Math.max(200, Math.min(startH + (e.clientY - startY), window.innerHeight - rect.top - 10));
        panel.style.width = newW + 'px';
        panel.style.height = newH + 'px';
      });

      document.addEventListener('mouseup', function () {
        if (!resizing) return;
        resizing = false;
        var rect = panel.getBoundingClientRect();
        storage.saveGeometry({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
      });
    })();

    /* --- Info tooltip --- */
    if (infoBtn && infoTip) {
      infoBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        infoTip.classList.toggle('visible');
      });
      panel.addEventListener('click', function () {
        if (infoTip.classList.contains('visible')) {
          infoTip.classList.remove('visible');
        }
      });
    }

    var pageContent = api.getPageContent(settings.pageTextLimit);
    var history = storage.loadHistory();
    var apiKey = storage.loadKey(storage.keys.KEY);
    var mgmtKey = storage.loadKey(storage.keys.MGMT_KEY);

    function refreshRate() {
      render.updateRateDisplay(
        rateInfo, limitWarning, apiKey, mgmtKey,
        storage.getLocalRequestCount().count, api
      );
    }

    /* Periodic refresh so the 30-day activity total and remaining
       credit stay current while the reader leaves the panel open. */
    setInterval(function () {
      if (panel.hidden || !apiKey) return;
      refreshRate();
    }, 60000);

    var savedState = storage.loadState();

    if (apiKey) {
      render.hideApiKeyForm(apikeyForm, messagesEl, chatForm);
      render.renderHistory(messagesEl, history, projectName);
      refreshRate();
    } else {
      render.showApiKeyForm(apikeyForm, messagesEl, chatForm);
    }

    if (savedState === 'open') {
      panel.hidden = false;
      panel.classList.remove('minimized');
      messagesEl.scrollTop = messagesEl.scrollHeight;
      if (apiKey) chatInput.focus();
    } else if (savedState === 'minimized') {
      panel.hidden = false;
      /* Snapshot the geometry that loadGeometry() just applied so the
         reader's resized dimensions come back when un-minimized. */
      panel._savedHeight = panel.style.height;
      panel._savedMaxHeight = panel.style.maxHeight;
      panel.style.height = '';
      panel.style.maxHeight = '';
      panel.classList.add('minimized');
      setMinimizeButtonState(true);
    }

    /* --- Minimize/restore button glyph + labels --- */

    function setMinimizeButtonState(isMinimized) {
      if (isMinimized) {
        minimizeBtn.textContent = '\u25A1';
        minimizeBtn.setAttribute('aria-label', 'Restore');
        minimizeBtn.setAttribute('title',
          'Restore: expand chatbot panel to its previous size');
      } else {
        minimizeBtn.textContent = '\u2500';
        minimizeBtn.setAttribute('aria-label', 'Minimize');
        minimizeBtn.setAttribute('title',
          'Minimize: collapse to header bar, keep chat active');
      }
    }

    /* --- Header controls --- */

    toggle.addEventListener('click', function () {
      panel.hidden = false;
      panel.classList.remove('minimized');
      setMinimizeButtonState(false);
      storage.saveState('open');
      if (apiKey) chatInput.focus();
      else apikeyInput.focus();
    });

    closeBtn.addEventListener('click', function () {
      panel.hidden = true;
      /* Reset inline geometry so the next open starts at CSS defaults
         instead of a stale drag/resize position. */
      panel.style.width = '';
      panel.style.height = '';
      panel.style.top = '';
      panel.style.left = '';
      panel.style.right = '';
      panel.style.maxHeight = '';
      panel._savedHeight = '';
      panel._savedMaxHeight = '';
      panel.classList.remove('minimized');
      setMinimizeButtonState(false);
      storage.saveState('closed');
    });

    minimizeBtn.addEventListener('click', function () {
      var willMinimize = !panel.classList.contains('minimized');

      if (willMinimize) {
        /* Stash the current inline height so the CSS `height:auto`
           rule under .minimized can collapse the panel. Without this
           the inline style set by drag/resize wins. */
        panel._savedHeight = panel.style.height;
        panel._savedMaxHeight = panel.style.maxHeight;
        panel.style.height = '';
        panel.style.maxHeight = '';
      } else {
        if (panel._savedHeight) panel.style.height = panel._savedHeight;
        if (panel._savedMaxHeight) panel.style.maxHeight = panel._savedMaxHeight;
      }

      var isMinimized = panel.classList.toggle('minimized');
      setMinimizeButtonState(isMinimized);
      storage.saveState(isMinimized ? 'minimized' : 'open');
      if (!isMinimized && apiKey) {
        messagesEl.scrollTop = messagesEl.scrollHeight;
        chatInput.focus();
      }
    });

    /* --- Purge (two-step confirm, optional digest-first) --- */

    var purgeConfirm = document.getElementById('chatbot-purge-confirm');
    var purgeYes = document.getElementById('chatbot-purge-yes');
    var purgeNo = document.getElementById('chatbot-purge-no');

    function doPurge() {
      purgeConfirm.hidden = true;
      storage.purgeAll();
      apiKey = null;
      mgmtKey = null;
      history.length = 0;
      messagesEl.innerHTML = '';
      rateInfo.textContent = '';
      limitWarning.hidden = true;
      render.showApiKeyForm(apikeyForm, messagesEl, chatForm);
      clearField(apikeyInput);
      clearField(mgmtInput);
      mgmtInput.focus();
    }

    purgeBtn.addEventListener('click', function () { purgeConfirm.hidden = false; });
    purgeNo.addEventListener('click', function () { purgeConfirm.hidden = true; });
    purgeYes.addEventListener('click', doPurge);

    /* --- Runtime bridge for digest / ingest ---
       Exposes the live history array to Chatbot.digest and Chatbot.ingest
       so the digest uses the in-memory conversation first (works even
       when consent is declined) and ingest can re-render after import. */

    Chatbot.runtime = {
      getHistory: function () { return history; },
      setHistory: function (arr) {
        history.length = 0;
        for (var i = 0; i < arr.length; i++) history.push(arr[i]);
        storage.saveHistory(history, settings.maxHistory);
        messagesEl.innerHTML = '';
        render.renderHistory(messagesEl, history, projectName);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      },
      getSettings: function () { return settings; }
    };

    /* --- Digest modal --- */

    var digestPendingPurge = false;

    function setDigestStatus(text, cls) {
      if (!digestStatus) return;
      digestStatus.className = 'chatbot-digest-status' + (cls ? ' ' + cls : '');
      digestStatus.textContent = text || '';
    }

    function openDigestModal(prefillName) {
      if (!digestModal) return;
      var hasHist = Chatbot.digest && Chatbot.digest.hasHistory();
      setDigestStatus(
        hasHist ? '' : 'Conversation is empty -- nothing to digest.',
        hasHist ? '' : 'is-error'
      );
      if (digestFilenameInput) {
        digestFilenameInput.value = prefillName ||
          (Chatbot.digest ? Chatbot.digest.defaultFilename() : 'clarity-chat');
      }
      digestModal.hidden = false;
      if (digestFilenameInput) {
        setTimeout(function () { digestFilenameInput.focus(); digestFilenameInput.select(); }, 20);
      }
    }

    function closeDigestModal() {
      if (digestModal) digestModal.hidden = true;
      digestPendingPurge = false;
    }

    if (digestBtn) {
      digestBtn.addEventListener('click', function () { openDigestModal(); });
    }
    if (digestCancel) {
      digestCancel.addEventListener('click', closeDigestModal);
    }
    if (digestSave) {
      digestSave.addEventListener('click', function () {
        if (!Chatbot.digest) {
          setDigestStatus('Digest module missing.', 'is-error');
          return;
        }
        var fmtEl = digestModal.querySelector('input[name="chatbot-digest-format"]:checked');
        var fmt = fmtEl ? fmtEl.value : 'json';
        var name = (digestFilenameInput && digestFilenameInput.value) || '';
        var res = Chatbot.digest.run(fmt, name);
        if (!res.ok) {
          setDigestStatus(
            res.reason === 'empty'
              ? 'Conversation is empty -- nothing to digest.'
              : 'Digest failed (' + res.reason + ').',
            'is-error'
          );
          return;
        }
        setDigestStatus('Saved ' + res.file + ' (' + res.count + ' messages).', 'is-ok');
        var chainPurge = digestPendingPurge;
        setTimeout(function () {
          closeDigestModal();
          if (chainPurge) doPurge();
        }, 400);
      });
    }

    /* Purge-first-digest: open digest modal, chain to purge on save. */
    if (purgeDigest) {
      purgeDigest.addEventListener('click', function () {
        digestPendingPurge = true;
        openDigestModal();
      });
    }

    /* --- Ingest modal --- */

    function setIngestStatus(text, cls) {
      if (!ingestStatus) return;
      ingestStatus.className = 'chatbot-ingest-status' + (cls ? ' ' + cls : '');
      ingestStatus.textContent = text || '';
    }

    function openIngestModal() {
      if (!ingestModal) return;
      setIngestStatus('');
      if (ingestFileInput) ingestFileInput.value = '';
      ingestModal.hidden = false;
    }

    function closeIngestModal() {
      if (ingestModal) ingestModal.hidden = true;
    }

    if (ingestBtn) {
      ingestBtn.addEventListener('click', openIngestModal);
    }
    if (ingestCancel) {
      ingestCancel.addEventListener('click', closeIngestModal);
    }
    if (ingestLoad) {
      ingestLoad.addEventListener('click', function () {
        if (!Chatbot.ingest) {
          setIngestStatus('Ingest module missing.', 'is-error');
          return;
        }
        var file = ingestFileInput && ingestFileInput.files && ingestFileInput.files[0];
        if (!file) {
          setIngestStatus('Pick a .json file first.', 'is-error');
          return;
        }
        var modeEl = ingestModal.querySelector('input[name="chatbot-ingest-mode"]:checked');
        var mode = modeEl ? modeEl.value : 'replace';
        setIngestStatus('Loading...', '');
        Chatbot.ingest.run(file, mode).then(function (res) {
          if (!res.ok) {
            setIngestStatus(res.error || 'Ingest failed.', 'is-error');
            return;
          }
          var parts = [mode === 'append' ? 'Appended' : 'Replaced', res.ingested + ' messages.'];
          if (res.dropped) parts.push(res.dropped + ' dropped.');
          if (res.truncated) parts.push(res.truncated + ' truncated.');
          setIngestStatus(parts.join(' '), 'is-ok');
          refreshRate();
          setTimeout(closeIngestModal, 600);
        }).catch(function (e) {
          setIngestStatus('Ingest failed: ' + (e && e.message ? e.message : String(e)), 'is-error');
        });
      });
    }

    /* --- Settings panel (conf.py overrides) --- */

    function populateSettingsForm() {
      var override = storage.loadSettingsOverride() || {};
      var fields = settingsPanel.querySelectorAll('[data-setting]');
      for (var i = 0; i < fields.length; i++) {
        var key = fields[i].getAttribute('data-setting');
        var overrideVal = override[key];
        fields[i].value = (overrideVal === undefined || overrideVal === null) ? '' : overrideVal;
        /* Show the current effective default as a placeholder so the
           reader knows what they're overriding without looking at
           conf.py. */
        var defVal = settings[key];
        if (fields[i].tagName !== 'SELECT') {
          fields[i].setAttribute('placeholder',
            defVal === undefined || defVal === null || defVal === '' ? '(default)' : String(defVal));
        }
      }
    }

    /* Re-populate `settings` in place so every closure already holding
       a reference sees the fresh values on the next request. */
    function reloadSettings() {
      var fresh = storage.loadSettings();
      for (var k in fresh) settings[k] = fresh[k];
    }

    var settingsHintBar = document.getElementById('chatbot-settings-hint');
    if (settingsPanel && settingsHintBar) {
      /* Event delegation: any descendant with a data-hint attribute
         updates the footer warning bar immediately on mouseover. */
      settingsPanel.addEventListener('mouseover', function (e) {
        var target = e.target.closest('[data-hint]');
        if (!target) return;
        settingsHintBar.textContent = target.getAttribute('data-hint');
      });
      settingsPanel.addEventListener('mouseout', function (e) {
        var related = e.relatedTarget;
        if (related && related.closest && related.closest('[data-hint]')) return;
        settingsHintBar.textContent = '';
      });
      /* Focusing a field (tab navigation) also shows the hint. */
      settingsPanel.addEventListener('focusin', function (e) {
        var target = e.target.closest('[data-hint]');
        if (!target) return;
        settingsHintBar.textContent = target.getAttribute('data-hint');
      });
      settingsPanel.addEventListener('focusout', function () {
        settingsHintBar.textContent = '';
      });
    }

    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', function () {
        /* Make sure the panel body is visible before showing settings. */
        if (panel.classList.contains('minimized')) {
          if (panel._savedHeight) panel.style.height = panel._savedHeight;
          if (panel._savedMaxHeight) panel.style.maxHeight = panel._savedMaxHeight;
          panel.classList.remove('minimized');
          setMinimizeButtonState(false);
          storage.saveState('open');
        }
        var opening = settingsPanel.hidden;
        if (opening) populateSettingsForm();
        settingsPanel.hidden = !opening;
      });

      settingsCancel.addEventListener('click', function () {
        settingsPanel.hidden = true;
      });

      settingsSave.addEventListener('click', function () {
        var fields = settingsPanel.querySelectorAll('[data-setting]');
        var override = {};
        for (var i = 0; i < fields.length; i++) {
          var f = fields[i];
          var key = f.getAttribute('data-setting');
          var raw = (f.value || '').trim();
          if (raw === '') continue;
          var val;
          if (f.type === 'number') {
            val = parseFloat(raw);
            if (isNaN(val)) continue;
          } else {
            val = raw;
          }
          override[key] = val;
        }
        storage.saveSettingsOverride(override);
        reloadSettings();
        settingsPanel.hidden = true;
      });

      settingsReset.addEventListener('click', function () {
        storage.clearSettingsOverride();
        reloadSettings();
        populateSettingsForm();
      });
    }

    /* --- Key input helpers --- */

    function getFieldVal(el) { return (el.textContent || '').trim(); }
    function clearField(el) { el.textContent = ''; }

    var KEY_PATTERN = /^sk-or-v1-[a-f0-9]{64}$/;

    function validateKeyInput(el) {
      var val = getFieldVal(el);
      if (!val) { el.style.borderColor = ''; return false; }
      if (!KEY_PATTERN.test(val)) { el.style.borderColor = '#ff3366'; return false; }
      el.style.borderColor = '';
      return true;
    }

    apikeyInput.addEventListener('input', function () { validateKeyInput(apikeyInput); });
    mgmtInput.addEventListener('input', function () { validateKeyInput(mgmtInput); });

    apikeyInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); apikeySave.click(); }
    });
    mgmtInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); apikeySave.click(); }
    });

    function onPaste(e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text/plain').trim();
      document.execCommand('insertText', false, text);
    }
    apikeyInput.addEventListener('paste', onPaste);
    mgmtInput.addEventListener('paste', onPaste);

    apikeySave.addEventListener('click', function () {
      var keyValid = validateKeyInput(apikeyInput);
      if (!getFieldVal(apikeyInput) || !keyValid) { apikeyInput.focus(); return; }
      var mk = getFieldVal(mgmtInput);
      if (mk && !validateKeyInput(mgmtInput)) { mgmtInput.focus(); return; }
      var key = getFieldVal(apikeyInput);
      storage.saveKey(storage.keys.KEY, key);
      apiKey = key;
      if (mk) {
        storage.saveKey(storage.keys.MGMT_KEY, mk);
        mgmtKey = mk;
      } else {
        storage.safeRemove(storage.keys.MGMT_KEY);
        mgmtKey = null;
      }
      render.hideApiKeyForm(apikeyForm, messagesEl, chatForm);
      refreshRate();
      chatInput.focus();
    });

    /* --- Slash command autocomplete --- */

    var autocompleteEl = document.createElement('div');
    autocompleteEl.className = 'chatbot-autocomplete';
    autocompleteEl.hidden = true;
    chatForm.parentNode.insertBefore(autocompleteEl, chatForm);

    var allLinks = commands.getPageLinks();
    var selectedIdx = -1;

    function updateAutocomplete() {
      var parsed = commands.parseSlashCommand(chatInput.value);
      if (!parsed) { autocompleteEl.hidden = true; return; }
      var matches = commands.filterLinks(allLinks, parsed.query);
      selectedIdx = -1;
      commands.renderAutocomplete(autocompleteEl, matches);
    }

    function selectAutocomplete(idx) {
      var items = autocompleteEl.querySelectorAll('.chatbot-ac-item');
      for (var i = 0; i < items.length; i++) {
        items[i].classList.toggle('active', i === idx);
      }
      if (idx >= 0 && idx < items.length) {
        items[idx].scrollIntoView({ block: 'nearest' });
      }
    }

    function executeGoto(href) {
      autocompleteEl.hidden = true;
      chatInput.value = '';
      window.location.href = href;
    }

    chatInput.addEventListener('input', updateAutocomplete);

    chatInput.addEventListener('keydown', function (e) {
      if (autocompleteEl.hidden) return;
      var items = autocompleteEl.querySelectorAll('.chatbot-ac-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = Math.min(selectedIdx + 1, items.length - 1);
        selectAutocomplete(selectedIdx);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = Math.max(selectedIdx - 1, 0);
        selectAutocomplete(selectedIdx);
      } else if (e.key === 'Enter' && selectedIdx >= 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        var href = items[selectedIdx].getAttribute('data-href');
        var parsed = commands.parseSlashCommand(chatInput.value);
        if (parsed && parsed.cmd === 'read') {
          chatInput.value = '/read ' + href;
          autocompleteEl.hidden = true;
          chatForm.dispatchEvent(new Event('submit'));
        } else {
          executeGoto(href);
        }
      } else if (e.key === 'Escape') {
        autocompleteEl.hidden = true;
      } else if (e.key === 'Tab' && selectedIdx >= 0) {
        e.preventDefault();
        var prefix = chatInput.value.indexOf('/read') === 0 ? '/read ' : '/goto ';
        chatInput.value = prefix + items[selectedIdx].getAttribute('data-href');
      }
    });

    autocompleteEl.addEventListener('click', function (e) {
      var item = e.target.closest('.chatbot-ac-item');
      if (!item) return;
      var href = item.getAttribute('data-href');
      var parsed = commands.parseSlashCommand(chatInput.value);
      if (parsed && parsed.cmd === 'read') {
        chatInput.value = '/read ' + href;
        autocompleteEl.hidden = true;
        chatForm.dispatchEvent(new Event('submit'));
      } else {
        executeGoto(href);
      }
    });

    /* --- Stream flow: shared helpers for both /read and normal chat --- */

    var streaming = false;

    function renderFinalReasoning(el, reasoningText) {
      if (reasoningText) {
        el.className = 'chatbot-msg chatbot-msg-reasoning';
        el.innerHTML = '<details open><summary class="chatbot-thinking-label">reasoning</summary>'
          + '<div class="chatbot-reasoning-text">'
          + reasoningText.replace(/</g, '&lt;').replace(/\n/g, '<br>')
          + '</div></details>';
      } else {
        el.className = 'chatbot-msg chatbot-msg-reasoning';
        el.innerHTML = '<span class="chatbot-thinking-label">processed</span>';
      }
    }

    function buildResponseEl() {
      var el = document.createElement('div');
      el.className = 'chatbot-msg chatbot-msg-assistant';
      var det = document.createElement('details');
      det.open = true;
      var sum = document.createElement('summary');
      sum.className = 'chatbot-msg-toggle';
      sum.textContent = projectName;
      det.appendChild(sum);
      var contentDiv = document.createElement('div');
      contentDiv.className = 'chatbot-msg-content';
      det.appendChild(contentDiv);
      el.appendChild(det);
      el._contentDiv = contentDiv;
      return el;
    }

    /* Build streaming callbacks for a given label + completion handler. */
    function makeStreamCallbacks(thinkingLabel, onComplete) {
      var thinkingEl = null;
      var responseEl = null;
      var reasoningText = '';

      return {
        onThinking: function () {
          thinkingEl = document.createElement('div');
          thinkingEl.className = 'chatbot-msg chatbot-msg-thinking';
          thinkingEl.innerHTML = '<span class="chatbot-thinking-label">' + thinkingLabel + '</span>'
            + '<span class="chatbot-thinking-dots"><span>.</span><span>.</span><span>.</span></span>';
          messagesEl.appendChild(thinkingEl);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        },
        onReasoning: function (text) {
          reasoningText = text;
          if (thinkingEl) {
            thinkingEl.innerHTML = '<span class="chatbot-thinking-label">' + thinkingLabel + '</span> '
              + '<span class="chatbot-thinking-text">'
              + text.slice(-120).replace(/</g, '&lt;') + '</span>';
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
        },
        onFirstContent: function () {
          if (thinkingEl) renderFinalReasoning(thinkingEl, reasoningText);
          responseEl = buildResponseEl();
          messagesEl.appendChild(responseEl);
        },
        onContent: function (fullText) {
          if (responseEl && responseEl._contentDiv) {
            responseEl._contentDiv.innerHTML = render.mdToHtml(fullText);
            messagesEl.scrollTop = messagesEl.scrollHeight;
          }
        },
        onDone: function (fullText) {
          if (thinkingEl && !responseEl) renderFinalReasoning(thinkingEl, reasoningText);
          if (!responseEl && fullText) {
            render.appendMessage(messagesEl, 'assistant', fullText, null, projectName);
          }
          onComplete(null, fullText, reasoningText);
        },
        onError: function (err) {
          if (thinkingEl) thinkingEl.remove();
          if (responseEl) responseEl.remove();
          render.appendMessage(messagesEl, 'assistant', 'Error: ' + err, 'chatbot-msg-error', projectName);
          onComplete(err);
        }
      };
    }

    /* --- Submit: /goto, /read, or normal chat --- */

    chatForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = chatInput.value.trim();

      if (msg.indexOf('/goto ') === 0) {
        var target = msg.slice(6).trim();
        if (target) window.location.href = target;
        return;
      }

      if (msg.indexOf('/read ') === 0) {
        var readUrl = msg.slice(6).trim();
        if (!readUrl || !apiKey || streaming) return;

        streaming = true;
        chatInput.value = '';
        autocompleteEl.hidden = true;
        render.appendMessage(messagesEl, 'user', msg);

        var fetchingEl = render.appendMessage(messagesEl, 'assistant',
          'Fetching ' + readUrl + '...', 'chatbot-msg-typing', projectName);

        fetch(readUrl)
          .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.text();
          })
          .then(function (html) {
            fetchingEl.remove();
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');
            var contentEl = doc.querySelector('.page-content') || doc.querySelector('article') || doc.body;
            var extractedText = (contentEl ? contentEl.innerText || contentEl.textContent : '').substring(0, 8000);

            if (!extractedText.trim()) {
              render.appendMessage(messagesEl, 'assistant',
                'Could not extract text from that page.',
                'chatbot-msg-error', projectName);
              streaming = false;
              return;
            }

            var readPrompt = 'Summarize the following documentation page. '
              + 'Highlight the key points, structure, and important details.\n\n'
              + 'PAGE URL: ' + readUrl + '\n\n'
              + 'PAGE CONTENT:\n' + extractedText;

            history.push({ role: 'user', content: msg });
            storage.incrementLocalRequests();
            refreshRate();

            api.sendMessageStream(readPrompt, [], '', apiKey, settings,
              makeStreamCallbacks('summarizing', function (err, fullText, reasoningText) {
                if (!err && fullText) {
                  var entry = { role: 'assistant', content: fullText };
                  if (reasoningText) entry.reasoning = reasoningText;
                  history.push(entry);
                  storage.saveHistory(history, settings.maxHistory);
                }
                streaming = false;
                refreshRate();
              })
            );
          })
          .catch(function (err) {
            fetchingEl.remove();
            render.appendMessage(messagesEl, 'assistant',
              'Failed to fetch: ' + err.message, 'chatbot-msg-error', projectName);
            streaming = false;
          });
        return;
      }

      if (!msg || !apiKey || streaming) return;

      streaming = true;
      chatInput.value = '';
      render.appendMessage(messagesEl, 'user', msg);
      history.push({ role: 'user', content: msg });
      storage.incrementLocalRequests();
      refreshRate();

      api.sendMessageStream(msg, history.slice(0, -1), pageContent, apiKey, settings,
        makeStreamCallbacks('thinking', function (err, fullText, reasoningText) {
          if (err) {
            history.pop();
          } else if (fullText) {
            var entry = { role: 'assistant', content: fullText };
            if (reasoningText) entry.reasoning = reasoningText;
            history.push(entry);
            storage.saveHistory(history, settings.maxHistory);
          }
          streaming = false;
          refreshRate();
        })
      );
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
})();
