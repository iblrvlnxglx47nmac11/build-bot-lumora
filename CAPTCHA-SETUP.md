# 🔐 CAPTCHA SETUP - NoCaptchaAI

Lumora menggunakan **Cloudflare Turnstile** untuk login. Bot butuh API key untuk auto-solve.

---

## 📋 Get API Key

### **1. Sign Up NoCaptchaAI**

1. Go to: https://www.nocaptchaai.com
2. **Sign up** (free tier available)
3. **Dashboard** → **API Keys**
4. **Copy API key**

### **2. Pricing**

**Free Tier:**
- 100 requests/day
- Good untuk testing

**Paid Plans:**
- $1.99/month: 3,000 solves
- $4.99/month: 10,000 solves
- $9.99/month: 25,000 solves

**Bot usage:**
- 1 login = 1 captcha solve
- Railway redeploy = 1 login
- Manual restarts = 1 login per restart
- **Estimate: ~5-10 solves/day** (very low!)

**Recommendation: Free tier cukup!** ✅

---

## 🚀 Railway Setup

### **Environment Variables**

Di Railway dashboard, add:

```
LUMORA_USERNAME=your_username
LUMORA_PASSWORD=your_password
NOCAPTCHA_API_KEY=your_nocaptcha_api_key_here
```

**Example:**
```
LUMORA_USERNAME=iqbalravelinotso
LUMORA_PASSWORD=MySecurePass123
NOCAPTCHA_API_KEY=sk_abc123xyz456def789ghi012jkl345
```

---

## 🔧 How It Works

### **Auto-Login Flow:**

1. Bot opens playlumora.io
2. Fills username & password
3. **Detects Turnstile captcha** (iframe check)
4. **Calls NoCaptchaAI API**:
   - Create task with sitekey
   - Poll for solution (2-10 seconds)
   - Receive captcha token
5. **Injects token** into form
6. **Clicks login**
7. Game loads → Bot starts!

### **Console Output:**

```bash
[Lumora Bot] Chrome launched!
[Lumora Bot] Lumora page loaded!
[Lumora Bot] Auto-login with credentials...
[Lumora Bot] Captcha detected, solving...
[Captcha] Creating task...
[Captcha] Waiting for solution...
[Captcha] ✅ Solved!
[Lumora Bot] ✅ Captcha solved!
[Lumora Bot] Login submitted, waiting for game...
[Lumora Bot] ✅ Auto-login successful!
[Lumora Bot] ✅ Bot is running! Monitoring...
```

---

## ⚠️ Fallback (No API Key)

**If NOCAPTCHA_API_KEY not set:**

Bot will try to login anyway:
- If captcha not present → Success ✅
- If captcha present → Fail → Manual login wait (5 min timeout)

**For Railway/VPS 24/7:**
- **API key WAJIB!** (auto-login butuh captcha solver)
- Without it, bot stuck di login page

**For local testing:**
- Optional (manual solve captcha di browser)

---

## 🐛 Troubleshooting

### **"Captcha detected but NOCAPTCHA_API_KEY not provided"**

**Fix:**
1. Get API key from https://www.nocaptchaai.com
2. Add to Railway env vars
3. Redeploy

### **"Failed to create captcha task"**

**Possible causes:**
- Invalid API key
- Out of quota (free tier: 100/day)
- NoCaptchaAI service down

**Fix:**
- Check API key (typo?)
- Check quota in dashboard
- Wait & retry

### **"Captcha solving timeout"**

**Cause:** NoCaptchaAI slow (>2 minutes)

**Fix:**
- Usually auto-resolve after 10-30s
- If persistent, check NoCaptchaAI status
- Fallback to manual login (bot will wait 5 min)

### **"Could not extract sitekey"**

**Cause:** Lumora changed captcha implementation

**Fix:**
- Bot tries login without captcha
- If fails, manual inspect:
  1. Open playlumora.io
  2. F12 → Network tab
  3. Find Turnstile iframe URL
  4. Extract sitekey parameter
  5. Update code if needed

---

## 💰 Cost Estimate

**Free Tier (100 solves/day):**
- 1 bot = ~5-10 solves/day
- **Can run 10-20 bots free!** ✅

**Paid ($1.99/month, 3,000 solves):**
- 3,000 / 30 days = 100 solves/day
- 100 / 10 = **10 bots per account**

**Scaling 100 bots:**
- 100 bots × 10 solves/day = 1,000 solves/day
- 1,000 × 30 = 30,000 solves/month
- **Cost: $9.99/month** (25k plan + overage)

**Very affordable!** 🎉

---

## 🎯 Quick Start Checklist

- ✅ Sign up NoCaptchaAI
- ✅ Get API key
- ✅ Add to Railway env: `NOCAPTCHA_API_KEY`
- ✅ Deploy bot
- ✅ Check logs: "✅ Captcha solved!"
- ✅ Bot auto-login works!

---

## 📝 Summary

**With Captcha Solver:**
- ✅ Fully automatic login
- ✅ Railway 24/7 no manual intervention
- ✅ Multiple accounts easy
- ✅ $0-10/month (very cheap)

**Without Captcha Solver:**
- ❌ Manual login required (Railway = stuck)
- ⚠️ Local only (browser manual solve)

**Recommendation: Get NoCaptchaAI API key!** 🚀

---

**Next: Get API key from https://www.nocaptchaai.com → Add to Railway → Deploy!**
