(() => {
  'use strict';

  function injectBot() {
    if (document.getElementById('lumora-ext-injected')) return;
    const s = document.createElement('script');
    s.id = 'lumora-ext-injected';
    s.src = chrome.runtime.getURL('bot.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (d.type === 'LUMORA_EXT_STATUS') {
      chrome.runtime.sendMessage({ type: 'STATUS_UPDATE', status: d.status });
    }
    if (d.type === 'LUMORA_EXT_LOG') {
      chrome.runtime.sendMessage({ type: 'ADD_LOG', text: d.text, col: d.col });
    }
    if (d.type === 'LUMORA_EXT_REQUEST_CONFIG') {
      chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (config) => {
        if (config) window.postMessage({ type: 'LUMORA_EXT_SET_CONFIG', config }, '*');
      });
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'POPUP_GET_STATUS') {
      window.postMessage({ type: 'LUMORA_EXT_REQUEST_STATUS' }, '*');
      sendResponse({ ok: true });
    }
    if (msg.type === 'POPUP_TOGGLE') {
      window.postMessage({ type: 'LUMORA_EXT_TOGGLE' }, '*');
      sendResponse({ ok: true });
    }
    if (msg.type === 'POPUP_SET_CONFIG') {
      window.postMessage({ type: 'LUMORA_EXT_SET_CONFIG', config: msg.config }, '*');
      sendResponse({ ok: true });
    }
  });

  injectBot();
})();
