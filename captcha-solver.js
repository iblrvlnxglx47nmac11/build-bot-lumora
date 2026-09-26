// ═══════════════════════════════════════════════════════════════════════
// CAPTCHA SOLVER - NoCaptchaAI Integration
// Auto-solve Cloudflare Turnstile for Lumora login
// ═══════════════════════════════════════════════════════════════════════

const https = require('https');

class CaptchaSolver {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.NOCAPTCHA_API_KEY;
    this.baseUrl = 'https://api.nocaptchaai.com';
  }

  async solveTurnstile(siteUrl, siteKey) {
    if (!this.apiKey) {
      throw new Error('NoCaptchaAI API key not provided');
    }

    console.log('[Captcha] Creating task...');
    const taskId = await this.createTask(siteUrl, siteKey);
    
    console.log('[Captcha] Waiting for solution...');
    const token = await this.pollResult(taskId);
    
    console.log('[Captcha] ✅ Solved!');
    return token;
  }

  async createTask(siteUrl, siteKey) {
    const payload = {
      type: 'TurnstileTaskProxyless',
      websiteURL: siteUrl,
      websiteKey: siteKey,
    };

    const data = await this.request('/createTask', payload);
    
    if (!data.taskId) {
      throw new Error('Failed to create captcha task: ' + JSON.stringify(data));
    }
    
    return data.taskId;
  }

  async pollResult(taskId, maxAttempts = 60, interval = 2000) {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(interval);
      
      const data = await this.request('/getTaskResult', { taskId });
      
      if (data.status === 'ready') {
        return data.solution.token;
      }
      
      if (data.status === 'failed') {
        throw new Error('Captcha solving failed: ' + data.errorDescription);
      }
      
      // status: 'processing' - continue polling
    }
    
    throw new Error('Captcha solving timeout after ' + maxAttempts + ' attempts');
  }

  async request(endpoint, payload) {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        ...payload,
        apiKey: this.apiKey,
      });

      const options = {
        hostname: 'api.nocaptchaai.com',
        port: 443,
        path: endpoint,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            reject(new Error('Invalid JSON response: ' + body));
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.write(postData);
      req.end();
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = CaptchaSolver;
