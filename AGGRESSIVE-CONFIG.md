# 🔥 AGGRESSIVE CONFIG - GLD MAXIMIZER

**Bot Lumora versi aggressive untuk maximize GLD earnings**

---

## ⚡ Perubahan dari Default

### 🪙 GLD Counter (Most Important!)

| Setting | Default | Aggressive | Impact |
|---------|---------|------------|--------|
| **Sell GLD** | ❌ OFF | ✅ **ON** | Enable GLD sales |
| **Burst Duration** | 45s | **30s** | Lebih cepat selesai, datang duluan next window |
| **Burst Gap** | 1.5s | **1s** | Rapid-fire attempts (20 req/30s) |
| **Burst Max** | 12 attempts | **20 attempts** | More tries per window |
| **Min Pool Factor** | 0.5x | **0.3x** | Accept pool yang lebih depleted |
| **GLD Target** | 0.015 | **0.1** | Target lebih tinggi (6.6x) |

**Why Aggressive?**
- 1s gap = 20 req dalam 30s (vs 12 req dalam 45s)
- Pool 0.3x = masih profitable, less competition
- Target 0.1 = bot ga stop terlalu cepat

---

### 🌾 Farming

| Setting | Default | Aggressive | Impact |
|---------|---------|------------|--------|
| **Max Plots** | 3 | **5** | More harvests/hour |
| **Crop Rotation** | WHEAT | **WHEAT + CARROT** | Better value crops |
| **Keep Florins** | 200 | **150** | More gold available for convert/spend |

**Why Aggressive?**
- 5 plots = 66% more harvests
- CARROT = higher sell value (48◈/pack vs 5◈)
- Keep 150 = still safe, tapi ga terlalu conservative

---

### 🤖 Polite Mode (Speed Up)

| Setting | Default | Aggressive | Impact |
|---------|---------|------------|--------|
| **Pass Interval** | 25-50s | **20-40s** | Faster cycles (20% faster) |
| **Action Gap** | 1.5-4s | **1.2-3s** | Faster actions (20% faster) |
| **Walk Delay** | 600-1500ms | **400-1200ms** | Faster movement |
| **Max Actions/Pass** | 12 | **15** | More actions per cycle |

**Why Aggressive?**
- 20s min pass = 3 passes/min (vs 2.4 passes/min)
- 1.2s min gap = still humanlike, tapi ga lambat
- 15 acts/pass = maximize efficiency

---

## 📊 Expected Performance

### Default Config:
- Pass interval: ~37.5s avg
- Actions/pass: 12
- Actions/hour: ~1,150
- GLD sales: **DISABLED**

### Aggressive Config:
- Pass interval: **~30s avg** (20% faster)
- Actions/pass: **15** (25% more)
- Actions/hour: **~1,800** (56% increase!)
- GLD sales: **ENABLED** (0-0.005 GLD/hour tergantung competition)

---

## 🎯 GLD Earning Potential

**Best Case (Low Competition):**
- Window: 0.01 GLD available
- Success rate: 40-60%
- Earnings: **0.004-0.006 GLD/hour**
- USD value: **$2-3/hour** @ $500/GLD

**Average Case (Medium Competition):**
- Window: 0.005-0.01 GLD
- Success rate: 20-40%
- Earnings: **0.001-0.003 GLD/hour**
- USD value: **$0.50-1.50/hour**

**Worst Case (High Competition):**
- Window: 0.001-0.005 GLD
- Success rate: 5-20%
- Earnings: **0.0002-0.001 GLD/hour**
- USD value: **$0.10-0.50/hour**

---

## ⚠️ Risks & Mitigation

### 1. Detection Risk
**Risk:** Faster timing = lebih terlihat seperti bot  
**Mitigation:**
- Polite mode tetap ON (random delays)
- Gap masih 1.2-3s (humanlike)
- Action limit 15/pass (reasonable)

### 2. Pool Depletion
**Risk:** Pool factor 0.3x = pool lagi low, harga GLD turun  
**Mitigation:**
- Bot auto-skip kalau < 0.3x
- Pre-empt window boundary (datang duluan)
- Burst hanya 30s (ga terlalu lama)

### 3. Rate Limit
**Risk:** 20 req dalam 30s = 0.67 req/s (bisa kena rate limit)  
**Mitigation:**
- Server lumora rate limit: ~15s cooldown per hit
- Bot udah ada backoff logic
- SAFETY system limit spend/hour

### 4. Gold Depletion
**Risk:** Keep 150 (vs 200) = less buffer  
**Mitigation:**
- SAFETY emergency stop @ 10◈
- SAFETY reserve @ 50◈
- Spend limit 500◈/pass, 2000◈/hour

---

## 🚀 Usage

1. **Load extension** (uninstall old, load folder baru)
2. **Check config** di popup (seharusnya udah aggressive by default)
3. **Start bot**
4. **Monitor Metrics tab**:
   - Gold/hour should be higher
   - GLD sales counter should increment
   - Watch spend/pass & spend/hour (jangan melebihi limits)

---

## 🔧 Fine-Tuning

### Kalau GLD sale terlalu sering gagal:
```javascript
gldMinFactor: 0.4  // Naikin dari 0.3 → 0.4 (lebih selective)
gldBurstMax: 15     // Turunin dari 20 → 15 (less spam)
```

### Kalau kena rate limit:
```javascript
gldBurstGapMs: 1500  // Naikin dari 1000 → 1500
politeGapMs: [1500, 4000]  // Kembaliin ke default
```

### Kalau gold sering habis:
```javascript
keepFlorins: 200  // Naikin dari 150 → 200
maxPlots: 3       // Turunin dari 5 → 3
```

### Kalau mau lebih conservative (balance mode):
```javascript
gldBurstMs: 40000
gldBurstGapMs: 1200
gldBurstMax: 15
gldMinFactor: 0.4
politePassMs: [22000, 45000]
politeGapMs: [1400, 3500]
maxPlots: 4
```

---

## 📈 Monitoring

**Check setiap 1-2 jam:**
- ✅ GLD balance naik (walaupun pelan)
- ✅ GLD sales counter increment
- ✅ Gold/hour positif (net earnings)
- ✅ Safety status OK (no emergency)

**Red Flags:**
- 🚨 GLD sales = 0 setelah 2 jam (pool terlalu competitive)
- 🚨 Gold/hour negatif (spending > earning)
- 🚨 Emergency stop triggered (gold terlalu rendah)
- 🚨 Rate limit terus menerus

---

## 🎯 Bottom Line

Config aggressive ini **maximize GLD earnings** dengan tradeoff:
- ✅ **56% more actions/hour**
- ✅ **GLD counter enabled** (0.001-0.005 GLD/hour realistic)
- ✅ **66% more plots** (5 vs 3)
- ⚠️ **Slightly higher detection risk** (tapi masih safe dengan polite mode)
- ⚠️ **Accept lower pool factor** (0.3x vs 0.5x)

**Best for:** Player yang mau maximize profit dan willing to monitor bot regularly.

**Not for:** Player yang mau 100% safe & hands-off (pakai default config instead).

---

**Rating: 9/10** untuk GLD farming! 🚀
