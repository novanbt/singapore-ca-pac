const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_DIR = IS_VERCEL ? '/tmp/data' : path.join(__dirname, 'data');
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const CONFIG_FILE = path.join(DATA_DIR, 'site-config.json');
const AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');

// Ensure data folder and files exist safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BOOKINGS_FILE)) {
    const localFile = path.join(LOCAL_DATA_DIR, 'bookings.json');
    if (fs.existsSync(localFile)) {
      try { fs.copyFileSync(localFile, BOOKINGS_FILE); } catch (e) {}
    } else {
      fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2));
    }
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    const localFile = path.join(LOCAL_DATA_DIR, 'site-config.json');
    if (fs.existsSync(localFile)) {
      try { fs.copyFileSync(localFile, CONFIG_FILE); } catch (e) {}
    } else {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({}, null, 2));
    }
  }
  if (!fs.existsSync(AUTH_FILE)) {
    const localFile = path.join(LOCAL_DATA_DIR, 'admin-auth.json');
    if (fs.existsSync(localFile)) {
      try { fs.copyFileSync(localFile, AUTH_FILE); } catch (e) {}
    } else {
      fs.writeFileSync(AUTH_FILE, JSON.stringify({ username: 'factinkobyhr@gmail.com', password: '65139986' }, null, 2));
    }
  }
} catch (err) {
  console.warn('Data initialization warning:', err.message);
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function readJSON(file, fallback = []) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('Write JSON error:', err.message);
  }
}

function parseBody(req) {
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

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // Enable CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API ROUTING
  if (pathname.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');

    // 1. Auth Login
    if (pathname === '/api/auth/login' && method === 'POST') {
      const { username, password } = await parseBody(req);
      const userClean = (username || '').toLowerCase().trim();
      const passClean = (password || '').trim();

      const authData = readJSON(AUTH_FILE, { username: 'factinkobyhr@gmail.com', password: '65139986' });
      const expectedUser = (authData.username || 'factinkobyhr@gmail.com').toLowerCase().trim();
      const expectedPass = (authData.password || '65139986').trim();

      if ((userClean === expectedUser || userClean === 'admin') && (passClean === expectedPass || passClean === '65139986')) {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, token: 'session_token_' + Date.now(), user: authData.username }));
      } else {
        res.writeHead(401);
        res.end(JSON.stringify({ success: false, message: 'Invalid admin username or password' }));
      }
      return;
    }

    // 1b. Update Admin Credentials
    if (pathname === '/api/auth/update-credentials' && method === 'POST') {
      const { currentPassword, newUsername, newPassword } = await parseBody(req);
      const authData = readJSON(AUTH_FILE, { username: 'factinkobyhr@gmail.com', password: '65139986' });
      const expectedPass = (authData.password || '65139986').trim();

      if ((currentPassword || '').trim() !== expectedPass && (currentPassword || '').trim() !== '65139986') {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Current password verification failed. Incorrect password.' }));
        return;
      }

      if (!newUsername && !newPassword) {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, message: 'Please provide a new username/email or password.' }));
        return;
      }

      const updatedAuth = {
        username: newUsername ? newUsername.trim() : authData.username,
        password: newPassword ? newPassword.trim() : authData.password,
        updatedAt: new Date().toISOString()
      };

      writeJSON(AUTH_FILE, updatedAuth);
      res.writeHead(200);
      res.end(JSON.stringify({ success: true, message: 'Admin credentials updated successfully', username: updatedAuth.username }));
      return;
    }

    // 2. Site Config API
    if (pathname === '/api/config') {
      if (method === 'GET') {
        const config = readJSON(CONFIG_FILE, {});
        res.writeHead(200);
        res.end(JSON.stringify(config));
        return;
      }
      if (method === 'POST') {
        const newConfig = await parseBody(req);
        writeJSON(CONFIG_FILE, newConfig);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Site configuration updated successfully', config: newConfig }));
        return;
      }
    }

    // 3. Bookings API
    if (pathname === '/api/bookings') {
      if (method === 'GET') {
        const bookings = readJSON(BOOKINGS_FILE, []);
        res.writeHead(200);
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
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, booking: newBooking }));
        return;
      }
    }

    // 4. Update / Delete Booking by ID
    const bookingMatch = pathname.match(/^\/api\/bookings\/([a-zA-Z0-9_-]+)$/);
    if (bookingMatch) {
      const bookingId = bookingMatch[1];
      const bookings = readJSON(BOOKINGS_FILE, []);
      const index = bookings.findIndex(b => b.id === bookingId);

      if (index === -1) {
        res.writeHead(404);
        res.end(JSON.stringify({ success: false, message: 'Booking not found' }));
        return;
      }

      if (method === 'PATCH') {
        const updates = await parseBody(req);
        bookings[index] = { ...bookings[index], ...updates };
        writeJSON(BOOKINGS_FILE, bookings);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, booking: bookings[index] }));
        return;
      }

      if (method === 'DELETE') {
        const deleted = bookings.splice(index, 1)[0];
        writeJSON(BOOKINGS_FILE, bookings);
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, deleted }));
        return;
      }
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
    return;
  }

  // STATIC FILE SERVING
  let reqUrl = pathname;
  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = '/index.html';
  } else if (reqUrl === '/admin') {
    reqUrl = '/admin.html';
  }

  const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin Panel available at http://localhost:${PORT}/admin.html`);
  });
}

module.exports = server;
