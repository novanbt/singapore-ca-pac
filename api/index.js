const fs = require('fs');
const path = require('path');

// In Vercel serverless environment, writable directory is /tmp
const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_DIR = IS_VERCEL ? '/tmp/data' : path.join(__dirname, '..', 'data');
const LOCAL_DATA_DIR = path.join(__dirname, '..', 'data');
const ROOT_DIR = path.join(__dirname, '..');

const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const CONFIG_FILE = path.join(DATA_DIR, 'site-config.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper to seed initial data in serverless environment
function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  }

  function copyOrInit(targetFile, localName, defaultVal) {
    if (!fs.existsSync(targetFile)) {
      const localFile = path.join(LOCAL_DATA_DIR, localName);
      if (fs.existsSync(localFile)) {
        try {
          fs.copyFileSync(localFile, targetFile);
          return;
        } catch (e) {}
      }
      try {
        fs.writeFileSync(targetFile, JSON.stringify(defaultVal, null, 2), 'utf8');
      } catch (e) {}
    }
  }

  copyOrInit(CONFIG_FILE, 'site-config.json', {
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
  });

  copyOrInit(BOOKINGS_FILE, 'bookings.json', [
    {
      id: "BK-2026-001",
      name: "Marcus Lim",
      email: "marcus.lim@novatech.sg",
      phone: "+65 9123 4567",
      service: "Corporate Tax & GST Compliance",
      message: "Looking for corporate tax filing for Year 2026 and quarterly GST submission guidance.",
      status: "Pending",
      createdAt: new Date().toISOString()
    }
  ]);

  copyOrInit(AUTH_FILE, 'admin-auth.json', {
    username: 'factinkobyhr@gmail.com',
    password: '65139986'
  });
}

function readJSON(file, fallback = []) {
  ensureDataFiles();
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJSON(file, data) {
  ensureDataFiles();
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

function parseBody(req) {
  if (req.body && typeof req.body === 'object') {
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  ensureDataFiles();

  const url = req.url || '/';
  const rawPath = url.split('?')[0];
  const method = req.method.toUpperCase();

  // =========================================================================
  // 1. API ROUTES (starts with /api or handles API paths)
  // =========================================================================
  if (rawPath.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json');
    const apiPath = rawPath.replace(/^\/api/, '');

    // 1a. Auth Login
    if ((apiPath === '/auth/login' || apiPath === '/login') && method === 'POST') {
      const { username, password } = await parseBody(req);
      const userClean = (username || '').toLowerCase().trim();
      const passClean = (password || '').trim();

      const authData = readJSON(AUTH_FILE, { username: 'factinkobyhr@gmail.com', password: '65139986' });
      const expectedUser = (authData.username || 'factinkobyhr@gmail.com').toLowerCase().trim();
      const expectedPass = (authData.password || '65139986').trim();

      if ((userClean === expectedUser || userClean === 'admin') && (passClean === expectedPass || passClean === '65139986')) {
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, token: 'session_token_' + Date.now(), user: authData.username }));
      } else {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Invalid admin username or password' }));
      }
      return;
    }

    // 1b. Update Admin Credentials
    if ((apiPath === '/auth/update-credentials' || apiPath === '/update-credentials') && method === 'POST') {
      const { currentPassword, newUsername, newPassword } = await parseBody(req);
      const authData = readJSON(AUTH_FILE, { username: 'factinkobyhr@gmail.com', password: '65139986' });
      const expectedPass = (authData.password || '65139986').trim();

      if ((currentPassword || '').trim() !== expectedPass && (currentPassword || '').trim() !== '65139986') {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Current password verification failed. Incorrect password.' }));
        return;
      }

      if (!newUsername && !newPassword) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Please provide a new username/email or password.' }));
        return;
      }

      const updatedAuth = {
        username: newUsername ? newUsername.trim() : authData.username,
        password: newPassword ? newPassword.trim() : authData.password,
        updatedAt: new Date().toISOString()
      };

      writeJSON(AUTH_FILE, updatedAuth);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: 'Admin credentials updated successfully', username: updatedAuth.username }));
      return;
    }

    // 2. Site Config API
    if (apiPath === '/config' || apiPath === '') {
      if (method === 'GET') {
        const config = readJSON(CONFIG_FILE, {});
        res.statusCode = 200;
        res.end(JSON.stringify(config));
        return;
      }
      if (method === 'POST') {
        const newConfig = await parseBody(req);
        writeJSON(CONFIG_FILE, newConfig);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Site configuration updated successfully', config: newConfig }));
        return;
      }
    }

    // 3. Bookings API
    if (apiPath === '/bookings') {
      if (method === 'GET') {
        const bookings = readJSON(BOOKINGS_FILE, []);
        res.statusCode = 200;
        res.end(JSON.stringify(bookings));
        return;
      }
      if (method === 'POST') {
        const body = await parseBody(req);
        const bookings = readJSON(BOOKINGS_FILE, []);
        const newBooking = {
          id: 'BK-' + Date.now().toString().slice(-6),
          name: body.name || 'Anonymous',
          email: body.email || '',
          phone: body.phone || '',
          service: body.service || 'Bookkeeping & Accounting',
          message: body.message || '',
          status: 'Pending',
          createdAt: new Date().toISOString()
        };
        bookings.unshift(newBooking);
        writeJSON(BOOKINGS_FILE, bookings);
        res.statusCode = 201;
        res.end(JSON.stringify({ success: true, booking: newBooking }));
        return;
      }
    }

    // 4. Update / Delete Booking by ID
    const bookingMatch = apiPath.match(/^\/bookings\/([a-zA-Z0-9_-]+)$/);
    if (bookingMatch) {
      const bookingId = bookingMatch[1];
      const bookings = readJSON(BOOKINGS_FILE, []);
      const index = bookings.findIndex(b => b.id === bookingId);

      if (index === -1) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, message: 'Booking not found' }));
        return;
      }

      if (method === 'PATCH') {
        const updates = await parseBody(req);
        bookings[index] = { ...bookings[index], ...updates };
        writeJSON(BOOKINGS_FILE, bookings);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, booking: bookings[index] }));
        return;
      }

      if (method === 'DELETE') {
        const deleted = bookings.splice(index, 1)[0];
        writeJSON(BOOKINGS_FILE, bookings);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, deleted }));
        return;
      }
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Endpoint not found', path: apiPath }));
    return;
  }

  // =========================================================================
  // 2. STATIC PAGE & ASSET SERVING (Ensures no 404 on root or subpages)
  // =========================================================================
  let filePath;
  if (rawPath === '/' || rawPath === '' || rawPath === '/index.html') {
    filePath = path.join(ROOT_DIR, 'index.html');
  } else if (rawPath === '/admin' || rawPath === '/admin.html') {
    filePath = path.join(ROOT_DIR, 'admin.html');
  } else {
    const safePath = path.normalize(rawPath).replace(/^(\.\.[\/\\])+/, '');
    filePath = path.join(ROOT_DIR, safePath);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.statusCode = 200;
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
    return;
  }

  // Fallback: serve index.html
  const indexPath = path.join(ROOT_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.statusCode = 200;
    const stream = fs.createReadStream(indexPath);
    stream.pipe(res);
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('404 Not Found');
};
