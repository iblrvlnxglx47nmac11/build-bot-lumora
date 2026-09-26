(() => {
  'use strict';
  if (window.__LUMORA_BOT_LOADED__) return;
  window.__LUMORA_BOT_LOADED__ = true;

  const SERVER = 'https://lumora-server-production-8362.up.railway.app';

  let CFG = {};
  let TOKEN = null;
  let PLAYER_ID = null;
  let G = {};
  let running = false;
  let stopFlag = false;
  let _pending = {};
  let _selling = false;
  let _passing = false;
  let _passCount = 0;
  let _actsTotal = 0;
  let RL_UNTIL = 0;
  let _lastPassActs = 0;

  // ══════════════════════════════════════════════════════════════════════
  // SAFETY SYSTEM - prevent overspending, detect anomalies
  // ══════════════════════════════════════════════════════════════════════
  const SAFETY = {
    limits: { minGoldReserve: 50, maxSpendPerPass: 500, maxSpendPerHour: 2000, emergencyStopGold: 10 },
    state: { spendThisPass: 0, spendThisHour: 0, hourStartTime: Date.now(), emergencyStop: false, goldSnapshots: [] },
    
    resetPass() { this.state.spendThisPass = 0; },
    
    checkHourly() {
      if (Date.now() - this.state.hourStartTime > 3600000) {
        this.state.spendThisHour = 0;
        this.state.hourStartTime = Date.now();
      }
    },
    
    canSpend(amount, gold) {
      this.checkHourly();
      if (gold <= this.limits.emergencyStopGold) {
        this.state.emergencyStop = true;
        return { ok: false, reason: 'emergency_low_gold' };
      }
      if (gold - amount < this.limits.minGoldReserve) return { ok: false, reason: 'reserve' };
      if (this.state.spendThisPass + amount > this.limits.maxSpendPerPass) return { ok: false, reason: 'pass_limit' };
      if (this.state.spendThisHour + amount > this.limits.maxSpendPerHour) return { ok: false, reason: 'hour_limit' };
      return { ok: true };
    },
    
    recordSpend(amount) {
      this.state.spendThisPass += amount;
      this.state.spendThisHour += amount;
    },
    
    snapshot(gold) {
      this.state.goldSnapshots.push({ t: Date.now(), gold });
      if (this.state.goldSnapshots.length > 50) this.state.goldSnapshots.shift();
    },
  };

  // ══════════════════════════════════════════════════════════════════════
  // METRICS TRACKER - profit, efficiency, ROI
  // ══════════════════════════════════════════════════════════════════════
  const METRICS = {
    session: { start: Date.now(), startGold: 0, startLumi: 0, startGld: 0 },
    cnt: { passes: 0, acts: 0, harvest: 0, plant: 0, water: 0, fert: 0, gather: 0, craft: 0, quest: 0, gldSell: 0, wildSell: 0, convert: 0 },
    earn: { gold: 0, goldSpent: 0, lumi: 0, gld: 0, gldUsd: 0 },
    crops: {},
    gathered: {},
    
    start(gold, lumi, gld) {
      this.session = { start: Date.now(), startGold: gold || 0, startLumi: lumi || 0, startGld: gld || 0 };
    },
    
    rec(type, data = {}) {
      this.cnt.acts++;
      switch (type) {
        case 'harvest': this.cnt.harvest++; if (data.crop && data.qty) this.crops[data.crop] = (this.crops[data.crop] || 0) + data.qty; break;
        case 'plant': this.cnt.plant++; break;
        case 'water': this.cnt.water++; break;
        case 'fertilize': this.cnt.fert++; break;
        case 'gather': this.cnt.gather++; if (data.item && data.qty) this.gathered[data.item] = (this.gathered[data.item] || 0) + data.qty; break;
        case 'craft': this.cnt.craft++; break;
        case 'quest': this.cnt.quest++; if (data.gold) this.earn.gold += data.gold; break;
        case 'gld_sell': this.cnt.gldSell++; if (data.gld) this.earn.gld += data.gld; if (data.usd) this.earn.gldUsd += data.usd; break;
        case 'wild_sell': this.cnt.wildSell++; if (data.gold) this.earn.gold += data.gold; break;
        case 'convert': this.cnt.convert++; if (data.lumi) this.earn.lumi += data.lumi; break;
        case 'buy': if (data.cost) this.earn.goldSpent += data.cost; break;
      }
    },
    
    stats(gold, lumi, gld) {
      const elapsed = Date.now() - this.session.start;
      const h = elapsed / 3600000;
      const gNet = (gold - this.session.startGold) + this.earn.gold - this.earn.goldSpent;
      const lNet = (lumi - this.session.startLumi) + this.earn.lumi;
      const gldNet = (gld - this.session.startGld) + this.earn.gld;
      return {
        uptime: this.fmt(elapsed),
        passes: this.cnt.passes,
        acts: this.cnt.acts,
        goldNet: gNet.toFixed(0) + '◈',
        lumiNet: lNet.toFixed(4),
        gldNet: gldNet.toFixed(8),
        goldPerH: h > 0 ? (gNet / h).toFixed(0) + '◈/h' : '0',
        actsPerH: h > 0 ? (this.cnt.acts / h).toFixed(0) : '0',
        harvestPerH: h > 0 ? (this.cnt.harvest / h).toFixed(1) : '0',
      };
    },
    
    fmt(ms) {
      const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    },
  };

  function emit(type, payload) {
    window.postMessage({ type, ...payload }, '*');
  }
  function log(text, col) {
    emit('LUMORA_EXT_LOG', { text, col });
    console.log(`%c[LumoraBot] ${text}`, col === 'g' ? 'color:#6aa84f' : col === 'r' ? 'color:#c04020' : col === 'y' ? 'color:#e0a83c' : col === 'c' ? 'color:#2d7f91' : '');
  }
  function status() {
    const stats = METRICS.stats(G.gold || 0, G.lumi || 0, G.gld || 0);
    const safety = SAFETY.state;
    const s = {
      running,
      gold: G.gold,
      seeds: seedTotalAll(),
      lumi: G.lumi,
      gld: G.gld,
      passCount: _passCount,
      totalActs: _actsTotal,
      lastAction: G._lastAction || 'idle',
      passInfo: running ? `pass #${_passCount} · ${_lastPassActs} acts · ${stats.goldPerH}` : 'idle',
      plots: G._plots || 0,
      username: G.username || '—',
      gameTime: gameClockStr(),
      shopOpen: shopOpen(),
      shopIn: Math.round(msToShopOpen() / 1000),
      metrics: stats,
      safety: { emergency: safety.emergencyStop, spendPass: safety.spendThisPass, spendHour: safety.spendThisHour },
    };
    emit('LUMORA_EXT_STATUS', { status: s });
    return s;
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function rnd([a, b]) { return a + Math.random() * (b - a); }
  function todayKey(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  // ── Benih per crop (dari kode game: G.seedBag[crop]) ──
  const SEED_ITEM = {
    WHEAT: 'seeds_wheat', CARROT: 'seeds_carrot', STRAWBERRY: 'seeds_straw',
    POTATO: 'seeds_potato', TOMATO: 'seeds_tomato', CORN: 'seeds_corn',
    RICE: 'seeds_rice', SUNFLOWER: 'seeds_sun', PUMPKIN: 'seeds_pumpkin',
  };
  const SEED_PRICE = {
    seeds_wheat: 5, seeds_carrot: 48, seeds_straw: 50, seeds_potato: 56,
    seeds_tomato: 60, seeds_corn: 86, seeds_rice: 75, seeds_sun: 64, seeds_pumpkin: 65,
  };
  const SEED_PACK = {
    seeds_wheat: 5, seeds_carrot: 3, seeds_straw: 5, seeds_potato: 4,
    seeds_tomato: 3, seeds_corn: 2, seeds_rice: 3, seeds_sun: 2, seeds_pumpkin: 1,
  };
  function seedCountOf(crop) {
    const bag = G.seedBag || {};
    let n = Math.max(0, Math.floor(Number(bag[crop]) || 0));
    if (crop === 'WHEAT') n += Math.max(0, Math.floor(Number(G.seeds) || 0));
    return n;
  }
  function seedTotalAll() {
    const bag = G.seedBag || {};
    let n = Math.max(0, Math.floor(Number(G.seeds) || 0));
    for (const k in bag) n += Math.max(0, Math.floor(Number(bag[k]) || 0));
    return n;
  }
  function applySeedReply(d) {
    if (!d) return;
    if (d.seedBag && typeof d.seedBag === 'object') G.seedBag = d.seedBag;
    if (typeof d.seeds === 'number') G.seeds = d.seeds;
  }
  // ── Jam in-game (dari kode game: 1 hari = 20 menit real) ──
  const DAY_LEN_MS = 20 * 60 * 1000;
  const SHOP_OPEN_H = 5;   // jam buka trading post (in-game)
  const SHOP_CLOSE_H = 18; // jam tutup
  function gameNow() { return Date.now() + (Number(window._clockSkew) || 0); }
  function gameHour() { return ((gameNow() % DAY_LEN_MS) / DAY_LEN_MS) * 24; }
  function shopOpen() { const t = gameHour(); return t >= SHOP_OPEN_H && t < SHOP_CLOSE_H; }
  // ms sampai trading post buka lagi (in-game 5am berikutnya)
  function msToShopOpen() {
    const t = gameHour();
    const hoursUntil = (SHOP_OPEN_H - t + 24) % 24;
    return (hoursUntil / 24) * DAY_LEN_MS;
  }
  // ms sampai trading post tutup (in-game 6pm)
  function msToShopClose() {
    const t = gameHour();
    const hoursUntil = (SHOP_CLOSE_H - t + 24) % 24;
    return (hoursUntil / 24) * DAY_LEN_MS;
  }
  // tunggu dalam chunk agar tetap responsif saat bot dihentikan
  async function waitFor(ms, chunk) {
    let left = ms;
    while (left > 0 && running && !stopFlag) {
      const c = Math.min(left, chunk || 30000);
      await sleep(c);
      left -= c;
    }
  }
  function gameClockStr() {
    const t = gameHour();
    const hh = Math.floor(t) % 12 || 12;
    const mm = Math.floor((t % 1) * 60);
    return hh + ':' + String(mm).padStart(2, '0') + (t >= 12 ? 'pm' : 'am');
  }

  function getToken() {
    try {
      const t = sessionStorage.getItem('lumora_token');
      if (t && t.length > 10) return t;
    } catch (e) {}
    try {
      if (window._lumoraToken && window._lumoraToken.length > 10) return window._lumoraToken;
    } catch (e) {}
    return null;
  }

  function getPlayerIdFromPage() {
    try { if (window.G && window.G.playerId) return window.G.playerId; } catch (e) {}
    try { if (window.playerId) return window.playerId; } catch (e) {}
    try {
      const idFile = sessionStorage.getItem('lumora_player_id');
      if (idFile) return idFile;
    } catch (e) {}
    try {
      const raw = localStorage.getItem('lumora_player_id');
      if (raw) return raw;
    } catch (e) {}
    return null;
  }

  async function api(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (TOKEN) headers['x-auth'] = TOKEN;
    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const r = await fetch(SERVER + path, opts);
    // sinkronkan jam server (untuk jam in-game)
    try {
      const dh = r.headers.get('date');
      if (dh) {
        const ms = Date.parse(dh);
        if (ms) {
          const sk = ms + 500 - Date.now();
          if (Math.abs(sk - (Number(window._clockSkew) || 0)) > 2000) window._clockSkew = sk;
        }
      }
    } catch (e) {}
    const data = await r.json().catch(() => ({}));
    if (r.status === 429) {
      RL_UNTIL = Date.now() + 15000;
      throw new Error('rate_limited');
    }
    if (!r.ok) {
      const err = new Error(data.error || data.message || `HTTP ${r.status}`);
      err.data = data;
      err.status = r.status;
      throw err;
    }
    return data;
  }
  const GET = (p) => api('GET', p);
  async function POST(p, b) {
    if (CFG.polite) await paceProd();
    return api('POST', p, b);
  }

  function isCaptchaActive() { return false; }

  // ── SEAT (socket.io) ──
  // Server butuh koneksi live untuk world harvest
  let SOCK = null;
  let SEAT_OK = false;
  let SEAT_KEEP = null;

  function seatConnect() {
    if (SOCK && SEAT_OK) return;
    try {
      const host = SERVER.replace(/^https?:\/\//, '');
      SOCK = io('https://' + host, { transports: ['websocket', 'polling'], reconnection: true, reconnectionDelay: 4000, timeout: 20000 });
      SOCK.on('connect', () => {
        log('Seat: connected', 'c');
        const pos = G._pos || { x: 40, y: 40, zone: 'world' };
        SOCK.emit('player:join', { playerId: PLAYER_ID, username: G.username, x: pos.x, y: pos.y, appearance: null, ticket: null, token: TOKEN });
      });
      SOCK.on('join:ok', () => {
        SEAT_OK = true;
        log('Seat: OK — world harvest aktif', 'g');
      });
      SOCK.on('queue:ready', (d) => {
        const pos = G._pos || { x: 40, y: 40, zone: 'world' };
        SOCK.emit('player:join', { playerId: PLAYER_ID, username: G.username, x: pos.x, y: pos.y, appearance: null, ticket: d && d.ticket, token: TOKEN });
      });
      SOCK.on('server:error', (d) => {
        if (d && d.code === 'idle') {
          SEAT_OK = false;
          log('Seat: idle, reconnect', 'y');
          try { SOCK.close(); } catch (e) {}
          SOCK = null;
          setTimeout(() => seatConnect(), 3000);
        }
      });
      SOCK.on('disconnect', () => { SEAT_OK = false; });
      // keepalive: player:move tiap 45 detik
      if (SEAT_KEEP) clearInterval(SEAT_KEEP);
      SEAT_KEEP = setInterval(() => {
        if (!SOCK || !SOCK.connected || !SEAT_OK) return;
        const p = G._pos || { x: 40, y: 40, zone: 'world' };
        SOCK.emit('player:move', { x: p.x, y: p.y, dir: 'down', followingPet: null, mounted: false, zone: p.zone });
      }, 45000);
      if (SEAT_KEEP.unref) SEAT_KEEP.unref();
    } catch (e) {
      log('Seat error: ' + e.message, 'y');
    }
  }

  function seatMove(x, y, zone) {
    G._pos = { x, y, zone };
    if (SOCK && SOCK.connected) {
      SOCK.emit('player:move', { x, y, dir: 'down', followingPet: null, mounted: false, zone });
    }
  }
  let lastProdAt = 0;
  async function paceProd() {
    const [a, b] = CFG.politeGapMs || [1500, 4000];
    const wait = lastProdAt + a + Math.random() * (b - a) - Date.now();
    if (wait > 0) await sleep(wait);
    lastProdAt = Date.now();
  }

  async function login() {
    TOKEN = getToken();
    if (!TOKEN) {
      log('Token belum ada. Login ke game dulu (playlumora.io).', 'r');
      return false;
    }
    try {
      const tokenParts = TOKEN.split('.');
      if (tokenParts.length >= 2) {
        const seg = tokenParts[0];
        const dec = atob(seg.replace(/-/g, '+').replace(/_/g, '/'));
        const m = dec.match(/^([a-z0-9]{20,})\.(\d{9,})\./i);
        if (m) PLAYER_ID = m[1];
      }
    } catch (e) {}
    if (!PLAYER_ID) {
      const fromPage = getPlayerIdFromPage();
      if (fromPage) PLAYER_ID = fromPage;
    }
    try {
      const farm = await GET('/api/farm/' + PLAYER_ID);
      const P = farm.player || {};
      G.playerId = P.id || PLAYER_ID;
      G.username = P.username || '—';
      G.gold = Number(P.gold || 0);
      G.seeds = Number(P.seeds || 0);
      G.seedBag = P.seedBag || {};
      G.lumi = Number(P.lumiBalance || 0);
      G.gld = Number(P.gldBalance || 0);
      G.inventory = P.inventory || {};
      G.inventoryExt = P.inventoryExt || {};
      _pending = {};
      for (const [k, v] of Object.entries(G.inventory)) {
        const n = Math.floor(Number(v) || 0);
        if (n > 0) _pending[k] = n;
      }
      G.upg = P.upgrades || {};
      G.gear = P.gear || {};
      G.animals = P.farmAnimals || [];
      G.skills = farm.skills || {};
      G.can = farm.can || {};
      PLAYER_ID = G.playerId;
      G.craftJobs = [];
      G._lastAction = 'logged in';
      
      // Initialize metrics & safety
      METRICS.start(G.gold, G.lumi, G.gld);
      SAFETY.snapshot(G.gold);
      
      log(`Login OK · ${G.username} · gold ${G.gold}◈ · seeds ${G.seeds} · LUMI ${Number(G.lumi).toFixed(4)} · GLD ${Number(G.gld).toFixed(8)}`, 'g');
      // connect seat setelah login
      if (typeof io !== 'undefined') seatConnect();
      else log('socket.io tidak tersedia — world harvest mungkin gagal', 'y');
      return true;
    } catch (e) {
      log('Login gagal: ' + e.message, 'r');
      TOKEN = null;
      return false;
    }
  }

  function action(p) {
    if (['SCORCHED', 'FROZEN'].includes(p.state)) return 'restore';
    if (p.state === 'EMPTY') return 'till';
    if (p.state === 'READY' || (p.readyAt && new Date(p.readyAt).getTime() <= Date.now())) return 'harvest';
    if (p.state === 'TILLED') return 'plant';
    if (['PLANTED', 'GROWING'].includes(p.state)) return p.isWatered ? 'wait' : 'water';
    return 'wait';
  }

  async function pass() {
    if (Date.now() < RL_UNTIL) {
      const w = Math.ceil((RL_UNTIL - Date.now()) / 1000);
      log(`Rate limited — tunggu ${w}s`, 'y');
      await sleep(Math.min(RL_UNTIL - Date.now(), 30000));
      return 0;
    }

    // Safety check
    if (SAFETY.state.emergencyStop) {
      log('🚨 EMERGENCY STOP: gold terlalu rendah', 'r');
      running = false;
      status();
      return 0;
    }

    SAFETY.resetPass();
    SAFETY.snapshot(G.gold || 0);

    TOKEN = getToken();
    if (!TOKEN) {
      log('Token expired/hilang. Refresh halaman dan login ulang.', 'r');
      running = false;
      status();
      return 0;
    }

    let acts = 0;
    let gActs = 0;
    const doAct = () => acts < (CFG.polite ? Math.min(CFG.politeMaxActions || 12, CFG.maxActionsPerPass || 15) : CFG.maxActionsPerPass || 15);

    let farm;
    try {
      farm = await GET('/api/farm/' + PLAYER_ID);
    } catch (e) {
      log('Farm fetch gagal: ' + e.message + ' — lanjut ke gather/sell', 'y');
      farm = {};
    }
    const P = farm.player || {};
    if (typeof P.gold === 'number') G.gold = P.gold;
    // only update seeds if server actually sends the field (it's often missing/undefined)
    if ('seeds' in P && typeof P.seeds === 'number') G.seeds = P.seeds;
    if (P.seedBag) G.seedBag = P.seedBag;
    if (typeof P.lumiBalance === 'number') G.lumi = P.lumiBalance;
    if (typeof P.gldBalance === 'number') G.gld = P.gldBalance;
    if (P.inventoryExt) G.inventoryExt = Object.assign(G.inventoryExt || {}, P.inventoryExt);
    if (P.inventory) {
      G.inventory = P.inventory;
      for (const [k, v] of Object.entries(P.inventory)) {
        const n = Math.floor(Number(v) || 0);
        if (n > 0) _pending[k] = Math.max(_pending[k] || 0, n);
      }
    }
    if (P.upgrades) G.upg = P.upgrades;
    if (P.gear) G.gear = P.gear;
    if (farm.can) G.can = farm.can;
    if (farm.skills) G.skills = farm.skills;

    const plots = farm.plots || [];
    const mine = plots.filter(p => !p.isLocked);
    G._plots = mine.length;
    const ready = mine.filter(p => action(p) === 'harvest');
    const tillable = mine.filter(p => action(p) === 'till');
    const plantable = mine.filter(p => action(p) === 'plant');
    const dry = mine.filter(p => action(p) === 'water');

    G._lastAction = `farm: ${mine.length} plots · ready ${ready.length}`;
    log(`farm: ${mine.length} plot · ready ${ready.length} · kering ${dry.length} · kosong ${tillable.length} · siap tanam ${plantable.length} · gold ${G.gold}◈ seeds ${G.seeds}`, 'c');

    // ── Auto-buy farm deed (wajib sebelum farming) ──
    let hasFarm = !!(G.upg && G.upg.farm);
    if (!hasFarm && G.gold >= 500) {
      const check = SAFETY.canSpend(500, G.gold);
      if (!check.ok) {
        log('Skip beli farm deed: ' + check.reason, 'y');
      } else {
        try {
          const r = await POST('/api/upgrade/buy', { playerId: PLAYER_ID, id: 'farm' });
          acts++;
          if (typeof r.gold === 'number') G.gold = r.gold;
          if (!G.upg) G.upg = {};
          G.upg.farm = r.level || 1;
          hasFarm = true;
          SAFETY.recordSpend(500);
          METRICS.rec('buy', { cost: 500 });
          log('Beli Havenfield Farm 500◈ → gold ' + G.gold + '◈', 'g');
        } catch (e) {
          log('beli farm deed gagal: ' + (e.message || e), 'y');
        }
      }
    }
    if (!hasFarm && !G._noFarmLogged) {
      G._noFarmLogged = true;
      log('Belum punya farm deed — skip farm/water/fertilize/seeds/unlock/animals', 'y');
    }
    if (hasFarm) G._noFarmLogged = false;

    // rotasi tanaman (dipakai beli benih & plant)
    const cropRot = CFG.questCropRotation || [CFG.crop || 'WHEAT'];

    // 1. Buy seeds — beli benih sesuai crop rotation yang stoknya habis (1 pack tiap crop)
    if (hasFarm && CFG.farm && CFG.autoBuySeeds && doAct()) {
      const crops = [...new Set(cropRot)];
      for (const c of crops) {
        if (seedCountOf(c) > 0) continue;
        const item = SEED_ITEM[c];
        if (!item) continue;
        const price = SEED_PRICE[item] || 5;
        
        const check = SAFETY.canSpend(price, G.gold);
        if (!check.ok) {
          log('Skip beli ' + item + ' (' + check.reason + ')', 'y');
          continue;
        }
        
        if (G.gold < price) {
          log('Skip beli ' + item + ' (gold ' + G.gold + '◈ < ' + price + '◈)', 'y');
          continue;
        }
        
        try {
          const r = await POST('/api/store/buy-gold', { playerId: PLAYER_ID, itemId: item });
          acts++;
          if (typeof r.gold === 'number') G.gold = r.gold;
          applySeedReply(r);
          if (!r.seedBag) { G.seedBag = G.seedBag || {}; G.seedBag[c] = (G.seedBag[c] || 0) + (SEED_PACK[item] || 1); }
          SAFETY.recordSpend(price);
          METRICS.rec('buy', { cost: price });
          log(`Beli ${item} → ${c} ${seedCountOf(c)} · gold ${G.gold}◈`, 'g');
        } catch (e) {
          log('beli ' + item + ': ' + e.message, 'y');
        }
        await sleep(rnd(CFG.politeWalkMs || [300, 800]));
      }
    }

    // 3-5. Farm cycle per plot: harvest → till → plant
    const maxPlotCfg = CFG.maxPlots || 3;
    let maxP = Math.min(mine.length, maxPlotCfg);
    if (hasFarm && CFG.farm && doAct()) {
      log('Crop rotation: ' + cropRot.join(' → '), 'c');
      // re-fetch to get fresh state
      try {
        const farm2 = await GET('/api/farm/' + PLAYER_ID);
        const P2 = farm2.player || {};
        if (typeof P2.gold === 'number') G.gold = P2.gold;
        if ('seeds' in P2 && typeof P2.seeds === 'number') G.seeds = P2.seeds;
        if (P2.seedBag) G.seedBag = P2.seedBag;
        const plots2 = farm2.plots || [];
        mine.length = 0;
        plots2.filter(p => !p.isLocked).forEach(p => mine.push(p));
        G._plots = mine.length;
        maxP = Math.min(mine.length, maxPlotCfg);
      } catch (e) { log('re-fetch farm: ' + e.message, 'y'); }

      let farmCount = 0;
      let pi = 0;

      // unlock plots dulu (kalau perlu)
      if (CFG.unlockPlots && mine.length < maxPlotCfg) {
        if (G.gold >= 25 && (!G.gear || !G.gear.hoe)) {
          try {
            const r = await POST('/api/store/buy-gold', { playerId: PLAYER_ID, itemId: 'hoe' });
            acts++; G.gear.hoe = true;
            if (typeof r.gold === 'number') G.gold = r.gold;
            log('Beli hoe 25◈', 'g');
          } catch (e) {}
        }
        if (G.gear && G.gear.hoe) {
          for (const p of plots.filter(x => x.isLocked)) {
            if (mine.length >= maxPlotCfg) break;
            try {
              await POST('/api/farm/till', { playerId: PLAYER_ID, plotId: p.id });
              acts++; mine.push(p);
              log('Plot terbuka → ' + mine.length + '/' + maxP, 'g');
            } catch (e) {
              if (/hoe/i.test(e.message)) {
                try { await POST('/api/store/buy-gold', { playerId: PLAYER_ID, itemId: 'hoe' }); G.gear.hoe = true; } catch (e2) {}
              }
              break;
            }
          }
        }
      }

      // loop per plot: harvest → till → plant (dengan jeda)
      for (const p of mine.slice(0, maxP)) {
        const st = action(p);

        // harvest → jeda → till → jeda → plant
        if (st === 'harvest' && CFG.farm) {
          try {
            const r = await POST('/api/farm/harvest', { playerId: PLAYER_ID, plotId: p.id });
            acts++; farmCount++;
            const res = r.result || {};
            const crop = res.cropType || p.cropType;
            const qty = res.qty ?? res.amount ?? 1;
            if (!res.blighted && crop) _pending[crop] = (_pending[crop] || 0) + qty;
            METRICS.rec('harvest', { crop, qty });
            log('Harvest ' + p.id + ' → ' + (crop || '?') + ' x' + qty, 'g');
            await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
            // till
            if (CFG.farm) {
              try {
                await POST('/api/farm/till', { playerId: PLAYER_ID, plotId: p.id });
                acts++;
                log('Till ' + p.id, 'g');
                await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
                // plant
                {
                  const ct = cropRot[pi % cropRot.length]; pi++;
                  if (seedCountOf(ct) > 0) {
                    try {
                      const rp = await POST('/api/farm/plant', { playerId: PLAYER_ID, plotId: p.id, cropType: ct });
                      acts++; farmCount++;
                      applySeedReply(rp);
                      METRICS.rec('plant', { crop: ct });
                      log('Plant ' + p.id + ' → ' + ct, 'g');
                    } catch (e) {}
                  } else log('Skip plant ' + p.id + ' → ' + ct + ' (benih habis/gold kurang)', 'y');
                }
              } catch (e) {}
            }
          } catch (e) { log('harvest ' + p.id + ': ' + e.message, 'y'); }
        }

        // till → jeda → plant
        else if (st === 'till' && CFG.farm) {
          try {
            await POST('/api/farm/till', { playerId: PLAYER_ID, plotId: p.id });
            acts++;
            log('Till ' + p.id, 'g');
            await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
            // plant
            {
              const ct = cropRot[pi % cropRot.length]; pi++;
              if (seedCountOf(ct) > 0) {
                try {
                  const rp = await POST('/api/farm/plant', { playerId: PLAYER_ID, plotId: p.id, cropType: ct });
                  acts++; farmCount++;
                  applySeedReply(rp);
                  log('Plant ' + p.id + ' → ' + ct, 'g');
                } catch (e) {}
              } else log('Skip plant ' + p.id + ' → ' + ct + ' (benih habis/gold kurang)', 'y');
            }
          } catch (e) { log('till ' + p.id + ': ' + e.message, 'y'); }
        }

        // plant
        else if (st === 'plant') {
          const ct = cropRot[pi % cropRot.length]; pi++;
          if (seedCountOf(ct) > 0) {
            try {
              const rp = await POST('/api/farm/plant', { playerId: PLAYER_ID, plotId: p.id, cropType: ct });
              acts++; farmCount++;
              applySeedReply(rp);
              log('Plant ' + p.id + ' → ' + ct, 'g');
            } catch (e) { log('plant ' + p.id + ': ' + e.message, 'y'); }
          } else log('Skip plant ' + p.id + ' → ' + ct + ' (benih habis/gold kurang)', 'y');
        }

        // jeda antar plot
        await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
      }

      log('Farm: ' + farmCount + ' aksi pada ' + maxP + ' plot', 'c');
    }

    // 6. Water — re-fetch dulu supaya data fresh
    let plotsFreshF = null;
    if (hasFarm && CFG.water && doAct()) {
      // re-fetch farm state untuk data fresh
      try {
        const farmW = await GET('/api/farm/' + PLAYER_ID);
        const PW = farmW.player || {};
        if (typeof PW.gold === 'number') G.gold = PW.gold;
        if ('seeds' in PW && typeof PW.seeds === 'number') G.seeds = PW.seeds;
        if (PW.seedBag) G.seedBag = PW.seedBag;
        const plotsW = farmW.plots || [];
        plotsFreshF = plotsW;
        // hanya plot 1..maxPlots (urut)
        const usableW = plotsW.filter(p => !p.isLocked).slice(0, maxPlotCfg);
        dry.length = 0;
        usableW.filter(p => action(p) === 'water').forEach(p => dry.push(p));
        if (farmW.can) G.can = farmW.can;
      } catch (e) {}

      if (dry.length) {
        // beli watering can kalau belum punya
        if (!G.can || G.can.owned === false) {
          try {
            const r = await POST('/api/store/buy-gold', { playerId: PLAYER_ID, itemId: 'buy_bucket' });
            acts++;
            if (typeof r.gold === 'number') G.gold = r.gold;
            G.can = { owned: true, charges: 10, max: 10 };
            log('Beli watering can 10◈', 'g');
          } catch (e) {
            log('beli watering can: ' + e.message, 'y');
          }
        }
        // refill kalau charges habis
        if (G.can && G.can.owned && (G.can.charges || 0) <= 0) {
          try {
            const r = await POST('/api/farm/refill', { playerId: PLAYER_ID, at: 'well' });
            acts++;
            if (r.can) G.can = r.can;
            log('Isi ulang watering can di well → ' + G.can.charges + '/' + G.can.max, 'g');
          } catch (e) { log('refill: ' + e.message, 'y'); }
        }
        // siram per plot
        if (G.can && G.can.owned && (G.can.charges || 0) > 0) {
          for (const p of dry) {
            if (!doAct()) break;
            try {
              const r = await POST('/api/farm/water', { playerId: PLAYER_ID, plotId: p.id });
              acts++;
              METRICS.rec('water');
              if (r.can) G.can = r.can;
              if (r.plot && r.plot.fertility != null) p.fertility = r.plot.fertility;
              if ((G.can.charges || 0) <= 0) break;
            } catch (e) { break; }
          }
        }
      }
    }

    // 6b. Fertilize — mandiri (tanpa perlu watering), naikkan kondisi sampai 100%
    if (hasFarm && CFG.fertilize && doAct()) {
      // pakai data fresh dari water kalau ada (hindari fetch ke-4); kalau tidak, fetch sendiri
      let plotsF = plotsFreshF;
      if (!plotsF) {
        try {
          const farmF = await GET('/api/farm/' + PLAYER_ID);
          if (farmF.player && typeof farmF.player.gold === 'number') G.gold = farmF.player.gold;
          if (farmF.player && farmF.player.seedBag) G.seedBag = farmF.player.seedBag;
          if (farmF.plots) plotsF = farmF.plots;
        } catch (e) {}
      }
      if (!plotsF) plotsF = plots;

      // hanya plot 1..maxPlots (urut), yang ditanami & kondisi < 100%
      const needFert = plotsF.filter(p => !p.isLocked).slice(0, maxPlotCfg).filter(p =>
        ['TILLED', 'PLANTED', 'GROWING'].includes(p.state) &&
        Number(p.fertility != null ? p.fertility : 0) < 1);

      for (const p of needFert) {
        if (!doAct()) break;
        let fert = Number(p.fertility != null ? p.fertility : 0);
        // sampai 100% (maks 4 bag = 100%)
        for (let k = 0; k < 4 && fert < 1; k++) {
          if (!doAct()) break;
          // pastikan punya fertilizer bag (8◈)
          if (!G.gear || (G.gear.fertilizerBags || 0) <= 0) {
            if (G.gold < 8) break;
            try {
              const rb = await POST('/api/store/buy-gold', { playerId: PLAYER_ID, itemId: 'buy_fertilizer' });
              acts++;
              if (typeof rb.gold === 'number') G.gold = rb.gold;
              if (!G.gear) G.gear = {};
              G.gear.fertilizerBags = (G.gear.fertilizerBags || 0) + 1;
              log('Beli fertilizer bag → ' + G.gear.fertilizerBags + ' bag · gold ' + G.gold + '◈', 'g');
            } catch (e) { break; }
          }
          try {
            const rf = await POST('/api/farm/fertilize', { playerId: PLAYER_ID, plotId: p.id });
            acts++;
            METRICS.rec('fertilize');
            if (rf.bags != null) G.gear.fertilizerBags = rf.bags;
            fert = rf.plot && rf.plot.fertility != null ? rf.plot.fertility : Math.min(1, fert + 0.25);
            p.fertility = fert;
            log('Fertilize plot ' + p.id + ' → ' + Math.round(fert * 100) + '% kondisi', 'g');
          } catch (e) { break; }
          await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
        }
      }
    }

    // 7. Parcels
    if (doAct()) {
      try {
        const r = await POST('/api/parcels/collect', { playerId: PLAYER_ID });
        acts++;
        if (r.gained) log('Parcel: ' + JSON.stringify(r.gained).slice(0, 100), 'g');
      } catch (e) {}
      await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
    }

    // 7b. Animals — collect + feed
    if (hasFarm && CFG.animals && G.animals && G.animals.length && doAct()) {
      for (const a of G.animals) {
        if (!doAct()) break;
        const id = a.id || a.animalId;
        // collect
        try {
          const r = await api('POST', '/api/animals/collect', { playerId: PLAYER_ID, animalId: id });
          acts++;
          METRICS.rec('animal_collect');
          if (r.qty) log('Animal collect ' + (a.type || '') + ': +' + r.qty, 'g');
        } catch (e) { /* not ready is normal */ }
        await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
        // feed
        try {
          await api('POST', '/api/animals/feed', { playerId: PLAYER_ID, animalId: id });
          acts++;
        } catch (e) { /* no feed is normal */ }
        await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
      }
    }

    // 8. Gather via world farm — gerakkan karakter ke node untuk harvest
    if (CFG.gather) {
      // auto-buy tools: coba beberapa kandidat ID sampai berhasil
      const TOOL_IDS = {
        basket: ['buy_basket', 'basket', 'forage_basket', 'wicker_basket'],
        axe: ['buy_axe', 'axe', 'wood_axe', 'hatchet'],
        pickaxe: ['buy_pickaxe', 'pickaxe', 'mine_pickaxe'],
      };
      G._toolsBought = G._toolsBought || {};
      const _toolRetryAt = G._toolRetryAt || 0;
      if (Date.now() >= _toolRetryAt) {
        let anyFailed = false;
        for (const tool of Object.keys(TOOL_IDS)) {
          if (G._toolsBought[tool]) continue;
          if (G.gear && G.gear[tool]) { G._toolsBought[tool] = true; continue; }
          let bought = false;
          for (const id of TOOL_IDS[tool]) {
            try {
              const r = await POST('/api/store/buy-gold', { playerId: PLAYER_ID, itemId: id });
              if (typeof r.gold === 'number') G.gold = r.gold;
              if (!G.gear) G.gear = {};
              G.gear[tool] = true;
              G._toolsBought[tool] = true;
              log('Beli ' + tool + ' (' + id + ') → gold ' + G.gold + '◈', 'g');
              bought = true;
              break;
            } catch (e) {
              const msg = e.message || '';
              // "already own" = sudah punya
              if (/already|owned|have/i.test(msg)) { G._toolsBought[tool] = true; if (G.gear) G.gear[tool] = true; bought = true; break; }
              // gold kurang → hentikan kandidat untuk alat ini
              if (/gold|florin|enough|insufficient/i.test(msg)) { log('beli ' + tool + ': ' + msg, 'y'); bought = true; break; }
              // ID salah → coba kandidat berikutnya (diam)
            }
            await sleep(rnd(CFG.politeWalkMs || [300, 800]));
          }
          if (!bought) anyFailed = true;
        }
        // kalau ada yang gagal (ID tidak dikenal), tunda 10 menit sebelum coba lagi
        if (anyFailed) G._toolRetryAt = Date.now() + 10 * 60 * 1000;
      }

      // zona tanpa alat: beach & swamp. basket→forest, axe→world+forest, pickaxe→mines
      const _gear = G.gear || {};
      const zones = ['beach', 'swamp'];
      if (_gear.basket || _gear.axe) zones.push('forest');
      if (_gear.axe) zones.push('world');
      if (_gear.pickaxe) zones.push('mines');
      if (!_gear.basket && !_gear.axe && !_gear.pickaxe) log('Belum punya alat — gather hanya di beach & swamp', 'y');
      else log('Zona gather: ' + zones.join(', '), 'c');
      G.worldNext = G.worldNext || {};
      for (const z of zones) {
        if (isCaptchaActive()) break;
        let dir = [];
        try {
          const w = await api('GET', '/api/world/' + z);
          // Ambil semua ore di mines (copper, iron, gold, diamond) dan semua jenis node
          dir = [
            ...((w && w.forage) || []).map(f => ({ ...f, type: 'forage' })),
            ...((w && w.spots) || []).map(s => ({ ...s, type: 'spot' })),
            ...((w && w.trees) || []).map(t => ({ x: t[0], y: t[1], name: t[2] || 'tree', item: t[2] || 'wood', type: 'tree' })),
            ...((w && w.rocks) || []).map(r => ({ x: r[0], y: r[1], name: 'rock', item: 'stone', type: 'rock' })),
            ...((w && w.ore) || []).map(o => ({ x: o[0], y: o[1], name: o[2], item: o[2], type: 'ore' }))
          ];
        } catch (e) { continue; }
        let nodes = {};
        try {
          const st = await api('GET', '/api/nodes/' + z);
          nodes = (st && st.nodes) || {};
        } catch (e) {}
        const now = Date.now();
        // syarat level (dari kode game): ore → Prospecting, pohon → Lumbering
        const ORE_LVL = { copper: 1, iron: 10, gold: 25, diamond: 40 };
        const TREE_LVL = { oak: 1, pine: 1, bigoak: 10, mangrove: 20, cypress: 35, fruit: 1, orange: 1, apple: 1 };
        const prospLvl = Number((G.skills && G.skills.prospecting && G.skills.prospecting.level) || 1);
        const lumberLvl = Number((G.skills && G.skills.lumbering && G.skills.lumbering.level) || 1);
        const siap = dir.filter(n => {
          if ((nodes[n.x + ',' + n.y] || 0) > now) return false;
          if (G.worldNext[z + ':' + n.x + ',' + n.y] > now) return false;
          // skip node yang level-nya belum cukup
          if (n.type === 'ore' && (ORE_LVL[n.name] || 1) > prospLvl) return false;
          if (n.type === 'tree' && (TREE_LVL[n.name] || 1) > lumberLvl) return false;
          return true;
        });

        for (const nd of siap.slice(0, 8)) {
          // 1. Cek kepemilikan alat; beach/swamp selalu bisa gather tanpa alat
          const toolFreeZone = (z === 'beach' || z === 'swamp');
          if ((nd.type === 'forage' || nd.type === 'spot') && !(_gear.basket || toolFreeZone)) continue;
          if (nd.type === 'tree' && !(_gear.axe || toolFreeZone)) continue;
          if ((nd.type === 'rock' || nd.type === 'ore') && !(_gear.pickaxe || toolFreeZone)) continue;

          // pindahkan posisi karakter ke node
          seatMove(nd.x, nd.y, z);
          await sleep(rnd(CFG.politeWalkMs || [1200, 3200]));
          try {
            // trees/rocks pakai socket.io interact, lainnya pakai REST API
            if ((nd.type === 'tree' || nd.type === 'rock') && SOCK && SOCK.connected && SEAT_OK) {
              SOCK.emit('player:interact', { x: nd.x, y: nd.y, zone: z });
              await sleep(1500);
              // coba juga world/harvest sebagai fallback
              try {
                const r = await api('POST', '/api/world/harvest', { playerId: PLAYER_ID, zone: z, x: nd.x, y: nd.y });
                gActs++;
                METRICS.rec('gather', { item: nd.item || nd.name, qty: 1 });
                if (r.inventoryExt) {
                  if (!G.inventoryExt) G.inventoryExt = {};
                  Object.assign(G.inventoryExt, r.inventoryExt);
                }
                G.worldNext[z + ':' + nd.x + ',' + nd.y] = Number(r.readyAt) || (Date.now() + 300000);
                const drops = Object.entries(r.drops || {}).map(([a, b]) => b + 'x ' + a).join(', ');
                if (drops) log(z + ' ' + (nd.name || '') + ' (' + nd.x + ',' + nd.y + '): ' + drops, 'g');
              } catch (e2) {}
            } else {
              const r = await api('POST', '/api/world/harvest', { playerId: PLAYER_ID, zone: z, x: nd.x, y: nd.y });
              gActs++;
              METRICS.rec('gather', { item: nd.item || nd.name, qty: 1 });
              if (r.inventoryExt) {
                if (!G.inventoryExt) G.inventoryExt = {};
                Object.assign(G.inventoryExt, r.inventoryExt);
              }
              G.worldNext[z + ':' + nd.x + ',' + nd.y] = Number(r.readyAt) || (Date.now() + 300000);
              const drops = Object.entries(r.drops || {}).map(([a, b]) => b + 'x ' + a).join(', ');
              if (drops) log(z + ' ' + (nd.name || '') + ' (' + nd.x + ',' + nd.y + '): ' + drops, 'g');
            }
          } catch (e) {
            G.worldNext[z + ':' + nd.x + ',' + nd.y] = Date.now() + 60000;
            const msg = e.message || '';
            if (/zone_closed|part of the map is not open/i.test(msg)) {
              break;
            } else if (/no_seat/i.test(msg)) {
              log('World: no_seat — seat belum siap', 'y');
              SEAT_OK = false;
              seatConnect();
              break;
            }
            // gagal gather (level belum cukup / alat / daily limit) → diamkan, tidak di-log
          }
          // jeda antar node
          await sleep(rnd(CFG.politeWalkMs || [1200, 3200]));
        }
      }
    }

    // 9. Jual GLD/florin dipindah ke doTradingPostActions (pemicu: jam in-game trading post buka)

    // 12. Craft
    if (CFG.autoCraft && doAct()) {
      for (const job of [...(G.craftJobs || [])]) {
        if (!doAct()) break;
        try {
          const r = await POST('/api/farm/craft/collect', { playerId: PLAYER_ID, jobId: job.id });
          acts++;
          G.craftJobs = G.craftJobs.filter(j => j.id !== job.id);
          METRICS.rec('craft', { recipe: job.recipe });
          log(`Craft ${job.recipe} selesai`, 'g');
        } catch (e) {}
        await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
      }
      const recipeId = CFG.craftRecipe || 'bread';
      const ENGING = { bread: { WHEAT: 3 }, stew: { WHEAT: 1, CARROT: 2, CORN: 1 }, wrap: { CORN: 2, CARROT: 1 }, ale: { WHEAT: 2, CORN: 2 }, fries: { POTATO: 3 }, salad: { TOMATO: 2, CARROT: 1 }, pie: { PUMPKIN: 1, WHEAT: 2 }, jam: { STRAWBERRY: 4 } };
      const ing = ENGING[recipeId] || {};
      // baca dari inventory server (bukan _pending) agar tidak bentrok dengan GLD sell
      const inv = G.inventory || {};
      const cukup = Object.entries(ing).every(([k, n]) => (Number(inv[k]) || 0) >= n);
      if (cukup && !(G.craftJobs || []).some(j => j.recipe === recipeId) && doAct()) {
        try {
          const r = await POST('/api/farm/craft', { playerId: PLAYER_ID, recipe: recipeId });
          acts++;
          const job = r.job || r;
          if (job && job.id) {
            G.craftJobs.push({ id: job.id, recipe: recipeId });
            log(`Mulai craft ${recipeId}`, 'g');
          }
        } catch (e) {}
      }
    }

    // 14. Claim quests — hanya yang belum diklaim hari ini
    if (CFG.claimQuests && doAct()) {
      const tkq = todayKey();
      if (G._questDay !== tkq) { G._questDay = tkq; G._claimedQ = new Set(); }
      if (!G._claimedQ) G._claimedQ = new Set();
      const DAILY = [
        { id: 'd1' }, { id: 'd2' }, { id: 'd11' }, { id: 'd13' }, { id: 'd16' }, { id: 'd12' },
      ];
      const WEEKLY = [
        { id: 'w1' }, { id: 'w2' }, { id: 'w3' }, { id: 'w5' },
      ];
      const all = [...DAILY, ...WEEKLY];
      for (const q of all) {
        if (!doAct()) break;
        if (G._claimedQ.has(q.id)) continue;
        try {
          const r = await POST('/api/player/quest/claim', { playerId: PLAYER_ID, questId: q.id, reward: {} });
          acts++;
          G._claimedQ.add(q.id);
          const rw = r.reward || {};
          G.gold += rw.gold || 0;
          G.seeds += rw.seeds || 0;
          if (typeof r.lumiBalance === 'number') G.lumi = r.lumiBalance;
          METRICS.rec('quest', { gold: rw.gold || 0 });
          log(`Quest ${q.id} claimed → +${rw.gold || 0}◈`, 'g');
        } catch (e) {
          const msg = (e.message || '').toLowerCase();
          // sudah diklaim / tidak tersedia → tandai agar tidak dicoba lagi hari ini
          if (/claim|already|done|complete/i.test(msg)) G._claimedQ.add(q.id);
        }
        await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
      }
    }

    acts += gActs;
    METRICS.cnt.passes++;
    status();
    return acts;
  }

  // ── GLD counter (port dari lumora-bot-bersih: rebutan window 10 menit) ──
  function nextLocalMidnight() {
    const d = new Date();
    d.setHours(24, 0, 5, 0);
    return d.getTime();
  }
  // Jadwal coba lagi saat jatah window habis: 45s pertama window coba tiap 4s,
  // selebihnya tunggu window berikutnya (min 15s) — hindari spam.
  function gldRetryAt(mkt) {
    const ws = (mkt && mkt.windowStart) || 0, wm = (mkt && mkt.windowMs) || 600000;
    if (!ws) return Date.now() + 60000;
    if (Date.now() - ws < 45000) return Date.now() + 4000;
    return Math.max(Date.now() + 15000, ws + wm + 1500);
  }
  function gldPricePer(m, k) {
    const row = ((m && m.prices) || {})[k] || {};
    return Number(row.gldNow || row.gld || 0);
  }
  // Susun batch sebesar mungkin sesuai kuota window (item termahal dulu).
  function gldBatchFit(m, sellable) {
    const items = {};
    let budget = Number((m && m.windowRemainingGld) || 0);
    for (const [k, n] of [...sellable].sort((a, b) => gldPricePer(m, b[0]) - gldPricePer(m, a[0]))) {
      const per = gldPricePer(m, k);
      if (!(per > 0)) continue;
      const muat = Math.floor(budget / per);
      const qty = Math.min(Number(n), muat);
      if (qty > 0) { items[k] = qty; budget -= qty * per; }
    }
    return items;
  }

  // Jual hasil panen ke GOLD COUNTER. Return true kalau ada penjualan.
  // Aman dari suspend: pacing POST (paceProd), jeda burst + jitter, gate poolFactor,
  // hormati limit harian (cap) & jatah window, backoff saat ramai.
  async function sellGldCounter() {
    const gldTarget = Number(CFG.gldTargetGld || 0);
    const sellable0 = Object.entries(_pending).filter(([, q]) => q > 0);
    if (!sellable0.length) return false;

    let mkt = null;
    try { mkt = await GET('/api/market/prices'); } catch (e) { return false; }
    if (!mkt || mkt.open === false) return false;

    const gldSaldo = Number(G.gld || 0);
    const gldCukupTarget = gldTarget > 0 && gldSaldo >= gldTarget;
    const bolehJalan = CFG.sellGld && !gldCukupTarget && Date.now() >= (G._gldBlockedUntil || 0);

    // Pre-empt boundary window: kalau sisa jatah tak cukup 1 unit & window mau ganti,
    // tunggu di depan boundary lalu tembak — supaya datang lebih dulu sebelum diserobot.
    if (bolehJalan) {
      const gldUsd = Number(mkt.gldUsd || 0);
      const hargaUnit = sellable0.map(([k]) => gldPricePer(mkt, k)).filter(p => p > 0).sort((a, b) => a - b)[0] || 0;
      const sisaUsd = Number(mkt.windowRemainingGld || 0) * gldUsd;
      const sampaiGanti = (Number(mkt.windowStart || 0) + Number(mkt.windowMs || 600000)) - Date.now();
      if (hargaUnit > 0 && gldUsd > 0 && sisaUsd < hargaUnit * gldUsd && sampaiGanti > 500 && sampaiGanti < (CFG.gldBurstMs || 45000)) {
        log(`⏳ window GLD tinggal ${(sampaiGanti / 1000).toFixed(0)}s & jatah $${sisaUsd.toFixed(4)} tak cukup 1 unit — tunggu window baru`, 'y');
        await waitFor(sampaiGanti + 350);
        try { mkt = await GET('/api/market/prices'); } catch (e) {}
      }
    }

    const minFactor = CFG.gldMinFactor != null ? CFG.gldMinFactor : 0.5;
    const ready = CFG.sellGld && !gldCukupTarget && mkt && sellable0.length &&
      Number(mkt.poolFactor || 0) >= minFactor &&
      Date.now() >= (G._gldBlockedUntil || 0);
    if (!ready) return false;

    log(`🪙 rebutan jatah window GLD · pool ${mkt.poolFactor}x · sisa $${(Number(mkt.windowRemainingGld || 0) * Number(mkt.gldUsd || 0)).toFixed(4)}`, 'c');
    const burstEnd = Date.now() + (CFG.gldBurstMs || 45000);
    let wins = 0;
    for (let i = 0; i < (CFG.gldBurstMax || 12) && Date.now() < burstEnd && running && !stopFlag; i++) {
      let m = mkt;
      if (i > 0) { try { m = await GET('/api/market/prices'); mkt = m; } catch (e) {} }
      const cur = Object.entries(_pending).filter(([, q]) => q > 0);
      const items = gldBatchFit(m, cur);
      if (!Object.keys(items).length) {
        if (i === 0) log('🪙 jatah window belum cukup 1 unit — tunggu window berikutnya', 'y');
        await sleep((CFG.gldBurstGapMs || 1500) + rnd([0, 800]));
        continue;
      }
      try {
        const r = await POST('/api/market/sell-gld', { playerId: PLAYER_ID, items });
        wins++;
        for (const k of Object.keys(items)) delete _pending[k];
        if (typeof r.gldBalance === 'number') G.gld = r.gldBalance;
        const earned = Number(r.gldEarned || 0), usd = Number(r.usdEarned || 0);
        METRICS.rec('gld_sell', { gld: earned, usd });
        log(`🪙 GLD counter: +${earned.toFixed(8)} GLD ($${usd.toFixed(2)}) · saldo ${Number(r.gldBalance || 0).toFixed(8)}${gldTarget ? '/' + gldTarget : ''} · pool ${m.poolFactor}x${r.stop ? ' · stop=' + r.stop : ''}`, 'g');
        if (gldTarget > 0 && Number(r.gldBalance || 0) >= gldTarget) { log('🎯 target GLD tercapai', 'g'); break; }
        if (r.stop === 'cap') { G._gldBlockedUntil = nextLocalMidnight(); log('🪙 limit harian gold counter — berhenti sampai besok', 'y'); break; }
        if (r.stop === 'window') { G._gldBlockedUntil = gldRetryAt(m); log('🪙 jatah window habis — tunggu jadwal berikutnya', 'y'); break; }
      } catch (e) {
        const msg = e.message || '';
        if (/daily|limit/i.test(msg)) { G._gldBlockedUntil = nextLocalMidnight(); log('🪙 limit harian: ' + msg, 'y'); break; }
        if (/window is spent|Nothing sold/i.test(msg)) { G._gldBlockedUntil = gldRetryAt(m); log('🪙 jatah window habis', 'y'); break; }
        log('GLD counter gagal: ' + msg, 'y');
        break;
      }
      await sleep((CFG.gldBurstGapMs || 1500) + rnd([0, 800]));
    }
    return wins > 0;
  }

  // Aksi penjualan saat trading post buka (pemicu: jam in-game)
  // Urutan: GLD → wild → auto convert
  async function doTradingPostActions() {
    // Pemicu: trading post buka (jam in-game). Urutan: GLD → wild → convert.
    // ── Sell GLD ──
    if (CFG.sellGld) await sellGldCounter();

    // ── Sell wild ──
    if (CFG.sellWild) {
      const ext = G.inventoryExt || {};
      const items = {};
      for (const [k, v] of Object.entries(ext)) {
        const n = Math.floor(Number(v) || 0);
        if (n > 0) items[k] = n;
      }
      if (Object.keys(items).length) {
        try {
          const r = await POST('/api/market/sell-ext', { playerId: PLAYER_ID, items });
          if (r.inventoryExt) G.inventoryExt = r.inventoryExt;
          else for (const k of Object.keys(items)) delete ext[k];
          if (typeof r.gold === 'number') G.gold = r.gold;
          METRICS.rec('wild_sell', { gold: r.earned || 0 });
          log(`Jual wild → +${r.earned}◈ · gold ${G.gold}◈`, 'g');
        } catch (e) {
          if (!/Daily|limit/i.test(e.message)) log('jual wild: ' + (e.message || e), 'y');
        }
      }
    }

    // ── 3. Auto convert (sisakan keepFlorins) ──
    const _keep = CFG.keepFlorins != null ? CFG.keepFlorins : 200;
    if (CFG.autoConvert && G.gold >= _keep + 100) {
      let c = null;
      try { c = await GET('/api/store/coins'); } catch (e) {}
      if (c && c.open && (c.lumiPerGold || 0) >= (CFG.convertMinRate || 0.5)) {
        let n = 0;
        // convert terus sampai sisa gold < keepFlorins (default 200), guard 500x
        while (G.gold >= _keep + 100 && n < 500) {
          try {
            const r = await POST('/api/market/convert', { playerId: PLAYER_ID });
            n++;
            const before = G.gold;
            G.gold = typeof r.gold === 'number' ? r.gold : G.gold - 100;
            G.lumi = r.lumiBalance;
            METRICS.rec('convert', { lumi: r.lumiGain || 0 });
            log(`Convert 100◈ → ${r.lumiGain} LUMI · total ${r.lumiBalance} · sisa ${G.gold}◈`, 'g');
            if (!(G.gold < before)) break;
          } catch (e) { break; }
          await sleep(rnd(CFG.politeWalkMs || [600, 1500]));
        }
      }
    }
  }

  let _gldLoopRunning = false;
  async function gldLoop() {
    if (_gldLoopRunning) return;
    _gldLoopRunning = true;
    log('Selling loop aktif (GLD counter / convert / wild)', 'c');
    while (running && !stopFlag) {
      if (!shopOpen()) {
        // tunggu tepat sampai trading post buka (berbasis jam in-game), bukan polling tiap 5s
        const wait = msToShopOpen();
        log('Trading post tutup — tunggu ' + Math.max(1, Math.round(wait / 60000)) + 'm sampai buka', 'c');
        await waitFor(wait + 1000);
        G._shopHandled = false;
        continue;
      }
      if (!G._shopHandled) {
        G._shopHandled = true;
        // tunggu pass selesai agar tidak bentrok di _pending / inventoryExt
        while (running && !stopFlag && _passing) await sleep(500);
        if (!running || stopFlag) break;
        log('🏪 Trading post BUKA (in-game ' + gameClockStr() + ') — jual GLD + wild + convert', 'g');
        _selling = true;
        try { await doTradingPostActions(); } finally { _selling = false; }
      }
      // tunggu sampai toko tutup; reset flag hanya kalau benar-benar sudah tutup
      await waitFor(msToShopClose() + 1000);
      if (!shopOpen()) G._shopHandled = false;
    }
    _gldLoopRunning = false;
  }

  async function loop() {
    if (!running) return;
    stopFlag = false;

    const ok = await login();
    if (!ok) { running = false; status(); return; }

    log('Bot dimulai!', 'g');
    gldLoop(); // start GLD counter + auto convert + sell wild
    while (running && !stopFlag) {
      if (Date.now() < RL_UNTIL) {
        await sleep(Math.min(RL_UNTIL - Date.now(), 30000));
        continue;
      }
      // tunggu proses jual selesai supaya tidak bentrok di state bersama
      while (running && !stopFlag && _selling) await sleep(500);
      if (!running || stopFlag) break;
      _passing = true;
      const t0 = Date.now();
      try {
        const acts = await pass();
        _lastPassActs = acts;
        _passCount++;
        _actsTotal += acts;
        const nextMs = CFG.polite ? rnd(CFG.politePassMs || [25000, 50000]) : 30000;
        log(`pass #${_passCount} selesai · ${acts} aksi · ${((Date.now() - t0) / 1000).toFixed(1)}s · next ${(nextMs / 1000).toFixed(0)}s`, 'c');
        status();
        await sleep(nextMs);
      } catch (e) {
        log('pass error: ' + e.message, 'r');
        await sleep(10000);
      } finally {
        _passing = false;
      }
    }
    log('Bot berhenti.', 'y');
    running = false;
    status();
  }

  function startBot() {
    if (running) return;
    running = true;
    stopFlag = false;
    status();
    loop();
  }
  function stopBot() {
    stopFlag = true;
    running = false;
    log('Stopping bot...', 'y');
    status();
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data;
    if (d.type === 'LUMORA_EXT_TOGGLE') {
      if (running) stopBot(); else startBot();
    }
    if (d.type === 'LUMORA_EXT_SET_CONFIG') {
      Object.assign(CFG, d.config);
    }
    if (d.type === 'LUMORA_EXT_REQUEST_STATUS') {
      status();
    }
  });

  // wait for config from content.js (chrome.storage not available in page context)
  log('Extension loaded. Waiting for config...', 'c');
  status();
  emit('LUMORA_EXT_REQUEST_CONFIG', {});
})();
