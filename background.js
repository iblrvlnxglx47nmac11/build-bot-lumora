chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('config', (data) => {
    if (!data.config) {
      chrome.storage.local.set({
        config: {
          enabled: false,
          farm: true,
          water: true,
          fertilize: true,
          unlockPlots: true,
          animals: true,
          sellGld: true,  // AGGRESSIVE: Enable GLD counter
          sellWild: true,
          autoConvert: false,
          gldBurstMs: 30000,  // AGGRESSIVE: 30s burst (faster)
          gldBurstGapMs: 1000,  // AGGRESSIVE: 1s gap (more rapid-fire)
          gldBurstMax: 20,  // AGGRESSIVE: 20 attempts (more tries)
          gldMinFactor: 0.3,  // AGGRESSIVE: Accept lower pool (0.3x vs 0.5x)
          gather: true,
          autoCraft: true,
          claimQuests: true,
          autoBuySeeds: true,
          polite: true,
          crop: 'WHEAT',
          craftRecipe: 'bread',
          politeGapMs: [1200, 3000],  // AGGRESSIVE: Faster gaps (1.2-3s vs 1.5-4s)
          politePassMs: [20000, 40000],  // AGGRESSIVE: Faster passes (20-40s vs 25-50s)
          politeMaxActions: 15,  // AGGRESSIVE: More actions/pass (15 vs 12)
          maxActionsPerPass: 50,
          maxPlots: 5,  // AGGRESSIVE: More plots (5 vs 3)
          gldTargetGld: 0.1,  // AGGRESSIVE: Higher target (0.1 vs 0.015)
          convertMinRate: 0.5,
          keepFlorins: 150,  // AGGRESSIVE: Keep less gold (150 vs 200)
          questCropRotation: ['WHEAT', 'CARROT'],  // AGGRESSIVE: Wheat + Carrot (better value)
        }
      });
    }
  });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_CONFIG') {
    chrome.storage.local.get('config', (data) => sendResponse(data.config || {}));
    return true;
  }
  if (msg.type === 'SET_CONFIG') {
    chrome.storage.local.set({ config: msg.config }, () => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'STATUS_UPDATE') {
    chrome.storage.local.set({ status: msg.status }, () => sendResponse({ ok: true }));
    return true;
  }
  if (msg.type === 'GET_STATUS') {
    chrome.storage.local.get('status', (data) => sendResponse(data.status || {}));
    return true;
  }
  if (msg.type === 'GET_LOGS') {
    chrome.storage.local.get('logs', (data) => sendResponse(data.logs || []));
    return true;
  }
  if (msg.type === 'ADD_LOG') {
    chrome.storage.local.get('logs', (data) => {
      const logs = (data.logs || []).slice(-99);
      logs.push({ t: Date.now(), msg: msg.text, col: msg.col || '' });
      chrome.storage.local.set({ logs }, () => sendResponse({ ok: true }));
    });
    return true;
  }
});
