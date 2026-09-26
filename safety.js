// ═══════════════════════════════════════════════════════════════════════
// LUMORA BOT - SAFETY SYSTEM
// Prevent overspending, detect anomalies, enforce hard limits
// ═══════════════════════════════════════════════════════════════════════

export class SafetySystem {
  constructor(config = {}) {
    this.limits = {
      minGoldReserve: config.minGoldReserve || 50, // jangan habiskan semua gold
      maxSpendPerPass: config.maxSpendPerPass || 500, // maks spend per cycle
      maxSpendPerHour: config.maxSpendPerHour || 2000, // hourly spend limit
      maxToolBuyRetry: config.maxToolBuyRetry || 3,
      maxCraftFails: config.maxCraftFails || 5,
      maxSellFails: config.maxSellFails || 10,
      emergencyStopGold: config.emergencyStopGold || 10, // stop kalau gold < 10
    };
    
    this.state = {
      spendThisPass: 0,
      spendThisHour: 0,
      hourStartTime: Date.now(),
      toolBuyAttempts: {},
      craftFailCount: 0,
      sellFailCount: 0,
      anomalyDetected: false,
      emergencyStop: false,
    };

    this.history = {
      goldSnapshots: [], // track gold over time
      spendLog: [],
    };
  }

  resetPassSpend() {
    this.state.spendThisPass = 0;
  }

  checkHourlyReset() {
    if (Date.now() - this.state.hourStartTime > 3600000) {
      this.state.spendThisHour = 0;
      this.state.hourStartTime = Date.now();
    }
  }

  canSpend(amount, currentGold) {
    this.checkHourlyReset();
    
    // Emergency stop
    if (currentGold <= this.limits.emergencyStopGold) {
      this.state.emergencyStop = true;
      return { allowed: false, reason: 'emergency_stop_low_gold' };
    }

    // Reserve check
    if (currentGold - amount < this.limits.minGoldReserve) {
      return { allowed: false, reason: 'insufficient_reserve' };
    }

    // Pass limit
    if (this.state.spendThisPass + amount > this.limits.maxSpendPerPass) {
      return { allowed: false, reason: 'pass_limit_exceeded' };
    }

    // Hourly limit
    if (this.state.spendThisHour + amount > this.limits.maxSpendPerHour) {
      return { allowed: false, reason: 'hourly_limit_exceeded' };
    }

    return { allowed: true };
  }

  recordSpend(amount, item, currentGold) {
    this.state.spendThisPass += amount;
    this.state.spendThisHour += amount;
    this.state.spendLog.push({
      time: Date.now(),
      amount,
      item,
      goldAfter: currentGold,
    });
    
    // Keep last 100 entries
    if (this.state.spendLog.length > 100) {
      this.state.spendLog.shift();
    }
  }

  recordGoldSnapshot(gold) {
    this.history.goldSnapshots.push({
      time: Date.now(),
      gold,
    });
    
    // Keep last 50 snapshots
    if (this.history.goldSnapshots.length > 50) {
      this.history.goldSnapshots.shift();
    }
  }

  detectAnomaly(currentGold) {
    if (this.history.goldSnapshots.length < 3) return false;
    
    const recent = this.history.goldSnapshots.slice(-3);
    const drops = recent.filter((s, i) => {
      if (i === 0) return false;
      return s.gold < recent[i - 1].gold - 500; // drop > 500 gold
    });
    
    if (drops.length >= 2) {
      this.state.anomalyDetected = true;
      return true;
    }
    
    return false;
  }

  recordToolBuyAttempt(tool, success) {
    if (!this.state.toolBuyAttempts[tool]) {
      this.state.toolBuyAttempts[tool] = { attempts: 0, lastAttempt: 0 };
    }
    
    if (success) {
      this.state.toolBuyAttempts[tool].attempts = 0;
    } else {
      this.state.toolBuyAttempts[tool].attempts++;
      this.state.toolBuyAttempts[tool].lastAttempt = Date.now();
    }
  }

  canRetryToolBuy(tool) {
    const attempts = this.state.toolBuyAttempts[tool];
    if (!attempts) return true;
    
    if (attempts.attempts >= this.limits.maxToolBuyRetry) {
      // Allow retry after 10 minutes
      if (Date.now() - attempts.lastAttempt > 600000) {
        attempts.attempts = 0;
        return true;
      }
      return false;
    }
    
    return true;
  }

  recordCraftResult(success) {
    if (success) {
      this.state.craftFailCount = 0;
    } else {
      this.state.craftFailCount++;
    }
  }

  recordSellResult(success) {
    if (success) {
      this.state.sellFailCount = 0;
    } else {
      this.state.sellFailCount++;
    }
  }

  isHealthy() {
    if (this.state.emergencyStop) return false;
    if (this.state.anomalyDetected) return false;
    if (this.state.craftFailCount >= this.limits.maxCraftFails) return false;
    if (this.state.sellFailCount >= this.limits.maxSellFails) return false;
    return true;
  }

  getStatus() {
    return {
      healthy: this.isHealthy(),
      spendThisPass: this.state.spendThisPass,
      spendThisHour: this.state.spendThisHour,
      emergencyStop: this.state.emergencyStop,
      anomalyDetected: this.state.anomalyDetected,
      craftFailStreak: this.state.craftFailCount,
      sellFailStreak: this.state.sellFailCount,
    };
  }

  reset() {
    this.state.emergencyStop = false;
    this.state.anomalyDetected = false;
    this.state.craftFailCount = 0;
    this.state.sellFailCount = 0;
  }
}
