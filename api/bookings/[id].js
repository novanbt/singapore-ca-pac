const fs = require('fs');
const path = require('path');

const IS_VERCEL = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
const DATA_DIR = IS_VERCEL ? '/tmp/data' : path.join(__dirname, '..', '..', 'data');
const LOCAL_DATA_DIR = path.join(__dirname, '..', '..', 'data');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');

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

function ensureBookingsFile() {
  if (!fs.existsSync(DATA_DIR)) {
    try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}
  }
  if (!fs.existsSync(BOOKINGS_FILE)) {
    const localFile = path.join(LOCAL_DATA_DIR, 'bookings.json');
    if (fs.existsSync(localFile)) {
      try { fs.copyFileSync(localFile, BOOKINGS_FILE); return; } catch (e) {}
    }
    try { fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(DEFAULT_BOOKINGS, null, 2), 'utf8'); } catch (e) {}
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
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  ensureBookingsFile();

  let bookings = DEFAULT_BOOKINGS;
  try {
    const raw = fs.readFileSync(BOOKINGS_FILE, 'utf8');
    bookings = JSON.parse(raw);
  } catch (e) {}

  const url = req.url || '';
  const bookingId = (req.query && req.query.id) || (url.includes('?') ? new URL(url, 'http://localhost').searchParams.get('id') : null) || path.basename(url.split('?')[0]);

  if (!bookingId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, message: 'Missing booking ID' }));
    return;
  }

  const idx = bookings.findIndex(b => b.id === bookingId);
  if (idx === -1) {
    res.statusCode = 404;
    res.end(JSON.stringify({ success: false, message: 'Booking not found' }));
    return;
  }

  if (req.method === 'PATCH') {
    const updates = await parseBody(req);
    bookings[idx] = { ...bookings[idx], ...updates };
    try { fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8'); } catch (e) {}
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, booking: bookings[idx] }));
    return;
  }

  if (req.method === 'DELETE') {
    const deleted = bookings.splice(idx, 1)[0];
    try { fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8'); } catch (e) {}
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, deleted }));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};
