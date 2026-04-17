/* ==========================================================================
   Clarity -- Chatbot Ingest (import)
   Parses a schema-v1 digest JSON, validates it, and installs the messages
   into the live conversation. Two modes:
     replace -- discard current messages, use the file's.
     append  -- concatenate the file's messages after the current ones.
   Writes to storage via Chatbot.storage.saveHistory (consent-gated ->
   localStorage, otherwise sessionStorage). Never accepts api_key fields.
   ========================================================================== */

(function () {
  'use strict';

  var Clarity = window.Clarity = window.Clarity || {};
  var Chatbot = Clarity.Chatbot = Clarity.Chatbot || {};

  var SCHEMA = 'clarity-chatbot-digest/v1';
  var ALLOWED_ROLES = { user: 1, assistant: 1, system: 1 };
  var ABSOLUTE_MAX = 5000;  /* hard cap regardless of maxHistory */

  function err(message, detail) {
    return { ok: false, error: message, detail: detail || null };
  }

  function validate(obj, settingsMaxHistory) {
    if (!obj || typeof obj !== 'object') {
      return err('Not a JSON object.');
    }
    if (obj.schema !== SCHEMA) {
      return err(
        'Schema mismatch. Expected "' + SCHEMA + '", got "' +
          (obj.schema || '(missing)') + '".'
      );
    }
    if (!Array.isArray(obj.messages)) {
      return err('"messages" is missing or not an array.');
    }

    var cleaned = [];
    var droppedRoles = 0;
    for (var i = 0; i < obj.messages.length; i++) {
      var m = obj.messages[i];
      if (!m || typeof m !== 'object') {
        droppedRoles++;
        continue;
      }
      if (!ALLOWED_ROLES[m.role]) {
        droppedRoles++;
        continue;
      }
      if (typeof m.content !== 'string') {
        droppedRoles++;
        continue;
      }
      var out = { role: m.role, content: m.content };
      if (typeof m.ts === 'string' && m.ts) out.ts = m.ts;
      if (typeof m.reasoning === 'string' && m.reasoning) out.reasoning = m.reasoning;
      cleaned.push(out);
    }

    if (!cleaned.length) {
      return err('No valid messages in file.');
    }

    var softCap = Math.max(1, (settingsMaxHistory || 50) * 4);
    var cap = Math.min(softCap, ABSOLUTE_MAX);
    var truncated = 0;
    if (cleaned.length > cap) {
      truncated = cleaned.length - cap;
      cleaned = cleaned.slice(-cap);
    }

    return {
      ok: true,
      messages: cleaned,
      dropped: droppedRoles,
      truncated: truncated,
      source: {
        origin: typeof obj.origin === 'string' ? obj.origin : '',
        exported_at: typeof obj.exported_at === 'string' ? obj.exported_at : '',
        system_prompt_hash: obj.chatbot && typeof obj.chatbot.system_prompt_hash === 'string'
          ? obj.chatbot.system_prompt_hash : '',
        model: obj.chatbot && typeof obj.chatbot.model === 'string'
          ? obj.chatbot.model : ''
      }
    };
  }

  function parse(text, settingsMaxHistory) {
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return err('JSON parse error.', e.message);
    }
    return validate(parsed, settingsMaxHistory);
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject(new Error('no file')); return; }
      if (file.size > 10 * 1024 * 1024) {
        reject(new Error('File too large (max 10 MB).'));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(reader.error || new Error('read failed')); };
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.readAsText(file);
    });
  }

  /* --- Apply to the live conversation --- */

  function apply(cleanedMessages, mode) {
    var rt = Chatbot.runtime;
    var storage = Chatbot.storage;
    var settings = storage && storage.loadSettings ? storage.loadSettings() : { maxHistory: 50 };

    var current = [];
    if (rt && typeof rt.getHistory === 'function') {
      try { current = rt.getHistory().slice(); } catch (_) { current = []; }
    } else if (storage && storage.loadHistory) {
      current = storage.loadHistory();
    }

    var next;
    if (mode === 'append') {
      next = current.concat(cleanedMessages);
    } else {
      next = cleanedMessages.slice();
    }

    /* Trim to maxHistory * 4 so a huge paste can't blow up storage. */
    var cap = Math.min(ABSOLUTE_MAX, Math.max(1, (settings.maxHistory || 50) * 4));
    if (next.length > cap) next = next.slice(-cap);

    if (rt && typeof rt.setHistory === 'function') {
      rt.setHistory(next);
    } else if (storage && storage.saveHistory) {
      storage.saveHistory(next, settings.maxHistory || 50);
    }
    return next.length;
  }

  /* --- Public entry --- */

  function run(file, mode) {
    var storage = Chatbot.storage;
    var settings = storage && storage.loadSettings ? storage.loadSettings() : { maxHistory: 50 };
    return readFile(file).then(function (text) {
      var result = parse(text, settings.maxHistory);
      if (!result.ok) return result;
      var installed = apply(result.messages, mode === 'append' ? 'append' : 'replace');
      return {
        ok: true,
        mode: mode === 'append' ? 'append' : 'replace',
        ingested: result.messages.length,
        installed: installed,
        dropped: result.dropped,
        truncated: result.truncated,
        source: result.source
      };
    });
  }

  Chatbot.ingest = {
    SCHEMA: SCHEMA,
    run: run,
    parse: parse,
    validate: validate,
    ALLOWED_ROLES: ALLOWED_ROLES
  };
})();
