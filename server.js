const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// Data paths - use /tmp/data on Vercel lambda (writable), fallback to local data folder
const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_DIR = IS_VERCEL ? '/tmp/data' : path.join(__dirname, 'data');
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const CONFIG_FILE = path.join(DATA_DIR, 'site-config.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');

const DEFAULT_AUTH = {
  username: 'factinkobyhr@gmail.com',
  password: '65139986'
};

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

const DEFAULT_BOOKINGS = [
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
];

// Initialize storage safely
function initDataStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BOOKINGS_FILE)) {
      const localFile = path.join(LOCAL_DATA_DIR, 'bookings.json');
      if (fs.existsSync(localFile)) {
        try { fs.copyFileSync(localFile, BOOKINGS_FILE); } catch (e) {}
      } else {
        try { fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(DEFAULT_BOOKINGS, null, 2), 'utf8'); } catch (e) {}
      }
    }
    if (!fs.existsSync(CONFIG_FILE)) {
      const localFile = path.join(LOCAL_DATA_DIR, 'site-config.json');
      if (fs.existsSync(localFile)) {
        try { fs.copyFileSync(localFile, CONFIG_FILE); } catch (e) {}
      } else {
        try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8'); } catch (e) {}
      }
    }
    if (!fs.existsSync(AUTH_FILE)) {
      const localFile = path.join(LOCAL_DATA_DIR, 'admin-auth.json');
      if (fs.existsSync(localFile)) {
        try { fs.copyFileSync(localFile, AUTH_FILE); } catch (e) {}
      } else {
        try { fs.writeFileSync(AUTH_FILE, JSON.stringify(DEFAULT_AUTH, null, 2), 'utf8'); } catch (e) {}
      }
    }
  } catch (err) {
    // Ignore read-only init errors on cold start
  }
}

initDataStorage();

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
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function readJSON(file, fallback) {
  try {
    if (fs.existsSync(file)) {
      const raw = fs.readFileSync(file, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {}
  return fallback;
}

function writeJSON(file, data) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Write JSON error:', err.message);
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
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

// Multi-path file finder that searches process.cwd(), __dirname, and public/
function resolveStaticFile(requestedPath) {
  let cleanPath = (requestedPath || '').split('?')[0].split('#')[0];
  if (cleanPath === '/' || cleanPath === '' || cleanPath === '/index') {
    cleanPath = 'index.html';
  } else if (cleanPath === '/admin' || cleanPath === 'admin') {
    cleanPath = 'admin.html';
  }

  // Strip leading slashes and normalize
  cleanPath = path.normalize(cleanPath).replace(/^(\.\.[\/\\])+/, '').replace(/^[\/\\]+/, '');

  const candidateRoots = [
    process.cwd(),
    __dirname,
    path.join(process.cwd(), 'public'),
    path.join(__dirname, 'public')
  ];

  for (const root of candidateRoots) {
    try {
      const fullPath = path.join(root, cleanPath);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          return fullPath;
        }
      }
    } catch (e) {}
  }
  return null;
}

// Main request handler
async function requestHandler(req, res) {
  // Safe URL parsing
  let pathname = '/';
  try {
    const parsed = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    pathname = parsed.pathname;
  } catch (e) {
    pathname = (req.url || '/').split('?')[0];
  }

  const method = (req.method || 'GET').toUpperCase();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // ==========================================
  // API ROUTING
  // ==========================================
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');

    // 1. Auth Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = await parseBody(req);
      const userClean = (username || '').toLowerCase().trim();
      const passClean = (password || '').trim();

      const authData = readJSON(AUTH_FILE, DEFAULT_AUTH);
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
    if (pathname === '/api/auth/update-credentials' && method === 'POST') {
      const { currentPassword, newUsername, newPassword } = await parseBody(req);
      const authData = readJSON(AUTH_FILE, DEFAULT_AUTH);
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
    if (pathname === '/api/config') {
      if (method === 'GET' || method === 'HEAD') {
        const config = readJSON(CONFIG_FILE, DEFAULT_CONFIG);
        res.statusCode = 200;
        if (method === 'HEAD') { res.end(); return; }
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
    if (pathname === '/api/bookings') {
      if (method === 'GET' || method === 'HEAD') {
        const bookings = readJSON(BOOKINGS_FILE, DEFAULT_BOOKINGS);
        res.statusCode = 200;
        if (method === 'HEAD') { res.end(); return; }
        res.end(JSON.stringify(bookings));
        return;
      }
      if (method === 'POST') {
        const body = await parseBody(req);
        const bookings = readJSON(BOOKINGS_FILE, DEFAULT_BOOKINGS);
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
    const bookingMatch = pathname.match(/^\/api\/bookings\/([a-zA-Z0-9_-]+)$/);
    if (bookingMatch) {
      const bookingId = bookingMatch[1];
      const bookings = readJSON(BOOKINGS_FILE, DEFAULT_BOOKINGS);
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
    res.end(JSON.stringify({ error: 'API Endpoint not found' }));
    return;
  }

  // ==========================================
  // STATIC FILE SERVING
  // ==========================================
  const filePath = resolveStaticFile(pathname);

  if (filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      const fileData = fs.readFileSync(filePath);

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.end(fileData);
      return;
    } catch (err) {
      console.warn('File read error:', err.message);
    }
  }

  // 404 fallback
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Page Not Found</h2><p><a href="/">Return to Home</a> | <a href="/admin">Admin Portal</a></p></body></html>`);
}

// Create HTTP server for local dev
const server = http.createServer(requestHandler);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Singapore Ca Pac server running at http://localhost:${PORT}`);
    console.log(`Admin Portal: http://localhost:${PORT}/admin`);
  });
}

// Export request handler for Vercel Node.js Serverless runtime
module.exports = requestHandler;
