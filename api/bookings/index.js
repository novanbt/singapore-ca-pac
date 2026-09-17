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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

  // GET ALL BOOKINGS
  if (req.method === 'GET') {
    res.statusCode = 200;
    res.end(JSON.stringify(bookings));
    return;
  }

  // CREATE NEW BOOKING
  if (req.method === 'POST') {
    const body = await parseBody(req);
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
    try { fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8'); } catch (e) {}
    res.statusCode = 201;
    res.end(JSON.stringify({ success: true, booking: newBooking }));
    return;
  }

  res.statusCode = 405;
  res.end(JSON.stringify({ error: 'Method Not Allowed' }));
};
