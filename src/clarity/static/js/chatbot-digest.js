/* ==========================================================================
   Clarity -- Chatbot Digest (export)
   Builds a schema-v1 JSON of the live conversation (with optional md/txt
   human-readable bundle) and triggers a browser download. When md or txt
   is picked, both files ship together inside digest.zip so the JSON is
   always present for a later ingest round-trip.
   Storage-agnostic: reads the live history via Chatbot.runtime.getHistory
   with a Chatbot.storage.loadHistory fallback, so it works regardless of
   the reader's consent choice (localStorage or sessionStorage).
   No API keys, no management keys, no geometry -- conversation only.
   ========================================================================== */

(function () {
  'use strict';

  var Clarity = window.Clarity = window.Clarity || {};
  var Chatbot = Clarity.Chatbot = Clarity.Chatbot || {};

  var SCHEMA = 'clarity-chatbot-digest/v1';

  /* --- System-prompt fingerprint (non-cryptographic; identifies drift) --- */

  function fingerprint(s) {
    var str = s || '';
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    }
    return 'djb2:' + (h >>> 0).toString(16);
  }

  /* --- Sources --- */

  function getLiveHistory() {
    var rt = Chatbot.runtime;
    if (rt && typeof rt.getHistory === 'function') {
      try {
        var live = rt.getHistory();
        if (live && live.length) return live.slice();
      } catch (_) {}
    }
    var storage = Chatbot.storage;
    if (storage && typeof storage.loadHistory === 'function') {
      return storage.loadHistory();
    }
    return [];
  }

  function getSettings() {
    var storage = Chatbot.storage;
    if (storage && typeof storage.loadSettings === 'function') {
      return storage.loadSettings();
    }
    return {};
  }

  function getPageInfo() {
    return {
      url: (window.location && window.location.href) || '',
      title: (document && document.title) || ''
    };
  }

  /* --- Builders --- */

  function buildDigestObject(messages, settings) {
    var page = getPageInfo();
    return {
      schema: SCHEMA,
      exported_at: new Date().toISOString(),
      origin: (window.location && window.location.origin) || '',
      page: page,
      chatbot: {
        model: settings.model || '',
        system_prompt_hash: fingerprint(settings.systemPrompt || ''),
        max_history: settings.maxHistory || 0
      },
      messages: messages.map(function (m) {
        var out = { role: m.role, content: m.content };
        if (m.ts) out.ts = m.ts;
        if (m.reasoning) out.reasoning = m.reasoning;
        return out;
      })
    };
  }

  function buildDigestJson(messages, settings) {
    return JSON.stringify(buildDigestObject(messages, settings), null, 2);
  }

  function fmtTs(ts) {
    if (!ts) return '';
    try {
      return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    } catch (_) {
      return String(ts);
    }
  }

  function buildDigestMd(messages, settings) {
    var page = getPageInfo();
    var lines = [];
    lines.push('# Clarity Chatbot digest');
    lines.push('');
    lines.push('**Exported:** ' + fmtTs(new Date().toISOString()));
    lines.push('**Page:** [' + (page.title || page.url) + '](' + page.url + ')');
    if (settings.model) lines.push('**Model:** ' + settings.model);
    lines.push('');
    lines.push('---');
    lines.push('');
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var role = (m.role || 'unknown');
      var label = role.charAt(0).toUpperCase() + role.slice(1);
      var head = '## ' + label;
      if (m.ts) head += ' -- ' + fmtTs(m.ts);
      lines.push(head);
      lines.push('');
      lines.push(String(m.content || ''));
      lines.push('');
    }
    return lines.join('\n');
  }

  function buildDigestTxt(messages, settings) {
    var lines = [];
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var head = '';
      if (m.ts) head += '[' + fmtTs(m.ts) + '] ';
      head += (m.role || '').toUpperCase();
      lines.push(head);
      lines.push(String(m.content || ''));
      lines.push('');
    }
    return lines.join('\n');
  }

  /* --- STORE-only zip writer (no compression) ---
     Intentionally tiny: ~3 KB, no dependencies. Good enough to bundle a
     pair of text files for download. Produces a valid PKZIP container
     that every OS extractor handles. */

  var crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) {
          c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        crcTable[n] = c >>> 0;
      }
    }
    var crc = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xff];
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function utf8Encode(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    /* Fallback for very old browsers: percent-encode through URI then
       parse back to bytes. Keeps us dependency-free. */
    var s = unescape(encodeURIComponent(str));
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
    return out;
  }

  function dosDateTime(d) {
    var time = ((d.getHours() & 0x1f) << 11) |
               ((d.getMinutes() & 0x3f) << 5) |
               ((d.getSeconds() >>> 1) & 0x1f);
    var date = (((d.getFullYear() - 1980) & 0x7f) << 9) |
               (((d.getMonth() + 1) & 0x0f) << 5) |
               (d.getDate() & 0x1f);
    return { time: time, date: date };
  }

  function buildZip(files) {
    var now = new Date();
    var dt = dosDateTime(now);
    var parts = [];
    var central = [];
    var offset = 0;

    for (var i = 0; i < files.length; i++) {
      var name = files[i].name;
      var data = files[i].data instanceof Uint8Array
        ? files[i].data
        : utf8Encode(String(files[i].data));
      var nameBytes = utf8Encode(name);
      var crc = crc32(data);

      var local = new Uint8Array(30 + nameBytes.length);
      var ldv = new DataView(local.buffer);
      ldv.setUint32(0, 0x04034b50, true);
      ldv.setUint16(4, 20, true);
      ldv.setUint16(6, 0, true);
      ldv.setUint16(8, 0, true);              /* STORE method */
      ldv.setUint16(10, dt.time, true);
      ldv.setUint16(12, dt.date, true);
      ldv.setUint32(14, crc, true);
      ldv.setUint32(18, data.length, true);
      ldv.setUint32(22, data.length, true);
      ldv.setUint16(26, nameBytes.length, true);
      ldv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      parts.push(local);
      parts.push(data);

      var cdir = new Uint8Array(46 + nameBytes.length);
      var cdv = new DataView(cdir.buffer);
      cdv.setUint32(0, 0x02014b50, true);
      cdv.setUint16(4, 20, true);
      cdv.setUint16(6, 20, true);
      cdv.setUint16(8, 0, true);
      cdv.setUint16(10, 0, true);
      cdv.setUint16(12, dt.time, true);
      cdv.setUint16(14, dt.date, true);
      cdv.setUint32(16, crc, true);
      cdv.setUint32(20, data.length, true);
      cdv.setUint32(24, data.length, true);
      cdv.setUint16(28, nameBytes.length, true);
      cdv.setUint16(30, 0, true);
      cdv.setUint16(32, 0, true);
      cdv.setUint16(34, 0, true);
      cdv.setUint16(36, 0, true);
      cdv.setUint32(38, 0, true);
      cdv.setUint32(42, offset, true);
      cdir.set(nameBytes, 46);
      central.push(cdir);

      offset += local.length + data.length;
    }

    var cdStart = offset;
    var cdSize = 0;
    for (var j = 0; j < central.length; j++) cdSize += central[j].length;

    var eocd = new Uint8Array(22);
    var edv = new DataView(eocd.buffer);
    edv.setUint32(0, 0x06054b50, true);
    edv.setUint16(4, 0, true);
    edv.setUint16(6, 0, true);
    edv.setUint16(8, files.length, true);
    edv.setUint16(10, files.length, true);
    edv.setUint32(12, cdSize, true);
    edv.setUint32(16, cdStart, true);
    edv.setUint16(20, 0, true);

    var total = cdStart + cdSize + 22;
    var out = new Uint8Array(total);
    var o = 0;
    for (var p = 0; p < parts.length; p++) {
      out.set(parts[p], o);
      o += parts[p].length;
    }
    for (var q = 0; q < central.length; q++) {
      out.set(central[q], o);
      o += central[q].length;
    }
    out.set(eocd, o);
    return out;
  }

  /* --- Download --- */

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      try { a.parentNode.removeChild(a); } catch (_) {}
      URL.revokeObjectURL(url);
    }, 200);
  }

  function defaultFilename() {
    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return 'clarity-chat-' + d.getFullYear() + '-' +
      pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      '-' + pad(d.getHours()) + pad(d.getMinutes());
  }

  function sanitiseFilename(name) {
    if (!name) return defaultFilename();
    /* Strip path separators, control chars, trailing dots / spaces. */
    return String(name)
      .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
      .replace(/\.\.+/g, '.')
      .replace(/^[.\s]+|[.\s]+$/g, '')
      .slice(0, 120) || defaultFilename();
  }

  /* --- Public API --- */

  function hasHistory() {
    var m = getLiveHistory();
    return !!(m && m.length);
  }

  function run(format, filename) {
    var messages = getLiveHistory();
    if (!messages || !messages.length) {
      return { ok: false, reason: 'empty' };
    }
    var settings = getSettings();
    var base = sanitiseFilename(filename);
    var jsonStr = buildDigestJson(messages, settings);

    if (format === 'json' || !format) {
      triggerDownload(
        new Blob([jsonStr], { type: 'application/json' }),
        base + '.json'
      );
      return { ok: true, count: messages.length, file: base + '.json' };
    }

    var body, innerName;
    if (format === 'md') {
      body = buildDigestMd(messages, settings);
      innerName = 'digest.md';
    } else if (format === 'txt') {
      body = buildDigestTxt(messages, settings);
      innerName = 'digest.txt';
    } else {
      return { ok: false, reason: 'bad-format' };
    }

    var zipBytes = buildZip([
      { name: innerName, data: body },
      { name: 'digest.json', data: jsonStr }
    ]);
    triggerDownload(
      new Blob([zipBytes], { type: 'application/zip' }),
      base + '.zip'
    );
    return { ok: true, count: messages.length, file: base + '.zip' };
  }

  Chatbot.digest = {
    SCHEMA: SCHEMA,
    run: run,
    hasHistory: hasHistory,
    defaultFilename: defaultFilename,
    sanitiseFilename: sanitiseFilename,
    buildDigestJson: buildDigestJson,
    buildDigestMd: buildDigestMd,
    buildDigestTxt: buildDigestTxt,
    buildZip: buildZip
  };
})();
