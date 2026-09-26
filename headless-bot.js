const puppeteer = require('puppeteer');
const path = require('path');
const http = require('http');
const CaptchaSolver = require('./captcha-solver');

// ═══════════════════════════════════════════════════════════════════════
// LUMORA BOT - HEADLESS MODE (Puppeteer + Railway Ready + Captcha Solver)
// Run bot completely headless with Chrome DevTools Protocol
// ═══════════════════════════════════════════════════════════════════════

const CONFIG = {
  extensionPath: path.join(__dirname, 'lumora-ext'),
  userDataDir: path.join(__dirname, 'chrome-profile'),
  lumoraUrl: 'https://playlumora.io',
  headless: false, // Chrome extension butuh headed mode (tapi bisa minimize)
  
  // Railway/VPS credentials (from environment)
  lumoraUsername: process.env.LUMORA_USERNAME || '',
  lumoraPassword: process.env.LUMORA_PASSWORD || '',
  
  // NoCaptchaAI API key
  nocaptchaApiKey: process.env.NOCAPTCHA_API_KEY || '',
  
  // Health check server
  healthCheckPort: process.env.PORT || 8080,
};

class LumoraHeadlessBot {
  constructor(config) {
    this.config = config;
    this.browser = null;
    this.page = null;
    this.healthy = false;
    this.stats = { passes: 0, actions: 0, gold: 0, gld: 0, uptime: 0 };
  }

  async launch() {
    console.log('[Lumora Bot] Launching Chrome with extension...');
    
    // Launch Chrome with extension loaded
    this.browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${this.config.extensionPath}`,
        `--load-extension=${this.config.extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--window-position=-2400,-2400',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-first-run',
        '--no-default-browser-check',
      ],
      userDataDir: this.config.userDataDir,
      defaultViewport: null,
      executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome-stable',
    });

    console.log('[Lumora Bot] Chrome launched!');
    
    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();
    
    // Inject session cookies/localStorage if provided
    if (process.env.LUMORA_SESSION_TOKEN) {
      console.log('[Lumora Bot] Injecting session token...');
      await this.page.goto(this.config.lumoraUrl);
      
      await this.page.evaluate((token) => {
        // Try localStorage
        try {
          localStorage.setItem('lumora_token', token);
          // Or sessionStorage
          sessionStorage.setItem('lumora_token', token);
        } catch (e) {}
        
        // Try other possible keys
        try {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('session_id', token);
        } catch (e) {}
      }, process.env.LUMORA_SESSION_TOKEN);
      
      console.log('[Lumora Bot] Session injected, reloading...');
      await this.sleep(1000);
    }
    
    await this.page.goto(this.config.lumoraUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('[Lumora Bot] Lumora page loaded!');
    
    // Auto-login if credentials provided
    if (this.config.lumoraUsername && this.config.lumoraPassword) {
      console.log('[Lumora Bot] Auto-login with credentials...');
      await this.autoLogin();
    } else {
      console.log('[Lumora Bot] Waiting for manual login...');
      await this.waitForLogin();
    }
    
    // Wait for bot extension to initialize
    await this.sleep(5000);
    
    // Auto-start bot extension
    console.log('[Lumora Bot] Starting bot extension...');
    await this.startBotExtension();
    
    this.healthy = true;
    console.log('[Lumora Bot] ✅ Bot is running! Monitoring...');
    
    // Monitor loop
    this.startMonitoring();
    
    // Health check server
    this.startHealthCheckServer();
  }

  async autoLogin() {
    try {
      // Wait for login form
      await this.page.waitForSelector('input[type="text"], input[name="username"]', { timeout: 30000 });
      
      // Fill username
      await this.page.type('input[type="text"], input[name="username"]', this.config.lumoraUsername);
      await this.sleep(500);
      
      // Fill password
      await this.page.type('input[type="password"], input[name="password"]', this.config.lumoraPassword);
      await this.sleep(500);
      
      // Solve Turnstile captcha if present & API key available
      const captchaFrame = await this.page.$('iframe[src*="turnstile"]');
      if (captchaFrame && this.config.nocaptchaApiKey) {
        console.log('[Lumora Bot] Captcha detected, solving...');
        
        // Get sitekey from page
        const siteKey = await this.page.evaluate(() => {
          const frame = document.querySelector('iframe[src*="turnstile"]');
          if (!frame) return null;
          const match = frame.src.match(/sitekey=([^&]+)/);
          return match ? match[1] : null;
        });
        
        if (siteKey) {
          try {
            const solver = new CaptchaSolver(this.config.nocaptchaApiKey);
            const token = await solver.solveTurnstile(this.config.lumoraUrl, siteKey);
            
            // Inject token into page
            await this.page.evaluate((token) => {
              const input = document.querySelector('input[name="cf-turnstile-response"]');
              if (input) input.value = token;
              if (window.turnstile && window.turnstile.reset) window.turnstile.reset();
            }, token);
            
            console.log('[Lumora Bot] ✅ Captcha solved!');
            await this.sleep(1000);
          } catch (e) {
            console.log('[Lumora Bot] ⚠️ Captcha solve failed:', e.message);
            console.log('[Lumora Bot] Trying login anyway (might fail if captcha required)...');
          }
        }
      } else if (captchaFrame) {
        console.log('[Lumora Bot] ⚠️ Captcha detected but no API key - trying anyway...');
      }
      
      // Click login button
      await this.page.click('button[type="submit"], button:contains("Login")');
      
      console.log('[Lumora Bot] Login submitted, waiting for game...');
      
      // Wait for game to load
      await this.page.waitForFunction(
        () => window.G && window.G.playerId,
        { timeout: 60000 }
      );
      
      console.log('[Lumora Bot] ✅ Auto-login successful!');
    } catch (e) {
      console.error('[Lumora Bot] ❌ Auto-login failed:', e.message);
      console.log('[Lumora Bot] Falling back to manual login wait...');
      await this.waitForLogin();
    }
  }

  async waitForLogin() {
    // Wait for game to load (check for specific element)
    try {
      await this.page.waitForFunction(
        () => window.G && window.G.playerId,
        { timeout: 300000 } // 5 minutes for manual login
      );
      console.log('[Lumora Bot] ✅ Login detected!');
    } catch (e) {
      throw new Error('Login timeout - no player detected after 5 minutes');
    }
  }

  async startBotExtension() {
    // Extension should auto-load and auto-start based on config
    // We just verify it's running
    await this.page.evaluate(() => {
      console.log('[Page] Bot extension should be loaded');
    });
  }

  async startMonitoring() {
    const startTime = Date.now();
    
    setInterval(async () => {
      try {
        this.stats = await this.getStats();
        this.stats.uptime = Math.floor((Date.now() - startTime) / 1000);
        
        const uptimeStr = this.formatUptime(this.stats.uptime);
        console.log(`[Monitor] ${uptimeStr} | Pass: ${this.stats.passes} | Acts: ${this.stats.actions} | Gold: ${this.stats.gold}◈ | GLD: ${this.stats.gld}`);
      } catch (e) {
        console.error('[Monitor] Error:', e.message);
        this.healthy = false;
      }
    }, 30000); // Every 30s
  }

  async getStats() {
    return await this.page.evaluate(() => {
      if (!window.G) return { passes: 0, actions: 0, gold: 0, gld: 0 };
      return {
        passes: window._passCount || 0,
        actions: window._actsTotal || 0,
        gold: window.G.gold || 0,
        gld: window.G.gld || 0,
        lumi: window.G.lumi || 0,
        username: window.G.username || '—',
      };
    });
  }

  startHealthCheckServer() {
    const server = http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(this.healthy ? 200 : 503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: this.healthy ? 'ok' : 'unhealthy',
          uptime: this.stats.uptime,
          stats: this.stats,
        }));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    server.listen(this.config.healthCheckPort, () => {
      console.log(`[Health] Server running on port ${this.config.healthCheckPort}`);
    });
  }

  formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('[Lumora Bot] Browser closed');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

(async () => {
  const bot = new LumoraHeadlessBot(CONFIG);
  
  try {
    await bot.launch();
    
    // Keep running
    console.log('[Lumora Bot] Running... Press Ctrl+C to stop');
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n[Lumora Bot] Shutting down...');
      await bot.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('[Lumora Bot] Fatal error:', error);
    await bot.close();
    process.exit(1);
  }
})();
