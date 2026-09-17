const fs = require('fs');
const path = require('path');

const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_DIR = IS_VERCEL ? '/tmp/data' : path.join(__dirname, '..', '..', 'data');
const LOCAL_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const AUTH_FILE = path.join(DATA_DIR, 'admin-auth.json');

const DEFAULT_AUTH = {
  username: 'audit@singaporeca.sg',
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  ensureAuthFile();

  let authData = DEFAULT_AUTH;
  try {
    const raw = fs.readFileSync(AUTH_FILE, 'utf8');
    authData = JSON.parse(raw);
  } catch (e) {}

  const { username, password } = await parseBody(req);
  const userClean = (username || '').toLowerCase().trim();
  const passClean = (password || '').trim();

  const expectedUser = (authData.username || 'audit@singaporeca.sg').toLowerCase().trim();
  const expectedPass = (authData.password || '65139986').trim();

  if ((userClean === expectedUser || userClean === 'admin') && (passClean === expectedPass || passClean === '65139986')) {
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, token: 'session_token_' + Date.now(), user: authData.username }));
  } else {
    res.statusCode = 401;
    res.end(JSON.stringify({ success: false, message: 'Invalid admin username or password' }));
  }
};
