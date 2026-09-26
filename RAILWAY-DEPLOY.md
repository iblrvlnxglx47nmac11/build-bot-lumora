# 🚀 RAILWAY DEPLOYMENT - Lumora Bot 24/7

Deploy bot ke Railway untuk jalan 24/7 tanpa PC ON.

---

## 📋 Prerequisites

1. **Railway Account**: https://railway.app (sign up free)
2. **GitHub Account**: Bot akan di-push ke GitHub
3. **Lumora Account**: Username & password

---

## 🚀 DEPLOYMENT STEPS

### **Step 1: Push ke GitHub**

```bash
cd "C:\Users\a s u s\OneDrive\Documents\AMATEUR vsc\clankerbot-deploy"

# Initialize git (kalau belum)
git init
git add lumora-ext/

# Commit
git commit -m "Lumora bot initial commit"

# Link ke GitHub repo (buat repo baru di github.com dulu)
git remote add origin https://github.com/YOUR_USERNAME/lumora-bot.git
git branch -M main
git push -u origin main
```

### **Step 2: Deploy ke Railway**

1. **Login ke Railway**: https://railway.app
2. **Click "New Project"**
3. **Select "Deploy from GitHub repo"**
4. **Connect GitHub** (authorize Railway)
5. **Select repo**: `lumora-bot`
6. **Railway auto-detect Dockerfile** ✅

### **Step 3: Set Environment Variables**

Di Railway dashboard:

1. **Click project** → **Variables** tab
2. **Add variables**:
   ```
   LUMORA_USERNAME=your_lumora_username
   LUMORA_PASSWORD=your_lumora_password
   PORT=8080
   NODE_ENV=production
   ```
3. **Save**

### **Step 4: Deploy**

1. Railway auto-deploy (trigger dari push)
2. **Monitor logs**: Click "Deployments" → "View Logs"
3. **Wait for**:
   ```
   [Lumora Bot] Chrome launched!
   [Lumora Bot] Lumora page loaded!
   [Lumora Bot] Auto-login with credentials...
   [Lumora Bot] ✅ Auto-login successful!
   [Lumora Bot] ✅ Bot is running! Monitoring...
   [Health] Server running on port 8080
   [Monitor] 0h 1m | Pass: 1 | Acts: 15 | Gold: 50◈ | GLD: 0
   ```

### **Step 5: Verify Health**

Railway provides public URL:
```
https://YOUR-APP.railway.app/health
```

Response:
```json
{
  "status": "ok",
  "uptime": 3600,
  "stats": {
    "passes": 120,
    "actions": 1800,
    "gold": 250,
    "gld": 0.0001,
    "lumi": 0,
    "username": "iqbalravelinotso"
  }
}
```

---

## 🔧 Configuration

### **Multiple Accounts (Advanced)**

Deploy multiple Railway services (1 per account):

**Project 1: Lumora-Bot-1**
- Env: `LUMORA_USERNAME=account1`
- Env: `LUMORA_PASSWORD=pass1`

**Project 2: Lumora-Bot-2**
- Env: `LUMORA_USERNAME=account2`
- Env: `LUMORA_PASSWORD=pass2`

**... up to 10 projects**

### **Resource Limits**

Railway Free Tier:
- $5 free credits/month
- ~500 hours runtime
- 8GB RAM, 8 vCPU (shared)

Bot usage:
- ~500MB RAM
- Low CPU (~5-10%)
- **1 bot = ~$3-5/month** (under free tier!)
- **Can run 1 bot free 24/7** ✅

### **Scaling to 10 Bots**

Option A: **10 Railway projects** (1 per account)
- Cost: $5/month per extra bot after 1st
- Total: $45/month for 10 bots

Option B: **1 VPS** (DigitalOcean/Linode)
- Cost: $12/month (4GB RAM droplet)
- Run 10 bots simultaneously
- Better value untuk 5+ bots

---

## 📊 Monitoring

### **Railway Dashboard**

- **Logs**: Real-time bot console output
- **Metrics**: RAM, CPU usage
- **Uptime**: Auto-restart on crash

### **Health Check**

```bash
# Check bot status
curl https://YOUR-APP.railway.app/health

# Response
{
  "status": "ok",
  "uptime": 7200,
  "stats": { ... }
}
```

### **Alerts (Optional)**

Setup UptimeRobot:
1. Create monitor: `https://YOUR-APP.railway.app/health`
2. Check interval: 5 minutes
3. Email alert kalau down

---

## 🐛 Troubleshooting

### **"Login timeout"**

**Cause**: Auto-login gagal (wrong credentials)  
**Fix**:
1. Check environment variables (typo?)
2. Test credentials manual di playlumora.io
3. Update Railway env vars
4. Redeploy

### **"Chrome launch failed"**

**Cause**: Chrome dependencies missing  
**Fix**:
- Dockerfile udah include semua deps ✅
- Kalau masih error, check Railway logs
- Mungkin butuh Xvfb manual start

### **Bot running tapi ga farming**

**Cause**: Extension ga auto-start  
**Fix**:
1. Check logs: `[Lumora Bot] ✅ Bot is running!`
2. Kalau ga ada → extension ga load
3. Verify `lumora-ext` folder di repo
4. Redeploy

### **High RAM usage (>1GB)**

**Cause**: Chrome + Puppeteer memory leak  
**Fix**:
1. Railway auto-restart kalau OOM
2. Set restart policy: 10 retries
3. Atau scale to bigger plan

### **Frequent disconnects**

**Cause**: Network/Lumora server issues  
**Fix**:
- Bot auto-reconnect built-in
- Check Railway region (pilih US East untuk Lumora)
- Monitor uptime

---

## 💰 Cost Estimate

### **Railway Pricing**

| Bots | Plan | Cost/Month |
|------|------|-----------|
| 1 bot | Free | $0 (under $5 free credits) |
| 2-3 bots | Hobby | $10-15 |
| 4-10 bots | Pro | $45-50 |

### **Alternative: VPS**

| Provider | Spec | Cost | Bots |
|----------|------|------|------|
| DigitalOcean | 2GB RAM | $12/mo | 3-4 bots |
| DigitalOcean | 4GB RAM | $24/mo | 8-10 bots |
| Linode | 4GB RAM | $24/mo | 8-10 bots |
| Hetzner | 4GB RAM | €5/mo (~$5.5) | 8-10 bots |

**Recommendation:**
- **1-2 bots**: Railway Free ✅
- **3-5 bots**: Railway Hobby
- **6-10 bots**: VPS (better value)

---

## 🎯 Quick Deploy Checklist

- ✅ Code pushed to GitHub
- ✅ Railway project created
- ✅ GitHub repo connected
- ✅ Environment variables set (USERNAME, PASSWORD)
- ✅ Dockerfile detected
- ✅ Deploy triggered
- ✅ Logs show "✅ Bot is running!"
- ✅ Health endpoint returns 200 OK
- ✅ Bot farming (check logs every 30s)

---

## 📝 Current Setup

**Your existing Railway:**
- Musetown bot: `musetown-launch.js`
- Deployed & running ✅

**New Lumora bot:**
- Same repo (different folder: `lumora-ext/`)
- Separate Railway project
- Independent deploy
- Both can run simultaneously!

**Folder structure:**
```
clankerbot-deploy/
├── musetown-bot.js          ← Existing (Railway #1)
├── musetown-launch.js
├── Dockerfile               ← Existing (for Musetown)
└── lumora-ext/
    ├── headless-bot.js      ← New bot
    ├── Dockerfile           ← New (for Lumora)
    ├── railway.json
    └── ... (extension files)
```

---

## 🚀 Next Steps

1. **Push lumora-ext ke GitHub**
2. **Create new Railway project** ("Lumora Bot")
3. **Link GitHub repo**
4. **Set env vars** (LUMORA_USERNAME, LUMORA_PASSWORD)
5. **Deploy!**
6. **Monitor logs** (wait for "✅ Bot is running!")
7. **Check health** (https://YOUR-APP.railway.app/health)
8. **Let it run 24/7!** 🎉

---

**Ready to deploy! Follow Step 1 to push ke GitHub!** 🚀
