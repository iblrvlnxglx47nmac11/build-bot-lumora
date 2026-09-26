// ═══════════════════════════════════════════════════════════════════════
// LUMORA BOT - METRICS & PROFIT TRACKING
// Track earnings, ROI, efficiency per hour
// ═══════════════════════════════════════════════════════════════════════

export class MetricsTracker {
  constructor() {
    this.session = {
      startTime: Date.now(),
      startGold: 0,
      startLumi: 0,
      startGld: 0,
    };

    this.counters = {
      passes: 0,
      actions: 0,
      harvests: 0,
      plants: 0,
      waterActions: 0,
      fertilizeActions: 0,
      gatherActions: 0,
      craftCompleted: 0,
      questsClaimed: 0,
      gldSales: 0,
      wildSales: 0,
      converts: 0,
      toolsBought: 0,
      seedsBought: 0,
      plotsUnlocked: 0,
      animalCollects: 0,
    };

    this.earnings = {
      goldEarned: 0,
      goldSpent: 0,
      lumiEarned: 0,
      gldEarned: 0,
      gldSoldUsd: 0,
    };

    this.crops = {};
    this.gathered = {};
    this.crafted = {};

    this.hourly = [];
  }

  startSession(gold, lumi, gld) {
    this.session.startTime = Date.now();
    this.session.startGold = gold || 0;
    this.session.startLumi = lumi || 0;
    this.session.startGld = gld || 0;
  }

  recordAction(type, data = {}) {
    this.counters.actions++;
    
    switch (type) {
      case 'harvest':
        this.counters.harvests++;
        if (data.crop && data.qty) {
          this.crops[data.crop] = (this.crops[data.crop] || 0) + data.qty;
        }
        break;
      
      case 'plant':
        this.counters.plants++;
        break;
      
      case 'water':
        this.counters.waterActions++;
        break;
      
      case 'fertilize':
        this.counters.fertilizeActions++;
        break;
      
      case 'gather':
        this.counters.gatherActions++;
        if (data.item && data.qty) {
          this.gathered[data.item] = (this.gathered[data.item] || 0) + data.qty;
        }
        break;
      
      case 'craft_complete':
        this.counters.craftCompleted++;
        if (data.recipe) {
          this.crafted[data.recipe] = (this.crafted[data.recipe] || 0) + 1;
        }
        break;
      
      case 'quest_claim':
        this.counters.questsClaimed++;
        if (data.gold) this.earnings.goldEarned += data.gold;
        break;
      
      case 'gld_sale':
        this.counters.gldSales++;
        if (data.gld) this.earnings.gldEarned += data.gld;
        if (data.usd) this.earnings.gldSoldUsd += data.usd;
        break;
      
      case 'wild_sale':
        this.counters.wildSales++;
        if (data.gold) this.earnings.goldEarned += data.gold;
        break;
      
      case 'convert':
        this.counters.converts++;
        if (data.lumi) this.earnings.lumiEarned += data.lumi;
        break;
      
      case 'buy_tool':
        this.counters.toolsBought++;
        if (data.cost) this.earnings.goldSpent += data.cost;
        break;
      
      case 'buy_seeds':
        this.counters.seedsBought++;
        if (data.cost) this.earnings.goldSpent += data.cost;
        break;
      
      case 'unlock_plot':
        this.counters.plotsUnlocked++;
        break;
      
      case 'animal_collect':
        this.counters.animalCollects++;
        break;
    }
  }

  recordPass() {
    this.counters.passes++;
  }

  snapshotHourly(gold, lumi, gld) {
    const now = Date.now();
    const elapsed = now - this.session.startTime;
    
    this.hourly.push({
      time: now,
      elapsed,
      gold,
      lumi,
      gld,
      passes: this.counters.passes,
      actions: this.counters.actions,
    });
    
    // Keep last 24 hours
    if (this.hourly.length > 24) {
      this.hourly.shift();
    }
  }

  getStats(currentGold, currentLumi, currentGld) {
    const elapsed = Date.now() - this.session.startTime;
    const hours = elapsed / 3600000;
    
    const goldNet = (currentGold - this.session.startGold) + this.earnings.goldEarned - this.earnings.goldSpent;
    const lumiNet = (currentLumi - this.session.startLumi) + this.earnings.lumiEarned;
    const gldNet = (currentGld - this.session.startGld) + this.earnings.gldEarned;
    
    return {
      session: {
        uptime: this.formatDuration(elapsed),
        uptimeMs: elapsed,
        hours: hours.toFixed(2),
      },
      
      totals: {
        passes: this.counters.passes,
        actions: this.counters.actions,
        harvests: this.counters.harvests,
        plants: this.counters.plants,
        gathers: this.counters.gatherActions,
        crafts: this.counters.craftCompleted,
        quests: this.counters.questsClaimed,
      },
      
      earnings: {
        goldNet: goldNet.toFixed(0),
        goldEarned: this.earnings.goldEarned.toFixed(0),
        goldSpent: this.earnings.goldSpent.toFixed(0),
        lumiNet: lumiNet.toFixed(4),
        gldNet: gldNet.toFixed(8),
        gldUsd: this.earnings.gldSoldUsd.toFixed(2),
      },
      
      rates: {
        actionsPerHour: hours > 0 ? (this.counters.actions / hours).toFixed(1) : '0',
        harvestsPerHour: hours > 0 ? (this.counters.harvests / hours).toFixed(1) : '0',
        gathersPerHour: hours > 0 ? (this.counters.gatherActions / hours).toFixed(1) : '0',
        goldPerHour: hours > 0 ? (goldNet / hours).toFixed(0) : '0',
        lumiPerHour: hours > 0 ? (lumiNet / hours).toFixed(4) : '0',
        gldPerHour: hours > 0 ? (gldNet / hours).toFixed(8) : '0',
      },
      
      efficiency: {
        actionsPerPass: this.counters.passes > 0 ? (this.counters.actions / this.counters.passes).toFixed(1) : '0',
        harvestsPerPass: this.counters.passes > 0 ? (this.counters.harvests / this.counters.passes).toFixed(1) : '0',
      },
      
      crops: this.crops,
      gathered: this.gathered,
      crafted: this.crafted,
    };
  }

  formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  }

  getSummary(currentGold, currentLumi, currentGld) {
    const stats = this.getStats(currentGold, currentLumi, currentGld);
    
    return {
      uptime: stats.session.uptime,
      passes: stats.totals.passes,
      actions: stats.totals.actions,
      goldNet: stats.earnings.goldNet + '◈',
      lumiNet: stats.earnings.lumiNet,
      gldNet: stats.earnings.gldNet + ' GLD',
      gldUsd: '$' + stats.earnings.gldUsd,
      goldPerHour: stats.rates.goldPerHour + '◈/h',
      actionsPerPass: stats.efficiency.actionsPerPass,
    };
  }

  reset() {
    this.counters = {
      passes: 0,
      actions: 0,
      harvests: 0,
      plants: 0,
      waterActions: 0,
      fertilizeActions: 0,
      gatherActions: 0,
      craftCompleted: 0,
      questsClaimed: 0,
      gldSales: 0,
      wildSales: 0,
      converts: 0,
      toolsBought: 0,
      seedsBought: 0,
      plotsUnlocked: 0,
      animalCollects: 0,
    };
    
    this.earnings = {
      goldEarned: 0,
      goldSpent: 0,
      lumiEarned: 0,
      gldEarned: 0,
      gldSoldUsd: 0,
    };
    
    this.crops = {};
    this.gathered = {};
    this.crafted = {};
  }
}
