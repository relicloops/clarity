/* ==========================================================================
   Clarity -- Privacy Settings Modal (UI)
   Renders the per-row CAN/CANNOT + TTL table, handles open/close,
   writes via window.__clarityPrivacy. Opened from:
     - consent.html "Customize..." button
     - footer Privacy settings link
     - chatbot settings panel Privacy shortcut

   Storage-key groups flip together (e.g. all clarity-chatbot-* panel
   keys share one row) so the reader sees 6 sensible rows instead of
   11 low-level key names. Hosts each get their own row.
   ========================================================================== */

(function () {
  'use strict';

  /* Row definitions. `keys` lists every consent-blob entry the row
     controls; toggling the row sets/clears all of them. */
  var GROUPS = [
    { id: 'theme',           label: 'Theme + text size',      type: 'storage',
      keys: ['clarity-theme', 'clarity-text-size'],
      note: 'Dark/light/system choice, text zoom.' },
    { id: 'skin',            label: 'Skin',                   type: 'storage',
      keys: ['clarity-skin'],
      note: 'Your skin pick (Matrix, Darcula, etc.).' },
    { id: 'chatbot-keys',    label: 'Chatbot API keys',       type: 'storage',
      keys: ['clarity-chatbot-key', 'clarity-chatbot-mgmt-key'],
      note: 'OpenRouter credentials, stored obfuscated.' },
    { id: 'chatbot-history', label: 'Chatbot history',        type: 'storage',
      keys: ['clarity-chatbot-history'],
      note: 'Messages and reasoning traces.' },
    { id: 'chatbot-panel',   label: 'Chatbot panel state',    type: 'storage',
      keys: ['clarity-chatbot-state', 'clarity-chatbot-geometry',
             'clarity-chatbot-settings-override', 'clarity-chatbot-requests'],
      note: 'Open/closed, size, overrides, request counter.' },
    { id: 'update-dismiss',  label: 'Update-banner dismiss',  type: 'storage',
      keys: ['clarity-update-dismissed'],
      note: 'Keep the "version X available" banner hidden.' },
    { id: 'fonts',           label: 'Google Fonts',           type: 'external',
      keys: ['fonts.googleapis'],
      note: 'fonts.googleapis.com + fonts.gstatic.com.' },
    { id: 'pypi',            label: 'PyPI update check',      type: 'external',
      keys: ['pypi.update-check'],
      note: 'pypi.org/pypi/sphinx-clarity/json.' },
    { id: 'openrouter',      label: 'OpenRouter API',         type: 'external',
      keys: ['openrouter.ai'],
      note: 'openrouter.ai (chat completions + activity).' }
  ];

  var TTL_OPTIONS = [
    { value: 'never', label: 'Never' },
    { value: '1d',    label: '1 day' },
    { value: '1w',    label: '1 week' },
    { value: '1m',    label: '1 month' }
  ];

  /* --- State --- */

  var panel, rowsEl, presetEl, statusEl;
  var pendingEntries;  /* { '<name>': { allow, ttl } } built up by the UI */

  function init() {
    panel     = document.getElementById('clarity-privacy-panel');
    rowsEl    = document.getElementById('clarity-privacy-rows');
    presetEl  = document.getElementById('clarity-privacy-preset');
    statusEl  = document.getElementById('clarity-privacy-status');
    if (!panel || !rowsEl) return;

    document.getElementById('clarity-privacy-save').addEventListener('click', onSave);
    document.getElementById('clarity-privacy-reset').addEventListener('click', onReset);

    /* Any element with data-clarity-privacy-dismiss closes the panel. */
    panel.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== panel) {
        if (t.hasAttribute && t.hasAttribute('data-clarity-privacy-dismiss')) {
          close();
          return;
        }
        t = t.parentElement;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (!panel.hidden && e.key === 'Escape') close();
    });

    presetEl.addEventListener('change', function () {
      applyPreset(presetEl.value);
    });

    /* Global open hook. Any script (consent banner, footer link,
       chatbot shortcut) can dispatch a CustomEvent to open the modal
       instead of importing this IIFE directly. */
    window.addEventListener('clarity:open-privacy', open);

    /* Expose a tiny handle for convenience. */
    window.__clarityPrivacyPanel = { open: open, close: close };
  }

  /* --- Open / Close --- */

  function open() {
    if (!panel) return;
    pendingEntries = buildInitialEntries();
    render();
    presetEl.value = '';
    setStatus('');
    panel.hidden = false;
    /* Focus the close button so Escape + arrows land on the modal. */
    setTimeout(function () {
      var close = document.getElementById('clarity-privacy-close');
      if (close) close.focus();
    }, 20);
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  function buildInitialEntries() {
    var priv = window.__clarityPrivacy;
    if (!priv) return {};
    var snapshot = priv.getAll();
    var entries = {};
    if (snapshot && snapshot.consent) {
      for (var key in snapshot.consent) {
        if (!Object.prototype.hasOwnProperty.call(snapshot.consent, key)) continue;
        var e = snapshot.consent[key];
        entries[key] = {
          allow: e.allow === true,
          ttl:   (typeof e.ttl === 'string' && priv.TTL_MS && (e.ttl in priv.TTL_MS)) ? e.ttl : 'never'
        };
      }
    }
    return entries;
  }

  /* --- Render --- */

  function render() {
    rowsEl.innerHTML = '';
    for (var i = 0; i < GROUPS.length; i++) {
      rowsEl.appendChild(renderRow(GROUPS[i]));
    }
  }

  function renderRow(group) {
    var tr = document.createElement('tr');
    if (group.type === 'external') tr.classList.add('clarity-privacy-external-section');

    /* Label cell */
    var labelTd = document.createElement('td');
    var label = document.createElement('span');
    label.className = 'clarity-privacy-row-label';
    label.textContent = group.label;
    labelTd.appendChild(label);
    if (group.note) {
      var note = document.createElement('span');
      note.className = 'clarity-privacy-row-note';
      note.textContent = group.note;
      labelTd.appendChild(note);
    }
    tr.appendChild(labelTd);

    /* Allow cell */
    var allowTd = document.createElement('td');
    var allowLabel = document.createElement('label');
    allowLabel.className = 'clarity-privacy-allow';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = groupAllAllowed(group);
    var allowText = document.createElement('span');
    allowText.className = 'clarity-privacy-allow-label';
    allowText.textContent = cb.checked ? 'CAN' : 'CANNOT';
    cb.addEventListener('change', function () {
      setGroupAllow(group, cb.checked);
      allowText.textContent = cb.checked ? 'CAN' : 'CANNOT';
      refreshTtlEnabled(tr, group, cb.checked);
    });
    allowLabel.appendChild(cb);
    allowLabel.appendChild(allowText);
    allowTd.appendChild(allowLabel);
    tr.appendChild(allowTd);

    /* TTL cell */
    var ttlTd = document.createElement('td');
    if (group.type === 'storage') {
      var sel = document.createElement('select');
      sel.className = 'clarity-privacy-ttl';
      for (var i = 0; i < TTL_OPTIONS.length; i++) {
        var opt = document.createElement('option');
        opt.value = TTL_OPTIONS[i].value;
        opt.textContent = TTL_OPTIONS[i].label;
        sel.appendChild(opt);
      }
      sel.value = groupTtl(group);
      sel.disabled = !cb.checked;
      sel.addEventListener('change', function () {
        setGroupTtl(group, sel.value);
      });
      ttlTd.appendChild(sel);
    } else {
      var dash = document.createElement('span');
      dash.className = 'clarity-privacy-row-note';
      dash.textContent = '(one-shot)';
      ttlTd.appendChild(dash);
    }
    tr.appendChild(ttlTd);

    return tr;
  }

  function refreshTtlEnabled(tr, group, allowed) {
    if (group.type !== 'storage') return;
    var sel = tr.querySelector('select.clarity-privacy-ttl');
    if (sel) sel.disabled = !allowed;
  }

  /* --- Group helpers (read from / write to pendingEntries) --- */

  function groupAllAllowed(group) {
    for (var i = 0; i < group.keys.length; i++) {
      var e = pendingEntries[group.keys[i]];
      if (!e || !e.allow) return false;
    }
    return true;
  }

  function groupTtl(group) {
    /* Return the TTL of the first key in the group (they're kept in sync). */
    var first = pendingEntries[group.keys[0]];
    return (first && first.ttl) || 'never';
  }

  function setGroupAllow(group, allow) {
    for (var i = 0; i < group.keys.length; i++) {
      var key = group.keys[i];
      var e = pendingEntries[key] || { allow: false, ttl: 'never' };
      e.allow = allow === true;
      pendingEntries[key] = e;
    }
  }

  function setGroupTtl(group, ttl) {
    for (var i = 0; i < group.keys.length; i++) {
      var key = group.keys[i];
      var e = pendingEntries[key] || { allow: false, ttl: 'never' };
      e.ttl = ttl;
      pendingEntries[key] = e;
    }
  }

  /* --- Preset menu --- */

  function applyPreset(preset) {
    if (!preset) return;
    var allow, ttl;
    switch (preset) {
      case 'accept-all': allow = true;  ttl = 'never'; break;
      case 'decline-all': allow = false; ttl = 'never'; break;
      case 'all-1d': allow = true; ttl = '1d'; break;
      case 'all-1w': allow = true; ttl = '1w'; break;
      case 'all-1m': allow = true; ttl = '1m'; break;
      default: return;
    }
    for (var i = 0; i < GROUPS.length; i++) {
      setGroupAllow(GROUPS[i], allow);
      if (GROUPS[i].type === 'storage') setGroupTtl(GROUPS[i], ttl);
    }
    render();
    setStatus('Preset applied. Click Save to persist.');
  }

  /* --- Save / Reset --- */

  function onSave() {
    var priv = window.__clarityPrivacy;
    if (!priv) { setStatus('Privacy module missing.', 'is-error'); return; }
    /* Build the consent blob from pendingEntries. */
    var blob = { consent: {} };
    for (var key in pendingEntries) {
      if (Object.prototype.hasOwnProperty.call(pendingEntries, key)) {
        blob.consent[key] = {
          allow: pendingEntries[key].allow === true,
          ttl:   pendingEntries[key].ttl || 'never'
        };
      }
    }
    /* Save. privacy.savePrivacy is private -- use setEntry row by row
       to trigger the notify fan-out exactly once by wrapping in
       acceptAll/declineAll semantics. Simpler: call setEntry for each. */
    for (var k in blob.consent) {
      if (Object.prototype.hasOwnProperty.call(blob.consent, k)) {
        priv.setEntry(k, blob.consent[k].allow, blob.consent[k].ttl);
      }
    }
    /* Keep the coarse clarity-consent in sync: accepted if ANY key
       is allowed, declined otherwise. */
    syncCoarseConsent(blob.consent);
    setStatus('Saved.', 'is-ok');
    setTimeout(close, 400);
  }

  function syncCoarseConsent(consent) {
    var anyAllow = false;
    for (var k in consent) {
      if (consent[k] && consent[k].allow === true) { anyAllow = true; break; }
    }
    try {
      localStorage.setItem('clarity-consent', anyAllow ? 'accepted' : 'declined');
    } catch (_) {}
    window.__clarityConsent = anyAllow;
    window.__clarityConsentDecided = true;
  }

  function onReset() {
    var priv = window.__clarityPrivacy;
    if (priv) priv.reset();
    /* Also clear the coarse consent so the banner reappears next page load. */
    try { localStorage.removeItem('clarity-consent'); } catch (_) {}
    window.__clarityConsent = false;
    window.__clarityConsentDecided = false;
    setStatus('Reset. Banner will show on next page load.', 'is-ok');
    setTimeout(close, 600);
  }

  function setStatus(text, cls) {
    if (!statusEl) return;
    statusEl.className = 'clarity-privacy-status' + (cls ? ' ' + cls : '');
    statusEl.textContent = text || '';
  }

  /* --- Boot --- */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
