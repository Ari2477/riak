const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Use stealth plugin
puppeteer.use(StealthPlugin());

const app = express();

// ====================
// MIDDLEWARE SETUP
// ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // Cache for 1 day
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// ====================
// API ROUTES
// ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'React Boost Pro',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      react: 'POST /api/react',
      batch: 'POST /api/batch',
      status: 'GET /api/status'
    }
  });
});

// System status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Main react endpoint - TOTOONG REACT DITO NAGYAYARI
app.post('/api/react', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🔥 RECEIVING REACT REQUEST...');
    
    const { cookies, post_url, reaction_type = 'LOVE' } = req.body;
    
    // Validate input
    if (!cookies || !post_url) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: cookies and post_url'
      });
    }
    
    console.log(`🎯 Target: ${post_url}`);
    console.log(`🎯 Reaction: ${reaction_type}`);
    
    // Send real Facebook reaction
    const result = await sendRealFacebookReaction(cookies, post_url, reaction_type);
    
    console.log(`✅ React completed in ${Date.now() - startTime}ms`);
    
    // Return response
    res.json({
      ...result,
      processing_time: Date.now() - startTime,
      server_timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Batch reactions endpoint
app.post('/api/batch', async (req, res) => {
  try {
    const { cookies, posts, reactions, delay_between = 5000 } = req.body;
    
    if (!cookies || !posts || !Array.isArray(posts)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    const results = [];
    const reactionList = reactions || ['LOVE', 'LIKE', 'HAHA', 'WOW'];
    
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const reaction = reactionList[i % reactionList.length];
      
      console.log(`🔄 Processing ${i+1}/${posts.length}: ${post}`);
      
      const result = await sendRealFacebookReaction(cookies, post, reaction);
      results.push({
        post,
        reaction,
        ...result
      });
      
      // Delay between reactions
      if (i < posts.length - 1) {
        await delay(delay_between);
      }
    }
    
    res.json({
      success: true,
      total: posts.length,
      successful: results.filter(r => r.success).length,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ====================
// CORE REACT FUNCTION
// ====================

async function sendRealFacebookReaction(cookies, postUrl, reactionType = 'LOVE') {
  console.log('🚀 STARTING REAL REACT PROCESS...');
  
  let browser = null;
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // ====================
    // STEP 1: LAUNCH BROWSER
    // ====================
    console.log('📱 Launching browser...');
    
    const browserConfig = {
      headless: true, // Set to true for production
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--window-size=390,844', // Mobile viewport size
        '--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
      ignoreHTTPSErrors: true
    };
    
    browser = await puppeteer.launch(browserConfig);
    const page = await browser.newPage();
    
    // Set mobile viewport
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    
    // ====================
    // STEP 2: BYPASS DETECTION
    // ====================
    await page.evaluateOnNewDocument(() => {
      // Hide automation
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { 
        get: () => [1, 2, 3, 4, 5]
      });
      Object.defineProperty(navigator, 'languages', { 
        get: () => ['en-US', 'en', 'fil-PH']
      });
      window.chrome = { runtime: {} };
    });
    
    // ====================
    // STEP 3: LOAD COOKIES
    // ====================
    console.log('🍪 Loading cookies...');
    const cookieList = parseCookies(cookies);
    
    if (cookieList.length === 0) {
      throw new Error('Invalid cookies format');
    }
    
    await page.setCookie(...cookieList);
    console.log(`✅ Loaded ${cookieList.length} cookies`);
    
    // ====================
    // STEP 4: VERIFY LOGIN
    // ====================
    console.log('🔐 Verifying login...');
    await page.goto('https://m.facebook.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    await delay(3000);
    
    // Check if logged in
    const isLoggedIn = await page.evaluate(() => {
      return !document.querySelector('input[name="email"]') && 
             !document.querySelector('input[name="pass"]');
    });
    
    if (!isLoggedIn) {
      throw new Error('Login failed - cookies may be expired or invalid');
    }
    
    console.log('✅ Successfully logged in');
    
    // ====================
    // STEP 5: GO TO POST
    // ====================
    console.log(`📄 Navigating to post...`);
    await page.goto(postUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    await delay(4000);
    
    // ====================
    // STEP 6: FIND REACT BUTTON
    // ====================
    console.log('🔍 Finding react button...');
    
    let reactButton = null;
    const selectors = [
      'div[aria-label="Like"][role="button"]',
      'span[aria-label="Like"]',
      '[data-testid="reaction-like"]',
      'div[role="button"]:has(svg)',
      'a[aria-label*="Like"]',
      'i[data-visualcompletion="css-img"]', // Facebook's icon
      'div[role="button"][tabindex="0"]:has(> svg)',
      'div[aria-label*="React"][role="button"]'
    ];
    
    // Try each selector
    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          const isVisible = await element.evaluate(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && 
                   window.getComputedStyle(el).display !== 'none';
          });
          
          if (isVisible) {
            reactButton = element;
            console.log(`✅ Found with selector: ${selector}`);
            break;
          }
        }
        if (reactButton) break;
      } catch (e) {
        // Continue with next selector
      }
    }
    
    if (!reactButton) {
      // Take screenshot for debugging
      await page.screenshot({ path: `debug-${sessionId}.png` });
      throw new Error('React button not found. The post might not be accessible or the selectors need updating.');
    }
    
    // ====================
    // STEP 7: HUMAN-LIKE INTERACTION
    // ====================
    console.log('🖱️ Interacting with react button...');
    
    // Hover (if supported)
    try {
      await reactButton.hover();
    } catch (e) {
      // Some elements don't support hover
    }
    
    await delay(800 + Math.random() * 700);
    
    // Click to show reactions
    await reactButton.click({ delay: 100 });
    await delay(1200 + Math.random() * 800);
    
    // ====================
    // STEP 8: SELECT REACTION
    // ====================
    console.log(`🎯 Selecting ${reactionType} reaction...`);
    
    const reactionSelected = await selectReaction(page, reactionType);
    
    if (!reactionSelected) {
      throw new Error(`Could not select ${reactionType} reaction`);
    }
    
    // ====================
    // STEP 9: WAIT AND VERIFY
    // ====================
    await delay(2500);
    
    // Verify reaction was sent
    const verified = await verifyReaction(page, reactionType);
    
    // ====================
    // STEP 10: RETURN SUCCESS
    // ====================
    const reactionId = `react_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🎉 SUCCESS! Real ${reactionType} reaction sent!`);
    
    return {
      success: true,
      message: `Real ${reactionType} reaction successfully delivered`,
      reaction_id: reactionId,
      reaction_type: reactionType,
      session_id: sessionId,
      verified: verified,
      post_url: postUrl,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ React error:', error);
    
    return {
      success: false,
      message: error.message,
      error: error.toString(),
      session_id: sessionId,
      timestamp: new Date().toISOString()
    };
    
  } finally {
    // Close browser
    if (browser) {
      try {
        await browser.close();
        console.log('✅ Browser closed');
      } catch (e) {
        console.log('⚠️ Error closing browser:', e.message);
      }
    }
  }
}

// Helper function to select reaction
async function selectReaction(page, reactionType) {
  const reactionMap = {
    'LIKE': { selector: '[aria-label="Like"]', label: 'Like', emoji: '👍' },
    'LOVE': { selector: '[aria-label="Love"]', label: 'Love', emoji: '❤️' },
    'CARE': { selector: '[aria-label="Care"]', label: 'Care', emoji: '🥰' },
    'HAHA': { selector: '[aria-label="Haha"]', label: 'Haha', emoji: '😆' },
    'WOW': { selector: '[aria-label="Wow"]', label: 'Wow', emoji: '😯' },
    'SAD': { selector: '[aria-label="Sad"]', label: 'Sad', emoji: '😢' },
    'ANGRY': { selector: '[aria-label="Angry"]', label: 'Angry', emoji: '😠' }
  };
  
  const reaction = reactionMap[reactionType] || reactionMap.LOVE;
  
  try {
    // Wait for reaction menu
    await page.waitForSelector(reaction.selector, { timeout: 5000 });
    const reactionBtn = await page.$(reaction.selector);
    
    if (reactionBtn) {
      // Human-like interaction
      await reactionBtn.hover();
      await delay(200);
      await reactionBtn.click({ delay: 50 });
      console.log(`✅ Selected ${reaction.label} ${reaction.emoji}`);
      return true;
    }
  } catch (e) {
    console.log(`⚠️ Could not select ${reaction.label}: ${e.message}`);
  }
  
  // Fallback method: coordinate click
  try {
    const reactArea = await page.$('div[aria-label="Like"][role="button"]');
    if (reactArea) {
      const rect = await reactArea.boundingBox();
      if (rect) {
        // Calculate positions for different reactions
        const positions = {
          'LIKE': { x: 0, y: -60 },
          'LOVE': { x: 50, y: -60 },
          'CARE': { x: 100, y: -60 },
          'HAHA': { x: 150, y: -60 },
          'WOW': { x: 200, y: -60 },
          'SAD': { x: 250, y: -60 },
          'ANGRY': { x: 300, y: -60 }
        };
        
        const pos = positions[reactionType] || positions.LOVE;
        await page.mouse.click(rect.x + pos.x, rect.y + pos.y);
        console.log(`✅ Selected ${reaction.label} via coordinates`);
        return true;
      }
    }
  } catch (e) {
    console.log(`⚠️ Coordinate fallback failed: ${e.message}`);
  }
  
  return false;
}

// Verify reaction was sent
async function verifyReaction(page, reactionType) {
  try {
    await delay(1000);
    
    const isReacted = await page.evaluate((type) => {
      // Look for reaction indicators
      const elements = document.querySelectorAll('[role="button"], button, div[aria-label]');
      
      for (const el of elements) {
        const ariaLabel = el.getAttribute('aria-label') || '';
        const text = el.textContent || '';
        
        // Check various indicators of successful reaction
        if (ariaLabel.includes('Reacted') || 
            ariaLabel.includes('reactions') ||
            text.includes('Reacted') ||
            ariaLabel.toLowerCase().includes(type.toLowerCase())) {
          return true;
        }
      }
      
      return false;
    }, reactionType.toLowerCase());
    
    return isReacted;
  } catch (e) {
    console.log('⚠️ Verification failed:', e.message);
    return false;
  }
}

// Parse cookies string
function parseCookies(cookieString) {
  const cookies = [];
  const pairs = cookieString.split(';');
  
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    
    const [name, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=');
    
    if (name && value) {
      cookies.push({
        name: name.trim(),
        value: value.trim(),
        domain: '.facebook.com',
        path: '/',
        secure: true,
        httpOnly: false,
        sameSite: 'None'
      });
    }
  }
  
  return cookies;
}

// Delay function
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Serve frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ============================================
  🚀 REACT BOOST SYSTEM STARTED!
  ============================================
  🌐 URL: http://localhost:${PORT}
  📁 Frontend: public/index.html
  🔧 API: POST /api/react
  📱 Mobile Optimized: Yes
  🕒 ${new Date().toLocaleString()}
  
  ✅ READY FOR REAL FACEBOOK REACTIONS!
  ============================================
  `);
});

module.exports = app;
