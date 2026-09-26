# 🚀 LUMORA BOT - HEADLESS MODE

3 cara run bot tanpa buka browser manual.

---

## ⭐ Option 1: Minimized Mode (EASIEST)

**Chrome jalan di background, window auto-minimize**

### Setup:
1. **Double-click**: `start-bot.bat`
2. Chrome terbuka **minimized** (di taskbar)
3. Lumora auto-load dengan extension
4. Dashboard auto-open
5. **Done!** Bot running di background

### Stop:
- Close Chrome dari taskbar
- Atau close terminal

### Pros:
- ✅ Super mudah (1 click)
- ✅ No install dependencies
- ✅ Dashboard auto-open
- ✅ Stable

### Cons:
- ⚠️ Chrome tetap consume RAM (~500MB)
- ⚠️ Window masih ada (cuma minimize)

---

## 🤖 Option 2: Puppeteer Headless (RECOMMENDED)

**Chrome jalan via Node.js, window offscreen**

### Setup:

**1. Install Node.js (kalau belum):**
- Download: https://nodejs.org (LTS version)
- Install default settings

**2. Install dependencies:**
```bash
cd "C:\Users\a s u s\OneDrive\Documents\AMATEUR vsc\clankerbot-deploy\lumora-ext"
npm install
```

**3. Run bot:**
```bash
npm start
```

**4. Login manual (first time):**
- Chrome window muncul sebentar
- Login ke Lumora
- Bot auto-start setelah login
- Window bisa di-minimize

**5. Monitor console:**
```
[Lumora Bot] Chrome launched!
[Lumora Bot] Lumora page loaded!
[Lumora Bot] Login detected!
[Lumora Bot] Bot is running! Monitoring...
[Monitor] Pass: 5 | Acts: 78 | Gold: 150◈ | GLD: 0.00001
```

### Stop:
- **Ctrl+C** di terminal
- Bot auto-shutdown gracefully

### Pros:
- ✅ Window offscreen (ga ganggu)
- ✅ Console monitoring built-in
- ✅ Auto-restart on crash
- ✅ Multi-account ready

### Cons:
- ⚠️ Butuh Node.js install
- ⚠️ Login manual first time

---

## 🖥️ Option 3: VPS 24/7 (ADVANCED)

**Bot jalan di cloud server 24/7**

### Setup:

**1. Sewa VPS:**
- Google Cloud / AWS / DigitalOcean
- Spec: 2GB RAM, 1 vCPU (minimum)
- OS: Windows Server atau Ubuntu

**2. Install Chrome + Node.js di VPS**

**Windows VPS:**
```powershell
# Install Chrome
choco install googlechrome

# Install Node.js
choco install nodejs

# Upload bot folder
# scp -r lumora-ext/ user@vps:/path/
```

**Ubuntu VPS:**
```bash
# Install Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install ./google-chrome-stable_current_amd64.deb

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt install nodejs

# Install Xvfb (virtual display)
sudo apt install xvfb

# Upload bot
scp -r lumora-ext/ user@vps:/root/
```

**3. Run bot persistent:**

**Windows:**
```powershell
cd C:\lumora-ext
npm install
npm start
```

**Ubuntu (dengan Xvfb):**
```bash
cd /root/lumora-ext
npm install
xvfb-run npm start
```

**4. Keep alive (PM2):**
```bash
npm install -g pm2
pm2 start headless-bot.js --name lumora-bot
pm2 save
pm2 startup
```

**5. Monitor remote:**
```bash
pm2 logs lumora-bot
pm2 status
```

### Stop:
```bash
pm2 stop lumora-bot
# or
pm2 delete lumora-bot
```

### Pros:
- ✅ 24/7 tanpa PC ON
- ✅ Low latency (kalau VPS dekat server Lumora)
- ✅ Multi-account gampang (1 VPS = 10 bot)
- ✅ Auto-restart on crash

### Cons:
- ⚠️ Butuh VPS ($5-10/month)
- ⚠️ Setup lebih kompleks
- ⚠️ Remote login agak ribet

---

## 📊 Comparison

| Feature | Minimized | Puppeteer | VPS |
|---------|-----------|-----------|-----|
| **Ease of Use** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **No Manual Browser** | ❌ | ✅ | ✅ |
| **24/7 (PC OFF)** | ❌ | ❌ | ✅ |
| **RAM Usage** | 500MB | 400MB | 300MB |
| **Multi-Account** | Hard | Easy | Very Easy |
| **Cost** | Free | Free | $5-10/mo |
| **Setup Time** | 1 min | 5 min | 30-60 min |

---

## 🎯 RECOMMENDATION

### For 1-2 Accounts:
**Use Option 1 (Minimized)** → Easiest, no setup

### For 3-5 Accounts:
**Use Option 2 (Puppeteer)** → Better control, monitoring

### For 6-10 Accounts or 24/7:
**Use Option 3 (VPS)** → Best for scaling

---

## 🔧 Puppeteer Quick Start

**Step-by-step untuk Option 2:**

### 1. Install Node.js
```bash
# Check if installed:
node --version
npm --version

# If not installed, download:
https://nodejs.org/en/download/
```

### 2. Install Dependencies
```bash
cd "C:\Users\a s u s\OneDrive\Documents\AMATEUR vsc\clankerbot-deploy\lumora-ext"
npm install
```

Wait 1-2 menit (download Puppeteer + Chrome)

### 3. Run Bot
```bash
npm start
```

### 4. First Login
- Chrome window muncul
- Go to https://playlumora.io (auto-load)
- **Login manual** (username + password)
- Wait game fully loaded
- Bot auto-detect login
- **Console log**: `[Lumora Bot] Bot is running!`

### 5. Minimize Window
- Window Chrome bisa di-minimize
- Bot tetap jalan
- Monitor dari console

### 6. Dashboard (Optional)
Open another terminal:
```bash
# Open dashboard in default browser
start dashboard.html
```

---

## 🐛 Troubleshooting

### "npm not found"
**Fix:** Install Node.js dulu dari https://nodejs.org

### "Puppeteer download failed"
**Fix:**
```bash
npm install puppeteer --force
```

### "Chrome launch failed"
**Fix:**
```bash
# Re-install puppeteer with bundled Chrome
npm install puppeteer
```

### Bot tidak auto-start
**Fix:** 
- Login manual dulu (first run)
- Extension auto-load setelah login
- Check console log

### Window masih muncul
**Normal** - Chrome extension butuh headed mode  
Window bisa di-minimize atau pindah ke monitor kedua

---

## 🚀 Multi-Account Setup (Puppeteer)

Edit `headless-bot.js`:

```javascript
const CONFIG = {
  accounts: [
    { username: 'account1', password: 'pass1' },
    { username: 'account2', password: 'pass2' },
    { username: 'account3', password: 'pass3' },
  ],
};
```

Run multiple instances:
```bash
# Terminal 1
npm start

# Terminal 2 (different profile)
node headless-bot.js --profile profile2

# Terminal 3
node headless-bot.js --profile profile3
```

---

## 📝 Summary

**Easiest:** `start-bot.bat` (1 click)  
**Best Control:** `npm start` (Puppeteer)  
**24/7 Production:** VPS + PM2

**Pilih sesuai kebutuhan!** 🎯
