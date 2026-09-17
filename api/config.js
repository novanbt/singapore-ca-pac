const fs = require('fs');
const path = require('path');

const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_DIR = IS_VERCEL ? '/tmp/data' : path.join(__dirname, '..', 'data');
const LOCAL_DATA_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'site-config.json');

const DEFAULT_CONFIG = {
  companyName: 'Ca Pac SG',
  tagline: 'Smart Accounting & Financial Advisory',
  phone: '+65 6513 9986',
  email: 'factinkobyhr@gmail.com',
  address: '50 Chin Swee Rd, #06-04, Singapore 169874',
  mapsUrl: 'https://maps.app.goo.gl/aSkt8xyTKhD2RKF9A',
  operatingHours: 'Mon – Fri: 9:00 AM – 6:00 PM (SGT)',
  heroEyebrow: 'Accounting & Financial Experts',
  heroHeadline: 'Smart Accounting.\nStronger Business.',
  heroSubtitle: 'Reliable accounting, tax, bookkeeping, and financial advisory services designed to help your business scale with complete financial clarity and confidence.',
  primaryCtaText: 'Book a Consultation',
  metrics: {
    financialPlanning: 85,
    taxCompliance: 92,
    businessAdvisory: 88,
    clientSatisfaction: 96
  }
};

function ensureConfigFile() {
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    const localFile = path.join(LOCAL_DATA_DIR, 'site-config.json');
    if (fs.existsSync(localFile)) {
      try { fs.copyFileSync(localFile, CONFIG_FILE); return; } catch (e) {}
    }
    try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8'); } catch (e) {}
  }
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { resolve({}); }
    });
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  ensureConfigFile();

  if (req.method === 'GET') {
    try {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      res.statusCode = 200;
      res.end(raw);
    } catch (e) {
      res.statusCode = 200;
      res.end(JSON.stringify(DEFAULT_CONFIG));
    }
    return;
  }

  if (req.method === 'POST') {
    const newConfig = await parseBody(req);
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), 'utf8');
    } catch (e) {}
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'Configuration saved', config: newConfig }));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};
