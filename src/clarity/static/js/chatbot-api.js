/* ==========================================================================
   Clarity -- Chatbot API Layer
   OpenRouter requests: key info, activity, streaming chat completions,
   plus page content extraction and system prompt construction. No DOM
   writes, no localStorage.
   ========================================================================== */

(function () {
  'use strict';

  var Clarity = window.Clarity = window.Clarity || {};
  var Chatbot = Clarity.Chatbot = Clarity.Chatbot || {};

  var CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
  var KEY_URL = 'https://openrouter.ai/api/v1/key';
  var ACTIVITY_URL = 'https://openrouter.ai/api/v1/activity';

  /* --- Page content extraction --- */

  function getPageContent(pageTextLimit) {
    var el = document.querySelector('.page-content');
    if (!el) return '';
    var text = el.innerText || el.textContent || '';
    return text.substring(0, pageTextLimit);
  }

  /* --- System prompt --- */

  function buildSystemPrompt(pageText, customPrompt) {
    var base = customPrompt && customPrompt.trim()
      ? customPrompt
      : ('You are a documentation assistant. '
         + 'You ONLY answer questions about the content of the current documentation page. '
         + 'If the user asks something unrelated to the page content, '
         + 'respond with a brief summary of what the page covers and '
         + 'ask them to be more specific about the page content. '
         + 'Never answer random or off-topic questions. '
         + 'Keep answers concise and helpful.');
    return base + '\n\nPAGE CONTENT:\n' + pageText;
  }

  /* --- Key info --- */

  function fetchKeyInfo(apiKey, callback) {
    fetch(KEY_URL, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + apiKey }
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      callback(null, data && data.data ? data.data : null);
    })
    .catch(function () { callback(null, null); });
  }

  /* --- Activity (real request count, last 30 completed UTC days) --- */

  function fetchActivity(mgmtKey, callback) {
    if (!mgmtKey) { callback('no mgmt key'); return; }
    fetch(ACTIVITY_URL, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer ' + mgmtKey }
    })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data && data.error) {
        console.warn('[chatbot] activity API:', data.error.message);
        callback(data.error.message);
        return;
      }
      if (data && data.data && Array.isArray(data.data)) {
        var totalRequests = 0;
        var totalTokens = 0;
        for (var i = 0; i < data.data.length; i++) {
          totalRequests += (data.data[i].request_count || 0);
          totalTokens += (data.data[i].prompt_tokens || 0) + (data.data[i].completion_tokens || 0);
        }
        callback(null, { requests: totalRequests, tokens: totalTokens });
      } else {
        callback('no data');
      }
    })
    .catch(function () { callback('network error'); });
  }

  /* --- Streaming chat completion --- */

  function sendMessageStream(userMsg, history, pageText, apiKey, settings, callbacks) {
    var messages = [{ role: 'system', content: buildSystemPrompt(pageText, settings.systemPrompt) }];
    for (var i = 0; i < history.length; i++) messages.push(history[i]);
    messages.push({ role: 'user', content: userMsg });

    var body = {
      model: settings.model,
      messages: messages,
      max_tokens: settings.maxTokens,
      temperature: settings.temperature,
      top_p: settings.topP,
      frequency_penalty: settings.frequencyPenalty,
      presence_penalty: settings.presencePenalty,
      stream: true
    };
    if (settings.reasoningEffort) {
      body.reasoning = { effort: settings.reasoningEffort };
    }

    fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin || window.location.href,
        'X-OpenRouter-Title': 'Clarity Docs Assistant'
      },
      body: JSON.stringify(body)
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (data) {
          throw new Error(data.error ? data.error.message : 'HTTP ' + res.status);
        });
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';
      var fullContent = '';
      var reasoning = '';
      var phase = 'thinking';

      callbacks.onThinking();

      function pump() {
        return reader.read().then(function (result) {
          if (result.done) {
            callbacks.onDone(fullContent, reasoning);
            return;
          }

          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop();

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || line.charAt(0) === ':') continue;

            if (line === 'data: [DONE]') {
              callbacks.onDone(fullContent, reasoning);
              return;
            }

            if (line.indexOf('data: ') !== 0) continue;
            var json = line.slice(6);

            try {
              var chunk = JSON.parse(json);
              var delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta;
              if (!delta) continue;

              if (delta.reasoning) {
                reasoning += delta.reasoning;
                callbacks.onReasoning(reasoning);
                continue;
              }

              if (delta.content) {
                if (phase === 'thinking') {
                  phase = 'responding';
                  callbacks.onFirstContent();
                }
                fullContent += delta.content;
                callbacks.onContent(fullContent);
              }
            } catch (_) {}
          }

          return pump();
        });
      }

      return pump();
    })
    .catch(function (err) {
      callbacks.onError(err.message || 'Network error');
    });
  }

  Chatbot.api = {
    getPageContent: getPageContent,
    buildSystemPrompt: buildSystemPrompt,
    fetchKeyInfo: fetchKeyInfo,
    fetchActivity: fetchActivity,
    sendMessageStream: sendMessageStream
  };
})();
