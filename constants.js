// ═══════════════════════════════════════════════════════════════════════
// LUMORA BOT - CONSTANTS & GAME DATA
// ═══════════════════════════════════════════════════════════════════════

export const GAME = {
  SERVER: 'https://lumora-server-production-8362.up.railway.app',
  DAY_LEN_MS: 20 * 60 * 1000, // 1 hari in-game = 20 menit real
  SHOP_OPEN_H: 5,   // jam buka trading post (in-game)
  SHOP_CLOSE_H: 18, // jam tutup
};

export const SEED_ITEM = {
  WHEAT: 'seeds_wheat',
  CARROT: 'seeds_carrot',
  STRAWBERRY: 'seeds_straw',
  POTATO: 'seeds_potato',
  TOMATO: 'seeds_tomato',
  CORN: 'seeds_corn',
  RICE: 'seeds_rice',
  SUNFLOWER: 'seeds_sun',
  PUMPKIN: 'seeds_pumpkin',
};

export const SEED_PRICE = {
  seeds_wheat: 5,
  seeds_carrot: 48,
  seeds_straw: 50,
  seeds_potato: 56,
  seeds_tomato: 60,
  seeds_corn: 86,
  seeds_rice: 75,
  seeds_sun: 64,
  seeds_pumpkin: 65,
};

export const SEED_PACK = {
  seeds_wheat: 5,
  seeds_carrot: 3,
  seeds_straw: 5,
  seeds_potato: 4,
  seeds_tomato: 3,
  seeds_corn: 2,
  seeds_rice: 3,
  seeds_sun: 2,
  seeds_pumpkin: 1,
};

export const TOOL_PRICE = {
  hoe: 25,
  watering_can: 10,
  fertilizer_bag: 8,
  basket: 50,
  axe: 100,
  pickaxe: 150,
};

export const TOOL_IDS = {
  basket: ['buy_basket', 'basket', 'forage_basket', 'wicker_basket'],
  axe: ['buy_axe', 'axe', 'wood_axe', 'hatchet'],
  pickaxe: ['buy_pickaxe', 'pickaxe', 'mine_pickaxe'],
};

export const CRAFT_RECIPES = {
  bread: { WHEAT: 3 },
  stew: { WHEAT: 1, CARROT: 2, CORN: 1 },
  wrap: { CORN: 2, CARROT: 1 },
  ale: { WHEAT: 2, CORN: 2 },
  fries: { POTATO: 3 },
  salad: { TOMATO: 2, CARROT: 1 },
  pie: { PUMPKIN: 1, WHEAT: 2 },
  jam: { STRAWBERRY: 4 },
};

export const SKILL_REQUIREMENTS = {
  ore: {
    copper: 1,
    iron: 10,
    gold: 25,
    diamond: 40,
  },
  tree: {
    oak: 1,
    pine: 1,
    bigoak: 10,
    mangrove: 20,
    cypress: 35,
    fruit: 1,
    orange: 1,
    apple: 1,
  },
};

export const QUESTS = {
  daily: [
    { id: 'd1' },
    { id: 'd2' },
    { id: 'd11' },
    { id: 'd13' },
    { id: 'd16' },
    { id: 'd12' },
  ],
  weekly: [
    { id: 'w1' },
    { id: 'w2' },
    { id: 'w3' },
    { id: 'w5' },
  ],
};

export const DEFAULTS = {
  MAX_PLOTS: 5,  // AGGRESSIVE: More plots
  KEEP_FLORINS: 150,  // AGGRESSIVE: Keep less gold
  GLD_TARGET: 0.1,  // AGGRESSIVE: Higher target
  GLD_BURST_MS: 30000,  // AGGRESSIVE: 30s burst (faster)
  GLD_BURST_GAP_MS: 1000,  // AGGRESSIVE: 1s gap (rapid-fire)
  GLD_BURST_MAX: 20,  // AGGRESSIVE: More attempts
  GLD_MIN_FACTOR: 0.3,  // AGGRESSIVE: Accept lower pool
  CONVERT_MIN_RATE: 0.5,
  POLITE_PASS_MS: [20000, 40000],  // AGGRESSIVE: Faster passes
  POLITE_GAP_MS: [1200, 3000],  // AGGRESSIVE: Faster action gaps
  POLITE_WALK_MS: [400, 1200],  // AGGRESSIVE: Faster walk
  POLITE_MAX_ACTIONS: 15,  // AGGRESSIVE: More actions/pass
  MAX_ACTIONS_PER_PASS: 50,
  CROP: 'WHEAT',
  CRAFT_RECIPE: 'bread',
};
