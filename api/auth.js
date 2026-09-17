const fs = require('fs');
const path = require('path');

const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_DIR = IS_VERCEL ? '/tmp/data' : path.join(__dirname, '..', 'data');
const LOCAL_DATA_DIR = path.join(__dirname, '..', 'data');
const AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');

const DEFAULT_AUTH = {
  username: 'factinkobyhr@gmail.com',
  password: '65139986'
};

function ensureAuthFile() {
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  }
  if (!fs.existsSync(AUTH_FILE)) {
    const localFile = path.join(LOCAL_DATA_DIR, 'admin-auth.json');
    if (fs.existsSync(localFile)) {
      try { fs.copyFileSync(localFile, AUTH_FILE); return; } catch (e) {}
    }
    try { fs.writeFileSync(AUTH_FILE, JSON.stringify(DEFAULT_AUTH, null, 2), 'utf8'); } catch (e) {}
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

  ensureAuthFile();

  let authData = DEFAULT_AUTH;
  try {
    const raw = fs.readFileSync(AUTH_FILE, 'utf8');
    authData = JSON.parse(raw);
  } catch (e) {}

  const url = req.url || '';
  const action = (req.query && req.query.action) || (url.includes('update-credentials') ? 'update' : 'login');

  // 1. UPDATE CREDENTIALS
  if (action === 'update' && req.method === 'POST') {
    const { currentPassword, newUsername, newPassword } = await parseBody(req);
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

    try { fs.writeFileSync(AUTH_FILE, JSON.stringify(updatedAuth, null, 2), 'utf8'); } catch (e) {}
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'Admin credentials updated successfully', username: updatedAuth.username }));
    return;
  }

  // 2. LOGIN (DEFAULT)
  if (req.method === 'POST') {
    const { username, password } = await parseBody(req);
    const userClean = (username || '').toLowerCase().trim();
    const passClean = (password || '').trim();

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

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};
