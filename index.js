require("dotenv").config();

function removeDriverFromPlotQueues(driverId) {
  const dId = (driverId || "").toUpperCase().trim();
  for (const p of Object.keys(plotQueues)) {
    plotQueues[p] = (plotQueues[p] || []).filter(x => x.driverId.toUpperCase() !== dId);
  }
}

function demoteDriverToEndOfPlotQueue(driverId) {
  const dId = (driverId || "").toUpperCase().trim();
  for (const p of Object.keys(plotQueues)) {
    const idx = (plotQueues[p] || []).findIndex(x => x.driverId.toUpperCase() === dId);
    if (idx !== -1) {
      const [entry] = plotQueues[p].splice(idx, 1);
      entry.enteredAt = Date.now();
      plotQueues[p].push(entry);
    }
  }
  broadcastPlotQueueRanks();
}


const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');

const app = express();
app.use(express.json());

// ================= SQLITE PAYMENT GATEWAY SETTINGS =================
const Stripe = require('stripe');

function getActiveStripeConfig() {
  try {
    const row = db.prepare("SELECT * FROM payment_settings WHERE id = 1").get();
    if (row) return row;
  } catch(e) {}
  return { activeMode: 'simulation', publishableKey: '', secretKey: '', currency: 'gbp' };
}

app.get('/api/payment-settings', (req, res) => {
  try {
    const cfg = getActiveStripeConfig();
    res.json({ success: true, settings: cfg });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/payment-settings', (req, res) => {
  try {
    const { activeMode, publishableKey, secretKey, currency } = req.body;
    db.prepare(`
      UPDATE payment_settings 
      SET activeMode = COALESCE(?, activeMode),
          publishableKey = COALESCE(?, publishableKey),
          secretKey = COALESCE(?, secretKey),
          currency = COALESCE(?, currency),
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(activeMode, publishableKey, secretKey, currency || 'gbp');

    console.log("💳 [PAYMENT SETTINGS UPDATED] Mode ->", activeMode);
    res.json({ success: true, message: "Payment settings saved successfully!" });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/stripe-config', (req, res) => {
  const cfg = getActiveStripeConfig();
  const isStripeActive = cfg.activeMode !== 'simulation' && cfg.publishableKey && cfg.secretKey;
  res.json({
    enabled: !!isStripeActive,
    mode: cfg.activeMode,
    publishableKey: isStripeActive ? cfg.publishableKey : null
  });
});

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, passengerName, pickup, dropoff } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid fare amount' });
    }

    const cfg = getActiveStripeConfig();
    const isLiveOrTest = cfg.activeMode !== 'simulation' && cfg.publishableKey && cfg.secretKey;

    if (!isLiveOrTest) {
      console.log(`💳 [STRIPE SIMULATION] Pre-authorized £${parsedAmount.toFixed(2)} for ${passengerName || 'Passenger'}`);
      return res.json({
        simulation: true,
        clientSecret: 'sim_sec_' + Date.now(),
        amount: parsedAmount
      });
    }

    const stripeInstance = Stripe(cfg.secretKey.trim());
    const amountInPence = Math.round(parsedAmount * 100);

    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amountInPence,
      currency: (cfg.currency || 'gbp').toLowerCase(),
      description: `MD Taxi Bath - Booking for ${passengerName || 'Passenger'} (${pickup} to ${dropoff})`,
      metadata: {
        passengerName: passengerName || 'Customer',
        pickup: pickup || '',
        dropoff: dropoff || ''
      },
      automatic_payment_methods: { enabled: true }
    });

    res.json({
      simulation: false,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('❌ Stripe Payment Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ================= STRIPE PAYMENT GATEWAY =================

const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripeClient = stripeSecret && !stripeSecret.includes('placeholder') ? Stripe(stripeSecret) : null;

app.get('/api/stripe-config', (req, res) => {
  const pubKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  const isLiveOrTestReady = pubKey && !pubKey.includes('placeholder');
  res.json({
    enabled: !!isLiveOrTestReady,
    publishableKey: isLiveOrTestReady ? pubKey : null
  });
});

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'gbp', passengerName, pickup, dropoff } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid fare amount' });
    }

    if (!stripeClient) {
      // In simulation mode if keys are placeholders
      return res.json({
        simulation: true,
        clientSecret: 'simulated_secret_' + Date.now(),
        amount: parsedAmount
      });
    }

    // Stripe expects amounts in pence for GBP (£15.30 -> 1530)
    const amountInPence = Math.round(parsedAmount * 100);

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: amountInPence,
      currency: currency.toLowerCase(),
      description: `MD Taxi Bath - Booking for ${passengerName || 'Passenger'} (${pickup} to ${dropoff})`,
      metadata: {
        passengerName: passengerName || 'Customer',
        pickup: pickup || '',
        dropoff: dropoff || ''
      },
      automatic_payment_methods: { enabled: true }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('❌ Stripe PaymentIntent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ================= LIVE TARIFF ENDPOINT =================

app.get('/api/airports', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM airport_matrix').all();
    res.json({ success: true, airports: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/tariff', (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM tariffs LIMIT 1").get();
    if (row) {
      // Sync waiting grace columns so there is no ambiguity
      row.waitingGraceMins = row.freeWaitMins || row.waitingGraceMins || 3;
      return res.json({ success: true, tariff: row });
    }
  } catch(e) {}
  res.json({ success: false, error: 'No tariff found' });
});


// ================= UK GEOCODING & ROUTING PROXY =================
app.get('/api/geocode', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json({ error: 'Missing query' });

  // 1. If UK postcode, resolve via postcodes.io
  const pcMatch = query.match(/([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/i);
  if (pcMatch) {
    try {
      const pc = pcMatch[0].replace(/\s+/g, '');
      const r = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(pc));
      const d = await r.json();
      if (d && d.status === 200 && d.result) {
        return res.json({
          lat: d.result.latitude,
          lon: d.result.longitude,
          postcode: d.result.postcode,
          area: d.result.admin_ward || d.result.parish || 'Bath'
        });
      }
    } catch (e) {}
  }

  // 2. Fallback Nominatim UK
  try {
    const qStr = query.toLowerCase().includes('bath') ? query : (query + ', Bath, UK');
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=1&q=' + encodeURIComponent(qStr), {
      headers: { 'User-Agent': 'MDTaxiDespatch/1.0 (admin@mdtaxi.co.uk)' }
    });
    const d = await r.json();
    if (d && d.length > 0) {
      return res.json({ lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon), name: d[0].display_name });
    }
  } catch (e) {}

  res.json({ error: 'Not found' });
});

// Fast Distance Calculation (OSRM Driving with Haversine Fallback)
app.get('/api/route-distance', async (req, res) => {
  const { startLon, startLat, endLon, endLat } = req.query;
  if (!startLon || !startLat || !endLon || !endLat) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  try {
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=false`;
    const r = await fetch(osrmUrl, { headers: { 'User-Agent': 'MDTaxiDespatch/1.0' } });
    const d = await r.json();
    if (d.routes && d.routes.length > 0) {
      const meters = d.routes[0].distance;
      const miles = parseFloat((meters * 0.000621371).toFixed(1));
      return res.json({ success: true, miles: Math.max(miles, 0.8) });
    }
  } catch (e) {}

  // Fallback Haversine road estimate
  const toRad = x => (x * Math.PI) / 180;
  const R = 3958.8; // Radius in miles
  const dLat = toRad(endLat - startLat);
  const dLon = toRad(endLon - startLon);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(startLat)) * Math.cos(toRad(endLat)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const rawMiles = R * c;
  const roadMiles = parseFloat((rawMiles * 1.28).toFixed(1)); // road detour factor
  res.json({ success: true, miles: Math.max(roadMiles, 0.8) });
});

// UK Address & Street Suggestion Endpoint
// ================= UK STREET & FULL POSTCODE RESOLVER =================

// ================= RAPID DISTANCE CALCULATOR =================

// ================= ACCURATE OSRM ROAD DISTANCE =================

// ================= UNIFIED OSRM ROAD DISTANCE (POSTCODE-CENTRIC) =================
app.get('/api/calculate-distance', async (req, res) => {
  const from = (req.query.from || '').trim();
  const to = (req.query.to || '').trim();
  if (!from || !to) return res.json({ miles: 2.1 });

  try {
    const geocodePoint = async (addr) => {
      // 1. Always look for a UK postcode first inside the string
      const pcMatch = addr.match(/([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})/i);
      if (pcMatch) {
        const cleanPc = pcMatch[1].replace(/\s+/g, '').toUpperCase();
        try {
          const pcRes = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(cleanPc));
          const pcData = await pcRes.json();
          if (pcData && pcData.result) {
            return { lat: pcData.result.latitude, lon: pcData.result.longitude };
          }
        } catch(e) {}
      }

      // 2. Nominatim fallback if no postcode found
      try {
        const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=1&q=${encodeURIComponent(addr)}`, {
          headers: { 'User-Agent': 'MDTaxiDespatch/2.0 (dispatch@mdtaxi.co.uk)' }
        });
        const osmData = await osmRes.json();
        if (osmData && osmData.length > 0) {
          return { lat: parseFloat(osmData[0].lat), lon: parseFloat(osmData[0].lon) };
        }
      } catch(e) {}
      return null;
    };

    const [c1, c2] = await Promise.all([geocodePoint(from), geocodePoint(to)]);
    if (c1 && c2) {
      try {
        const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${c1.lon},${c1.lat};${c2.lon},${c2.lat}?overview=false`;
        const osrmRes = await fetch(osrmUrl);
        const osrmData = await osrmRes.json();
        if (osrmData && osrmData.routes && osrmData.routes.length > 0) {
          // Exact formula used in admin.html
          const miles = parseFloat((osrmData.routes[0].distance * 0.000621371).toFixed(1));
          return res.json({ miles: Math.max(1.0, miles) });
        }
      } catch(e) {}
    }
  } catch(e) {}

  res.json({ miles: 2.1 });
});


app.get('/api/address-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });

  let results = [];
  const cleanQ = q.toUpperCase().replace(/\s+/g, '');
  const isPostcode = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(cleanQ);

  if (isPostcode) {
    try {
      const pcRes = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(cleanQ));
      const pcData = await pcRes.json();
      if (pcData && pcData.result) {
        const r = pcData.result;
        // Reverse geocode lat/lon to extract actual street / road name
        try {
          const revRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${r.latitude}&lon=${r.longitude}&addressdetails=1`, {
            headers: { 'User-Agent': 'MDTaxiDespatch/2.0 (dispatch@mdtaxi.co.uk)' }
          });
          const revData = await revRes.json();
          if (revData && revData.address) {
            const addr = revData.address;
            const road = addr.road || addr.pedestrian || addr.residential || addr.suburb || 'High Street';
            const city = addr.city || addr.town || addr.village || 'Bath';
            results.push({
              primary: `${road}, ${city}`,
              secondary: `${r.postcode}`,
              full: `${road}, ${city}, ${r.postcode}`,
              lat: r.latitude,
              lon: r.longitude
            });
          }
        } catch(e) {}

        if (results.length === 0) {
          const area = r.admin_district || 'Bath';
          results.push({
            primary: `${area}`,
            secondary: `${r.postcode}`,
            full: `${area}, ${r.postcode}`,
            lat: r.latitude,
            lon: r.longitude
          });
        }
      }
    } catch(e) {}
  }

  // Also query OSM for thoroughfare / landmark suggestions
  try {
    const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=6&addressdetails=1&q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'MDTaxiDespatch/2.0 (dispatch@mdtaxi.co.uk)' }
    });
    const osmData = await osmRes.json();
    if (Array.isArray(osmData)) {
      osmData.forEach(item => {
        const a = item.address || {};
        const road = a.road || a.pedestrian || a.suburb || item.name || '';
        const city = a.city || a.town || a.village || a.county || 'Bath';
        const pc = a.postcode || '';
        if (road) {
          const primary = `${road}, ${city}`;
          const secondary = pc || 'United Kingdom';
          const full = [road, city, pc].filter(Boolean).join(', ');
          if (!results.some(r => r.full === full)) {
            results.push({ primary, secondary, full, lat: item.lat, lon: item.lon });
          }
        }
      });
    }
  } catch(e) {}

  res.json({ results });
});


app.use(express.urlencoded({ extended: true }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
  next();
});
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});
app.use(express.static(path.join(__dirname, "public"), { etag: false, maxAge: 0 }));

const db = new Database('dispatch.db');

// Financials & Bidding Schema
try {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS job_bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bookingId INTEGER,
      driverId TEXT,
      driverName TEXT,
      bidEtaMinutes INTEGER,
      status TEXT DEFAULT 'pending',
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  const bookingCols = db.prepare("PRAGMA table_info(bookings)").all().map(c => c.name);
  if (!bookingCols.includes('paymentType')) {
    db.prepare("ALTER TABLE bookings ADD COLUMN paymentType TEXT DEFAULT 'CASH'").run();
  }
} catch (e) {
  console.log("Schema note:", e.message);
}


// COMPREHENSIVE SCHEMAS WITH TENANCY & COMPLIANCE
db.exec(`
  CREATE TABLE IF NOT EXISTS tariffs (
    id INTEGER PRIMARY KEY,
    tenantId TEXT DEFAULT 'MD-BATH',
    hubPostcodePrefix TEXT DEFAULT 'BA',
    freeWaitMins INTEGER DEFAULT 5,
    waitingRatePerMin REAL DEFAULT 0.35,
    viaStopFee REAL DEFAULT 5.00,
    petSurcharge REAL DEFAULT 6.00,
    offerTimeoutSeconds INTEGER DEFAULT 15,
    companyCommissionPct REAL DEFAULT 20.0,
    defaultLocalPricingMode TEXT DEFAULT 'dynamic',
    busySurgePct REAL DEFAULT 0.0,
    
    meterBaseFare REAL DEFAULT 3.50,
    meterDistancePulseYard INTEGER DEFAULT 176,
    meterDistancePulseCost REAL DEFAULT 0.20,
    meterTimePulseSeconds INTEGER DEFAULT 45,
    meterTimePulseCost REAL DEFAULT 0.20,

    meterEstatePct REAL DEFAULT 10.0,
    meterMpvPct REAL DEFAULT 40.0,
    meterMinibus7Pct REAL DEFAULT 60.0,
    meterMinibus8Pct REAL DEFAULT 60.0,
    meterExecPct REAL DEFAULT 70.0,

    baseFlagDrop REAL DEFAULT 5.00,
    firstMileRate REAL DEFAULT 2.00,
    tier1PerMile REAL DEFAULT 2.00,
    tier2PerMile REAL DEFAULT 1.80,
    tier3PerMile REAL DEFAULT 1.50,

    estatePercent REAL DEFAULT 0.10,
    mpvPercent REAL DEFAULT 0.40,
    minibus7Percent REAL DEFAULT 0.60,
    minibus8Percent REAL DEFAULT 0.60,
    execPercent REAL DEFAULT 0.70,

    airportEstatePercent REAL DEFAULT 0.10,
    airportMpvPercent REAL DEFAULT 0.45,
    airportMinibus7Percent REAL DEFAULT 0.60,
    airportMinibus8Percent REAL DEFAULT 0.60,
    airportExecPercent REAL DEFAULT 0.70
  );

  CREATE TABLE IF NOT EXISTS corporate_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenantId TEXT DEFAULT 'MD-BATH',
    accountNumber TEXT UNIQUE NOT NULL,
    companyName TEXT NOT NULL,
    discountPct REAL DEFAULT 0.0,
    paymentTerms TEXT DEFAULT '30 Days Net',
    billingEmail TEXT DEFAULT '',
    billingAddress TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS airport_matrix (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenantId TEXT DEFAULT 'MD-BATH',
    name TEXT NOT NULL,
    iataCode TEXT,
    keywords TEXT,
    baseRate REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS drivers (
    driverId TEXT PRIMARY KEY,
    tenantId TEXT DEFAULT 'MD-BATH',
    name TEXT,
    pin TEXT,
    vehicle TEXT,
    vehicleClass TEXT DEFAULT 'Saloon',
    maxPax INTEGER DEFAULT 4,
    phone TEXT,
    acceptsPets INTEGER DEFAULT 1,
    customCommissionPct REAL DEFAULT 20.0,
    status TEXT DEFAULT 'Offline',
    badgeExpiry TEXT DEFAULT '2027-12-31',
    motExpiry TEXT DEFAULT '2027-10-15',
    insuranceExpiry TEXT DEFAULT '2027-11-01'
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    tenantId TEXT DEFAULT 'MD-BATH',
    passenger TEXT,
    phone TEXT,
    pickup TEXT,
    vias TEXT DEFAULT '[]',
    dropoff TEXT,
    bookingType TEXT DEFAULT 'Immediate',
    pickupDateTime TEXT DEFAULT NULL,
    passengers INTEGER DEFAULT 1,
    vehicleClass TEXT DEFAULT 'ANY',
    strictVehicle INTEGER DEFAULT 0,
    hasPet INTEGER DEFAULT 0,
    petType TEXT DEFAULT 'None',
    petFee REAL DEFAULT 0.0,
    pricingType TEXT,
    paymentMethod TEXT DEFAULT 'Cash',
    accountNumber TEXT DEFAULT NULL,
    customerNotes TEXT DEFAULT NULL,
    fare REAL,
    assignedDriverId TEXT,
    attemptedDrivers TEXT DEFAULT '[]',
    dispatchAuditLog TEXT DEFAULT '[]',
    dispatchedAt TEXT DEFAULT NULL,
    acceptedAt TEXT DEFAULT NULL,
    arrivedAt TEXT DEFAULT NULL,
    pobAt TEXT DEFAULT NULL,
    completedAt TEXT DEFAULT NULL,
    status TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS plots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenantId TEXT DEFAULT 'MD-BATH',
    name TEXT NOT NULL,
    code TEXT,
    postcodeSector TEXT,
    plotType TEXT DEFAULT 'stand',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    radiusMeters INTEGER DEFAULT 350
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenantId TEXT DEFAULT 'MD-BATH',
    sender TEXT NOT NULL,
    targetDriverId TEXT DEFAULT 'ALL',
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );
`);

// MIGRATIONS
const cols = [
  "ALTER TABLE tariffs ADD COLUMN tenantId TEXT DEFAULT 'MD-BATH'",
  "ALTER TABLE corporate_accounts ADD COLUMN tenantId TEXT DEFAULT 'MD-BATH'",
  "ALTER TABLE corporate_accounts ADD COLUMN billingEmail TEXT DEFAULT ''",
  "ALTER TABLE corporate_accounts ADD COLUMN billingAddress TEXT DEFAULT ''",
  "ALTER TABLE airport_matrix ADD COLUMN tenantId TEXT DEFAULT 'MD-BATH'",
  "ALTER TABLE drivers ADD COLUMN tenantId TEXT DEFAULT 'MD-BATH'",
  "ALTER TABLE drivers ADD COLUMN badgeExpiry TEXT DEFAULT '2027-12-31'",
  "ALTER TABLE drivers ADD COLUMN motExpiry TEXT DEFAULT '2027-10-15'",
  "ALTER TABLE drivers ADD COLUMN insuranceExpiry TEXT DEFAULT '2027-11-01'",
  "ALTER TABLE bookings ADD COLUMN tenantId TEXT DEFAULT 'MD-BATH'",
  "ALTER TABLE plots ADD COLUMN tenantId TEXT DEFAULT 'MD-BATH'",
  "ALTER TABLE messages ADD COLUMN tenantId TEXT DEFAULT 'MD-BATH'"
];
cols.forEach(sql => { try { db.exec(sql); } catch(e) {} });

// INITIAL SEEDING
if (db.prepare('SELECT COUNT(*) as c FROM tariffs').get().c === 0) {
  db.prepare(`
    INSERT INTO tariffs (id, tenantId, meterBaseFare, busySurgePct, baseFlagDrop, firstMileRate, tier1PerMile, tier2PerMile, tier3PerMile)
    VALUES (1, 'MD-BATH', 3.50, 0.0, 5.00, 2.00, 2.00, 1.80, 1.50)
  `).run();
}
if (db.prepare('SELECT COUNT(*) as c FROM drivers').get().c === 0) {
  db.prepare(`
    INSERT INTO drivers (driverId, tenantId, name, pin, vehicle, vehicleClass, maxPax, phone, badgeExpiry, motExpiry, insuranceExpiry)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run('UKUND', 'MD-BATH', 'Mukund Desai', '1234', 'Hyundai i800', 'Minibus_8', 8, '07795681747', '2027-12-31', '2027-10-15', '2027-11-01');
}
if (db.prepare('SELECT COUNT(*) as c FROM plots').get().c === 0) {
  db.prepare('INSERT INTO plots (name, code, postcodeSector, plotType, lat, lng, radiusMeters, tenantId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run('Bath Spa Station Stand', 'STAND-SPA', 'BA1 1', 'stand', 51.3776, -2.3571, 350, 'MD-BATH');
}
if (db.prepare('SELECT COUNT(*) as c FROM airport_matrix').get().c === 0) {
  db.prepare('INSERT INTO airport_matrix (name, iataCode, keywords, baseRate, tenantId) VALUES (?, ?, ?, ?, ?)').run('Bristol Airport', 'BRS', 'bristol, lulsgate', 48.00, 'MD-BATH');
  db.prepare('INSERT INTO airport_matrix (name, iataCode, keywords, baseRate, tenantId) VALUES (?, ?, ?, ?, ?)').run('Heathrow Airport', 'LHR', 'heathrow, lhr', 140.00, 'MD-BATH');
}

const plotQueues = {};

function broadcastPlotQueueRanks(targetPlotId) {
  try {
    // 1. Emit precise rank & total count to each driver terminal
    for (const [pId, q] of Object.entries(plotQueues)) {
      const total = (q || []).length;
      (q || []).forEach((entry, idx) => {
        const rank = idx + 1;
        for (const [sid, d] of Object.entries(connectedDrivers)) {
          if (d && d.driverId && d.driverId.toUpperCase() === entry.driverId.toUpperCase()) {
            d.plotRank = rank;
            d.totalInPlot = total;
            d.currentPlotName = pId;
            io.to(sid).emit("queue_update", {
              plotName: pId,
              plotRank: rank,
              totalInPlot: total
            });
          }
        }
      });
    }

    // Drivers not present in any queue get notified
    for (const [sid, d] of Object.entries(connectedDrivers)) {
      if (d && d.driverId) {
        let foundInAny = false;
        let pName = d.currentPlot || "Standby";
        for (const [pId, q] of Object.entries(plotQueues)) {
          if ((q || []).some(x => x.driverId.toUpperCase() === d.driverId.toUpperCase())) {
            foundInAny = true;
            break;
          }
        }
        if (!foundInAny && d.activeJobId == null) {
          d.plotRank = 0;
          d.totalInPlot = (plotQueues[pName] || []).length;
          io.to(sid).emit("queue_update", {
            plotName: pName,
            plotRank: 0,
            totalInPlot: d.totalInPlot
          });
        }
      }
    }

    // 2. Fetch all registered plots and compute driver headcount
    let allPlots = [];
    try {
      allPlots = db.prepare("SELECT name FROM plots ORDER BY name ASC").all();
    } catch(e) {
      allPlots = [{ name: "Larkhall" }, { name: "City Centre" }, { name: "Station" }, { name: "Oldfield Park" }, { name: "Weston" }];
    }

    const densities = allPlots.map(p => {
      const q = plotQueues[p.name] || [];
      return { plotName: p.name, count: q.length };
    });

    // 3. Push complete directory to all terminals
    io.emit("all_plot_densities", densities);
  } catch (err) {
    console.error("Error in broadcastPlotQueueRanks:", err.message);
  }
}
function initQueues() {
  db.prepare('SELECT id FROM plots').all().forEach(p => { if (!plotQueues[p.id]) plotQueues[p.id] = []; });
}
initQueues();

function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (parseFloat(lat1) * Math.PI) / 180;
  const phi2 = (parseFloat(lat2) * Math.PI) / 180;
  const deltaPhi = ((parseFloat(lat2) - parseFloat(lat1)) * Math.PI) / 180;
  const deltaLambda = ((parseFloat(lon2) - parseFloat(lon1)) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function updateDriverPlotPosition(driverId, lat, lng, driverStatus) {
  const allPlots = db.prepare('SELECT * FROM plots').all();
  let matchedPlot = null;
  let driverRank = null;
  let closestDist = Infinity;
  const numLat = parseFloat(lat);
  const numLng = parseFloat(lng);

  for (let p of allPlots) {
    const dist = getDistanceMeters(numLat, numLng, p.lat, p.lng);
    if (dist <= (p.radiusMeters || 350) && dist < closestDist) {
      closestDist = dist;
      matchedPlot = p;
    }
  }

  allPlots.forEach(p => {
    if (!plotQueues[p.id]) plotQueues[p.id] = [];
    const isInThisPlot = matchedPlot && (matchedPlot.id === p.id);
    const existingIndex = plotQueues[p.id].findIndex(x => x.driverId.toUpperCase() === driverId.toUpperCase());
    if (isInThisPlot && driverStatus === 'Available') {
      if (existingIndex === -1) plotQueues[p.id].push({ driverId: driverId.toUpperCase(), enteredAt: Date.now() });
    } else {
      if (existingIndex !== -1) plotQueues[p.id].splice(existingIndex, 1);
    }
  });

  if (matchedPlot) {
    const qIndex = (plotQueues[matchedPlot.id] || []).findIndex(x => x.driverId.toUpperCase() === driverId.toUpperCase());
    driverRank = (qIndex !== -1 && driverStatus === "Available") ? qIndex + 1 : null;
  }
  return { matchedPlot, driverRank };
}

let connectedDrivers = {};

function findDriverSocket(targetId) {
  if (!targetId) return null;
  const clean = String(targetId).trim().toUpperCase();
  if (clean === 'AUTO' || clean === 'UNASSIGNED' || clean === 'NONE' || clean === '') return null;
  for (const sid of Object.keys(connectedDrivers)) {
    const cd = connectedDrivers[sid];
    if (!cd) continue;
    const dId = String(cd.driverId || "").trim().toUpperCase();
    const dName = String(cd.name || "").trim().toUpperCase();
    if (dId === clean || dName === clean || (dId && clean.includes(dId)) || (dName && clean.includes(dName))) {
      return sid;
    }
  }
  return null;
}

const activeOfferTimers = {};

function isAllTenant(t) {
  return !t || t === 'ALL' || t === 'MD-ALL' || t === 'GLOBAL';
}

function getTariff(tenantId = 'ALL') {
  if (isAllTenant(tenantId)) {
    return db.prepare('SELECT * FROM tariffs LIMIT 1').get() || {};
  }
  return db.prepare('SELECT * FROM tariffs WHERE tenantId = ? LIMIT 1').get(tenantId) || db.prepare('SELECT * FROM tariffs LIMIT 1').get() || {};
}
function getAirports(tenantId = 'ALL') {
  if (isAllTenant(tenantId)) {
    return db.prepare('SELECT * FROM airport_matrix ORDER BY id ASC').all();
  }
  return db.prepare('SELECT * FROM airport_matrix WHERE tenantId = ? ORDER BY id ASC').all(tenantId);
}
function getAccounts(tenantId = 'ALL') {
  if (isAllTenant(tenantId)) {
    return db.prepare('SELECT * FROM corporate_accounts ORDER BY rowid DESC').all();
  }
  return db.prepare('SELECT * FROM corporate_accounts WHERE tenantId = ? ORDER BY rowid DESC').all(tenantId);
}
function getAllJobs(tenantId = 'ALL') {
  if (isAllTenant(tenantId)) {
    return db.prepare('SELECT * FROM bookings ORDER BY rowid DESC LIMIT 250').all();
  }
  return db.prepare('SELECT * FROM bookings WHERE tenantId = ? ORDER BY rowid DESC LIMIT 250').all(tenantId);
}
function getPlots(tenantId = 'ALL') {
  const plotsQuery = isAllTenant(tenantId) 
    ? db.prepare('SELECT * FROM plots ORDER BY id ASC').all()
    : db.prepare('SELECT * FROM plots WHERE tenantId = ? ORDER BY id ASC').all(tenantId);
  return plotsQuery.map(p => ({
    ...p,
    queueCount: (plotQueues[p.id] || []).length,
    queue: (plotQueues[p.id] || []).map((q, idx) => ({ ...q, rank: idx + 1 }))
  }));
}
function getAllDrivers(tenantId = 'ALL') {
  const driversQuery = isAllTenant(tenantId)
    ? db.prepare('SELECT * FROM drivers').all()
    : db.prepare('SELECT * FROM drivers WHERE tenantId = ?').all(tenantId);
  return driversQuery.map(d => {
    const active = Object.values(connectedDrivers).find(c => c.driverId.toUpperCase() === d.driverId.toUpperCase());
    return {
      ...d,
      isOnline: !!active,
      status: active ? active.status : 'Offline',
      currentPlotName: active ? (active.currentPlotName || 'Larkhall') : 'Larkhall',
      plotRank: active ? active.plotRank : 1,
      lat: active ? active.lat : 51.3776,
      lng: active ? active.lng : -2.3571
    };
  });
}

function appendAudit(jobId, action, note) {
  try {
    const job = db.prepare('SELECT dispatchAuditLog FROM bookings WHERE id = ?').get(jobId);
    if (!job) return;
    let log = [];
    try { log = JSON.parse(job.dispatchAuditLog || '[]'); } catch(e){}
    log.push({ action, note, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) });
    db.prepare('UPDATE bookings SET dispatchAuditLog = ? WHERE id = ?').run(JSON.stringify(log), jobId);
  } catch(e){}
}

function routeJobCascade(jobId) {
  clearTimeout(activeOfferTimers[jobId]);
  const job = db.prepare("SELECT * FROM bookings WHERE id = ?").get(jobId);
  if (!job || ["Accepted", "ACCEPTED", "Arrived", "ARRIVED", "POB", "Completed", "COMPLETED", "Cancelled"].includes(job.status)) {
    return;
  }

  const attempted = JSON.parse(job.attemptedDrivers || "[]");
  const allPlots = db.prepare("SELECT * FROM plots").all();

  // 1. RESOLVE PICKUP PLOT/STAND (by Plot Name or Postcode Sector)
  let pickupPlotName = null;
  const pickupText = (job.pickup || "").toUpperCase();

  // A. Check exact or partial name in pickup address
  for (let p of allPlots) {
    if (pickupText.includes(p.name.toUpperCase())) {
      pickupPlotName = p.name;
      break;
    }
  }

  // B. Check Postcode Sector (BA1 6 -> Larkhall, BA1 1 -> City Centre, etc.)
  if (!pickupPlotName) {
    for (let p of allPlots) {
      if (p.postcodeSector) {
        const cleanSector = p.postcodeSector.replace(/\s+/g, " ").trim().toUpperCase();
        if (cleanSector && pickupText.includes(cleanSector)) {
          pickupPlotName = p.name;
          break;
        }
      }
    }
  }

  // C. Fallback coordinate check if coordinates exist on job object
  if (!pickupPlotName && (job.pickupLat || job.lat) && (job.pickupLng || job.lng)) {
    const jLat = job.pickupLat || job.lat;
    const jLng = job.pickupLng || job.lng;
    for (let p of allPlots) {
      if (typeof getDistanceMeters === "function") {
        if (getDistanceMeters(jLat, jLng, p.lat, p.lng) <= (p.radiusMeters || 600)) {
          pickupPlotName = p.name;
          break;
        }
      }
    }
  }

  // 2. EMPTY STAND OR UNKNOWN PLOT -> DIRECT TO OPEN BID BOARD
  if (!pickupPlotName) {
    console.log(`📢 Booking #${job.id} pickup ("${job.pickup}") is OUTSIDE all stands. Moving straight to OPEN BID BOARD.`);
    db.prepare("UPDATE bookings SET assignedDriverId = 'UNASSIGNED', status = 'Open For Bidding' WHERE id = ?").run(job.id);
    appendAudit(job.id, "BID_BOARD", "Pickup outside known stands. Moved to Bid Board.");
    job.assignedDriverId = "UNASSIGNED";
    job.status = "Open For Bidding";
    // BROADCAST TO DRIVER TERMINALS
    io.emit("open_job_for_bidding", job);
    broadcastAdminState();
      // socket ack guarded: caller handles its own ack
    if (typeof socket !== 'undefined' && socket && socket.emit) { socket.emit("job_created_ack", { success: true, jobId: job.id, message: "Booking confirmed successfully!" }); }
    return;
  }

  const standQueue = plotQueues[pickupPlotName] || [];
  if (standQueue.length === 0) {
    console.log(`📢 Stand "${pickupPlotName}" has NO drivers (0 active). Moving #${job.id} straight to OPEN BID BOARD.`);
    db.prepare("UPDATE bookings SET assignedDriverId = 'UNASSIGNED', status = 'Open For Bidding' WHERE id = ?").run(job.id);
    appendAudit(job.id, "BID_BOARD", `Stand ${pickupPlotName} has 0 drivers. Moved to Bid Board.`);
    job.assignedDriverId = "UNASSIGNED";
    job.status = "Open For Bidding";
    io.emit("open_job_for_bidding", job);
    broadcastAdminState();
    return;
  }

  // 3. COLLECT ONLY DRIVERS STATIONED ON THIS STAND
  const onlineDrivers = Object.values(connectedDrivers).filter(d => d.status === "Available" && !d.activeJobId);
  let eligibleDrivers = onlineDrivers.filter(d => {
    if (attempted.includes(d.driverId.toUpperCase())) return false;
    if (job.passengers && d.maxPax && d.maxPax < job.passengers) return false;
    // Driver MUST be stationed on this pickup stand
    const isOnStand = (d.currentPlotName && d.currentPlotName.toLowerCase() === pickupPlotName.toLowerCase()) ||
                      standQueue.some(q => q.driverId.toUpperCase() === d.driverId.toUpperCase());
    return isOnStand;
  });

  if (eligibleDrivers.length === 0) {
    console.log(`📢 All drivers on stand "${pickupPlotName}" exhausted. Moving #${job.id} to OPEN BID BOARD.`);
    db.prepare("UPDATE bookings SET assignedDriverId = 'UNASSIGNED', status = 'Open For Bidding' WHERE id = ?").run(job.id);
    appendAudit(job.id, "BID_BOARD", `All drivers on ${pickupPlotName} busy/exhausted. Moved to Bid Board.`);
    job.assignedDriverId = "UNASSIGNED";
    job.status = "Open For Bidding";
    io.emit("open_job_for_bidding", job);
    broadcastAdminState();
    return;
  }

  // 4. SORT BY STAND FIFO RANK (Position #1 first)
  eligibleDrivers.sort((a, b) => {
    const idxA = standQueue.findIndex(x => x.driverId.toUpperCase() === a.driverId.toUpperCase());
    const idxB = standQueue.findIndex(x => x.driverId.toUpperCase() === b.driverId.toUpperCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  const nextDriver = eligibleDrivers[0];
  const driverRank = standQueue.findIndex(x => x.driverId.toUpperCase() === nextDriver.driverId.toUpperCase()) + 1;

  attempted.push(nextDriver.driverId.toUpperCase());
  db.prepare("UPDATE bookings SET assignedDriverId = ?, status = 'Offered', attemptedDrivers = ? WHERE id = ?")
    .run(nextDriver.driverId.toUpperCase(), JSON.stringify(attempted), job.id);
  appendAudit(job.id, "OFFERED", `Offered to driver ${nextDriver.driverId} (${pickupPlotName} Position #${driverRank})`);

  job.assignedDriverId = nextDriver.driverId.toUpperCase();
  job.status = "Offered";

  const sid = findDriverSocket(nextDriver.driverId);
  if (sid) {
    io.to(sid).emit("job_offer", job);
    console.log(`🎯 Dispatched 15s offer for #${job.id} to driver ${nextDriver.driverId} (Stand ${pickupPlotName} Position #${driverRank})`);
  }

  broadcastAdminState();

  // 15s timeout
  const timeoutSec = 15 * 1000;
  activeOfferTimers[job.id] = setTimeout(() => {
    const checkJob = db.prepare("SELECT status FROM bookings WHERE id = ?").get(job.id);
    if (checkJob && ["Accepted", "ACCEPTED", "Arrived", "ARRIVED", "POB", "Completed", "COMPLETED"].includes(checkJob.status)) {
      return;
    }
    console.log(`⏰ Offer timeout on #${job.id} for driver ${nextDriver.driverId}. Cascading to next...`);
    const prevSid = findDriverSocket(nextDriver.driverId);
    if (prevSid) {
      io.to(prevSid).emit("job_offer_withdrawn", { jobId: job.id, reason: "Offer expired" });
    }
    demoteDriverToEndOfPlotQueue(nextDriver.driverId);
    routeJobCascade(job.id);
  }, timeoutSec);
}

app.get('/api/track/:jobId', (req, res) => {
  const jobId = (req.params.jobId || '').toUpperCase().trim();
  const job = db.prepare('SELECT * FROM bookings WHERE UPPER(id) = ?').get(jobId);
  if (!job) return res.status(404).json({ error: 'Trip not found' });

  let driver = null;
  if (job.assignedDriverId && job.assignedDriverId !== 'UNASSIGNED') {
    const dRec = db.prepare('SELECT driverId, name, vehicle, vehicleClass, phone FROM drivers WHERE UPPER(driverId) = ?').get(job.assignedDriverId);
    const active = Object.values(connectedDrivers).find(c => c.driverId.toUpperCase() === job.assignedDriverId.toUpperCase());
    driver = {
      ...dRec,
      lat: active ? active.lat : 51.3776,
      lng: active ? active.lng : -2.3571,
      isOnline: !!active
    };
  }

  res.json({ job, driver });
});

let clientTenant = 'ALL';


// === GLOBAL MASTER BROADCAST ===
function broadcastAdminState() {
  try {
    const tenant = (typeof clientTenant !== "undefined" && clientTenant) ? clientTenant : "MD-BATH";
    const activeTariff = typeof getTariff === "function" ? getTariff(tenant) : {};
    let allDrivers = [];
    try {
      allDrivers = typeof getMergedDrivers === "function" ? getMergedDrivers(typeof clientTenant !== 'undefined' && clientTenant ? clientTenant : 'MD-BATH') : db.prepare("SELECT * FROM drivers").all();
    } catch(e) {
      try { allDrivers = db.prepare("SELECT * FROM drivers").all(); } catch(e2) {}
    }
    let allPlots = [];
    try { allPlots = db.prepare("SELECT * FROM plots").all(); } catch(e) {}
    let allAirports = [];
    try { allAirports = db.prepare("SELECT * FROM airport_matrix").all(); } catch(e) {}
    let allAccounts = [];
    try {
      allAccounts = db.prepare("SELECT * FROM corporate_accounts").all();
    } catch(e) {
      try { allAccounts = db.prepare("SELECT * FROM accounts").all(); } catch(e2) {}
    }
    let allJobs = [];
    try {
      allJobs = typeof getAllJobs === "function" ? getAllJobs(clientTenant) : db.prepare("SELECT * FROM bookings ORDER BY rowid DESC").all();
    } catch(e) {
      try { allJobs = db.prepare("SELECT * FROM bookings ORDER BY rowid DESC").all(); } catch(e2) {}
    }

    io.emit("update_tariff", activeTariff);
    io.emit("update_driver_list", allDrivers);
    io.emit("update_jobs_list", allJobs);
    io.emit("update_airports", allAirports);
    io.emit("update_plots", allPlots);
    io.emit("update_accounts", allAccounts);
    console.log("📡 [BROADCAST] Fresh admin state pushed to all clients live.");
  } catch(err) {
    console.error("❌ Broadcast admin state error:", err);
  }
}

io.on('connection', (socket) => {
  console.log('⚡ Client connected to socket:', socket.id);
  
  // Immediately send initial state to this client
  try {
    const jobs = db.prepare('SELECT * FROM bookings ORDER BY rowid DESC').all();
    const drivers = db.prepare('SELECT * FROM drivers').all();
    const airports = db.prepare('SELECT * FROM airport_matrix').all();
    const plots = db.prepare('SELECT * FROM plots').all();
    let accounts = [];
    try { accounts = db.prepare('SELECT * FROM corporate_accounts').all(); } catch(e) {
      try { accounts = db.prepare('SELECT * FROM accounts').all(); } catch(e2) {}
    }
    const tariff = typeof getTariff === 'function' ? getTariff('MD-BATH') : {};

    socket.emit('update_jobs_list', jobs);
    socket.emit('update_driver_list', drivers);
    socket.emit('update_airports', airports);
    socket.emit('update_plots', plots);
    socket.emit('update_accounts', accounts);
    socket.emit('update_tariff', tariff);

    console.log(`📡 Auto-delivered to client: ${jobs.length} jobs, ${drivers.length} drivers, ${airports.length} airports, ${plots.length} plots, ${accounts.length} accounts`);
  } catch (err) {
    console.error('Error auto-delivering admin state:', err.message);
  }

  let clientTenant = 'ALL';

  // Helper to send complete state to an admin socket
  // Helper to merge live in-memory driver status with DB records
  function getMergedDrivers(tenant = 'MD-BATH') {
    const dbDrivers = db.prepare("SELECT * FROM drivers WHERE tenantId = ? OR tenantId IS NULL").all(tenant);
    return dbDrivers.map(d => {
      const live = Object.values(connectedDrivers).find(cd => cd.driverId && cd.driverId.toUpperCase() === d.driverId.toUpperCase());
      if (live) {
        return {
          ...d,
          status: live.status || 'Available',
          currentPlotName: live.currentPlotName || d.currentPlotName || 'Larkhall',
          activeJobId: live.activeJobId || null
        };
      }
      return d;
    });
  }

  // Helper to send snapshot of everything to admin socket
  function sendAdminState(targetSocket) {
  const s = targetSocket || io;
  try {
    const activeTariff = typeof getTariff === "function" ? getTariff(clientTenant) : {};
    
    let allDrivers = [];
    try {
      allDrivers = typeof getMergedDrivers === "function" ? getMergedDrivers('MD-BATH') : db.prepare("SELECT * FROM drivers").all();
    } catch(e) {
      allDrivers = db.prepare("SELECT * FROM drivers").all();
    }

    let allPlots = [];
    try { allPlots = db.prepare("SELECT * FROM plots").all(); } catch(e) {}

    let allAirports = [];
    try { allAirports = db.prepare("SELECT * FROM airport_matrix").all(); } catch(e) {}

    let allAccounts = [];
    try { 
      allAccounts = db.prepare("SELECT * FROM corporate_accounts").all(); 
    } catch(e) {
      try { allAccounts = db.prepare("SELECT * FROM accounts").all(); } catch(e2) {}
    }

    let allJobs = [];
    try {
      allJobs = typeof getAllJobs === "function" ? getAllJobs(clientTenant) : db.prepare("SELECT * FROM bookings ORDER BY rowid DESC").all();
    } catch(e) {
      allJobs = db.prepare("SELECT * FROM bookings ORDER BY rowid DESC").all();
    }

    // Emit all individual lists that public/admin.html listens to
    s.emit("update_tariff", activeTariff);
    s.emit("update_driver_list", allDrivers);
    s.emit("update_jobs_list", allJobs);
    s.emit("update_airports", allAirports);
    s.emit("update_plots", allPlots);
    s.emit("update_accounts", allAccounts);

    console.log("📡 Emitted state to admin: " + allJobs.length + " jobs, " + allDrivers.length + " drivers, " + allAirports.length + " airports, " + allPlots.length + " plots, " + allAccounts.length + " accounts");
  } catch (err) {
    console.error("Error in sendAdminState:", err.message);
  }
}

  socket.on('update_system_tariff', (data) => {
    try {
      const tariffCols = db.prepare("PRAGMA table_info(tariffs)").all().map(c => c.name);
      const t = getTariff(clientTenant);
      
      const validKeys = Object.keys(data).filter(k => tariffCols.includes(k) && k !== 'id' && k !== 'tenantId');
      if (validKeys.length > 0) {
        const setClauses = validKeys.map(k => `${k} = ?`).join(', ');
        const values = validKeys.map(k => data[k]);
        values.push(t.id || 1);
        db.prepare(`UPDATE tariffs SET ${setClauses} WHERE id = ?`).run(...values);
        console.log(`✅ Master Tariff updated: ${validKeys.length} settings saved.`);
      }
      broadcastAdminState();
    } catch (err) {
      console.error('Error in update_system_tariff:', err.message);
    }
  });

  // 3. AIRPORT MANAGEMENT (ADD / DELETE)
  socket.on('admin_add_airport', (data) => {
    try {
      const name = data.name || 'Airport';
      const iataCode = data.iataCode || '';
      const keywords = data.keywords || '';
      const rate = parseFloat(data.baseRate) || parseFloat(data.baseFare) || 0;

      db.prepare(`
        INSERT INTO airport_matrix (tenantId, name, iataCode, keywords, baseRate)
        VALUES (?, ?, ?, ?, ?)
      `).run(clientTenant, name, iataCode, keywords, rate);

      console.log(`✅ Airport added: ${name} (£${rate})`);
      broadcastAdminState();
    } catch (err) {
      console.error('Error adding airport:', err.message);
    }
  });

  
  

  // 4. DRIVER MANAGEMENT (ADD / UPDATE / ARCHIVE / DELETE)
  socket.on('admin_create_driver', (data) => {
    try {
      const dId = (data.driverId || '').toUpperCase().trim();
      if (!dId) return;

      const driverCols = db.prepare("PRAGMA table_info(drivers)").all().map(c => c.name);

      const driverObj = {
        driverId: dId,
        name: data.name || 'Driver',
        phone: data.phone || '',
        pin: String(data.pin || '1234'),
        vehicle: data.vehicle || '',
        vehicleClass: data.vehicleClass || 'Standard',
        maxPax: parseInt(data.maxPax) || 4,
        customCommissionPct: parseFloat(data.customCommissionPct) || 20,
        commissionRate: parseFloat(data.customCommissionPct) || 20,
        status: 'Offline',
        accountStatus: 'ACTIVE',
        tenantId: clientTenant
      };

      const keys = Object.keys(driverObj).filter(k => driverCols.includes(k));
      const cols = keys.join(', ');
      const placeholders = keys.map(() => '?').join(', ');
      const values = keys.map(k => driverObj[k]);

      db.prepare(`INSERT OR REPLACE INTO drivers (${cols}) VALUES (${placeholders})`).run(...values);
      console.log(`✅ Fleet Driver saved: ${data.name} (${dId})`);
      broadcastAdminState();
    } catch (err) {
      console.error('Error in admin_create_driver:', err.message);
    }
  });

  socket.on('admin_delete_driver', (driverId) => {
    try {
      db.prepare('DELETE FROM drivers WHERE UPPER(driverId) = UPPER(?)').run(driverId);
      console.log(`✅ Driver deleted: ${driverId}`);
      broadcastAdminState();
    } catch (err) {
      console.error('Error deleting driver:', err.message);
    }
  });

  socket.on('admin_archive_driver', (data) => {
    try {
      const dId = typeof data === 'object' ? (data.driverId || data.id) : data;
      db.prepare("UPDATE drivers SET accountStatus = 'ARCHIVED', status = 'Offline' WHERE UPPER(driverId) = UPPER(?)").run(dId);
      console.log(`✅ Driver archived: ${dId}`);
      broadcastAdminState();
    } catch (err) {
      console.error('Error archiving driver:', err.message);
    }
  });

  // 5. CORPORATE ACCOUNTS (ADD / DELETE)
  socket.on('admin_create_account', (data) => {
    try {
      const accNum = data.accountNumber || 'ACC-' + Date.now();
      db.prepare(`
        INSERT OR REPLACE INTO accounts (tenantId, accountNumber, companyName, contactPerson, email, phone, creditLimit, notes, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        clientTenant,
        accNum,
        data.companyName || 'Corporate Client',
        data.contactPerson || '',
        data.email || '',
        data.phone || '',
        parseFloat(data.creditLimit) || 1000,
        data.notes || ''
      );
      console.log(`✅ Corporate Account saved: ${data.companyName} (${accNum})`);
      broadcastAdminState();
    } catch (err) {
      console.error('Error in admin_create_account:', err.message);
    }
  });

  socket.on('admin_delete_account', (accId) => {
    try {
      db.prepare('DELETE FROM accounts WHERE id = ? OR accountNumber = ?').run(accId, accId);
      console.log(`✅ Corporate Account deleted: ${accId}`);
      broadcastAdminState();
    } catch (err) {
      console.error('Error deleting account:', err.message);
    }
  });

  // 6. PLOTS / STANDS (ADD / DELETE)
  socket.on('admin_add_plot', (data) => {
    try {
      const name = data.name || 'Stand';
      const codeStr = (data.code || 'PLOT-' + Date.now().toString().slice(-4)).toUpperCase();
      const sector = (data.postcodeSector || '').toUpperCase();
      const typeStr = data.plotType || 'STAND';
      const radius = parseInt(data.radiusMeters) || 1000;
      const capacity = parseInt(data.maxCapacity) || 10;

      db.prepare(`
        INSERT INTO plots (tenantId, name, code, postcodeSector, plotType, radiusMeters, maxCapacity, lat, lng)
        VALUES (?, ?, ?, ?, ?, ?, ?, 51.3776, -2.3571)
      `).run(clientTenant, name, codeStr, sector, typeStr, radius, capacity);

      console.log(`✅ Stand/Plot added in dispatch.db: ${name} (${codeStr})`);
      broadcastAdminState();
    } catch (err) {
      console.error('Error adding plot:', err.message);
    }
  });

  
    socket.on('admin_archive_booking', (jobId) => {
      try {
        db.prepare("UPDATE bookings SET status = 'Archived' WHERE id = ?").run(jobId);
        if (typeof sendAdminState === 'function') sendAdminState();
        console.log(`📦 Booking #${jobId} archived`);
      } catch (err) {
        console.error('Archive error:', err.message);
      }
    });

    socket.on('admin_delete_booking', (jobId) => {
      try {
        db.prepare("DELETE FROM bookings WHERE id = ?").run(jobId);
        if (typeof sendAdminState === 'function') sendAdminState();
        console.log(`🗑️️ Booking #${jobId} deleted`);
      } catch (err) {
        console.error('Delete booking error:', err.message);
      }
    });

    socket.on('admin_delete_plot', (plotId) => {
    try {
      db.prepare('DELETE FROM plots WHERE id = ?').run(plotId);
      console.log(`✅ Plot deleted: ${plotId}`);
      broadcastAdminState();
    } catch (err) {
      console.error('Error deleting plot:', err.message);
    }
  });

  // 7. BOOKINGS & DISPATCH ENGINE
    // 7. BOOKINGS & DISPATCH ENGINE
  socket.on('create_job', (job) => {
    try {
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const viasStr = typeof job.vias === 'object' ? JSON.stringify(job.vias) : (job.vias || '');

      const bookingCols = db.prepare("PRAGMA table_info(bookings)").all().map(c => c.name);

      const rawAssigned = String(job.assignedDriverId || '').trim();
      const hasSpecificDriver = rawAssigned !== '' && !['UNASSIGNED', 'AUTO', 'NONE'].includes(rawAssigned.toUpperCase());
      const effectiveDriverId = hasSpecificDriver ? rawAssigned : null;

      const jobRecord = {
        tenantId: clientTenant,
        passenger: job.passenger || job.customer || 'Passenger',
        phone: job.phone || '',
        pickup: job.pickup || '-',
        dropoff: job.dropoff || '-',
        vias: viasStr,
        fare: parseFloat(job.fare) || 0,
        vehicleClass: job.vehicleClass || 'Standard',
        passengers: parseInt(job.passengers) || parseInt(job.pax) || 1,
        luggage: parseInt(job.luggage) || 0,
        paymentMethod: job.paymentMethod || 'Cash',
        status: hasSpecificDriver ? 'Accepted' : 'Pending',
        customerNotes: job.customerNotes || job.notes || '',
        petType: job.petType || 'None',
        assignedDriverId: effectiveDriverId,
        id: (() => {
          let candidate = (job.id && String(job.id).trim() !== "") ? String(job.id).trim() : "";
          // If ID was supplied, verify it does not collide in SQLite
          if (candidate) {
            const exists = db.prepare("SELECT 1 FROM bookings WHERE id = ?").get(candidate);
            if (!exists) return candidate;
          }
          // Generate collision-free JOB ID
          while (true) {
            
    // Strict Sequential Job ID Generator (e.g. JOB-1001, JOB-1002, ...)
    let nextSeqNum = 1001;
    try {
      const allRows = db.prepare("SELECT id FROM bookings").all();
      let maxNum = 1000;
      for (const r of allRows) {
        if (r && r.id) {
          const num = parseInt(String(r.id).replace(/[^0-9]/g, ""), 10);
          if (!isNaN(num) && num > maxNum && num < 900000) { // filter out legacy 6-digit randoms
            maxNum = num;
          }
        }
      }
      nextSeqNum = maxNum + 1;
    } catch(e) {
      nextSeqNum = 1001;
    }
    candidate = "JOB-" + nextSeqNum;

            const exists = db.prepare("SELECT 1 FROM bookings WHERE id = ?").get(candidate);
            if (!exists) return candidate;
          }
        })(),
        createdAt: timeStr
      };

      // Only insert keys that actually exist in the table
      const validKeys = Object.keys(jobRecord).filter(k => bookingCols.includes(k));
      const colsClause = validKeys.join(', ');
      const placeholders = validKeys.map(() => '?').join(', ');
      const vals = validKeys.map(k => jobRecord[k]);

      const stmt = db.prepare(`INSERT INTO bookings (${colsClause}) VALUES (${placeholders})`);
      const res = stmt.run(...vals);

      const newJobId = jobRecord.id || ('JOB-' + res.lastInsertRowid);
      if (typeof appendAudit === 'function') {
        appendAudit(newJobId, 'CREATED', `Created booking #${newJobId} at ${timeStr}`);
      }

      console.log(`⚡ Booking #${newJobId} created for ${jobRecord.passenger} (Driver: ${jobRecord.assignedDriverId || 'Unassigned'})`);

            // Robust dispatch bridge for create_job
      const freshJob = db.prepare('SELECT * FROM bookings WHERE id = ?').get(newJobId) || jobRecord;
      const targetDriverStr = String(effectiveDriverId || '').trim();
      const targetSid = findDriverSocket(targetDriverStr);

      if (targetSid) {
        io.to(targetSid).emit('job_offer', freshJob);
        console.log(`📲 Dispatched job offer #${newJobId} directly to driver ${targetDriverStr} (socket: ${targetSid})`);
      } else {
        console.log(`🎯 Auto-dispatching job #${newJobId} via routeJobCascade...`);
        routeJobCascade(newJobId);
      }

        // ================= AUTOMATED PASSENGER SMS NOTIFICATION =================
        if (jobRecord.phone && typeof sendPassengerSMS === "function") {
          const smsMsg = `MD Taxi: Booking #${newJobId} confirmed! Pickup: ${jobRecord.pickup}. Fare: £${Number(jobRecord.fare).toFixed(2)}. Live Tracking: ${process.env.APP_BASE_URL || "http://localhost:3000"}/track.html?jobId=${newJobId}`;
          sendPassengerSMS(jobRecord.phone, smsMsg);
        }

      // Refresh admin tables, active bookings & live ledger
      broadcastAdminState();
        socket.emit('job_created_ack', { success: true, id: newJobId, jobId: newJobId, message: 'Booking confirmed!' });
    } catch (err) {
      console.error('Error in create_job:', err.message);
    }
  });

  socket.on('admin_amend_booking', (data) => {
    try {
      const id = data.id || data.jobId;
      console.log("Amending booking:", id, data);

      db.prepare(`
        UPDATE bookings SET 
          passenger = COALESCE(?, passenger),
          phone = COALESCE(?, phone),
          pickup = COALESCE(?, pickup),
          dropoff = COALESCE(?, dropoff),
          fare = COALESCE(?, fare),
          vehicleClass = COALESCE(?, vehicleClass),
          vias = COALESCE(?, vias),
          customerNotes = COALESCE(?, customerNotes)
        WHERE id = ?
      `).run(
        data.passenger || null,
        data.phone || null,
        data.pickup || null,
        data.dropoff || null,
        data.fare !== undefined ? data.fare : null,
        data.vehicleClass || null,
        data.vias || null,
        data.customerNotes || data.notes || data.reason || null,
        id
      );

      const noteText = data.reason || data.notes || "Admin amended booking details";
      appendAudit(id, "AMENDED", noteText);

      // Notify connected drivers & admins
      broadcastAdminState();
      io.emit("update_jobs_list", getAllJobs(clientTenant));
    } catch (err) {
      console.error("Error in admin_amend_booking:", err.message);
    }
  });

  socket.on('admin_reassign_booking', (data) => {
    try {
      const jobId = data.jobId || data.id;
      const newDriverId = data.newDriverId || data.driverId || 'UNASSIGNED';
      const reason = data.reason || 'Admin reassign';

      const isUnassigned = (!newDriverId || ['AUTO', 'UNASSIGNED', 'NONE'].includes(String(newDriverId).trim().toUpperCase()));
      const targetDriverUpper = String(newDriverId).trim().toUpperCase();
      const newStatus = isUnassigned ? 'Pending' : 'Accepted';
      const assignedVal = isUnassigned ? null : targetDriverUpper;

      // Fetch previous driver to clear their screen if reassigned away
      const oldJob = db.prepare("SELECT * FROM bookings WHERE id = ?").get(jobId);
      const prevDriver = oldJob && oldJob.assignedDriverId ? String(oldJob.assignedDriverId).toUpperCase().trim() : null;

      db.prepare("UPDATE bookings SET assignedDriverId = ?, status = ? WHERE id = ?").run(assignedVal, newStatus, jobId);
      if (typeof appendAudit === 'function') {
        appendAudit(jobId, 'REASSIGNED', `Reassigned to ${assignedVal || 'Unassigned'}. Reason: ${reason}`);
      }

      const freshJob = db.prepare('SELECT * FROM bookings WHERE id = ?').get(jobId);

      // If reassigning away from an old driver, clear their terminal
      if (prevDriver && prevDriver !== targetDriverUpper) {
        Object.values(connectedDrivers).forEach(d => {
          if (d.driverId.toUpperCase() === prevDriver) {
            d.status = "Available";
            d.activeJobId = null;
            io.to(d.socketId).emit("active_trip_cleared");
          }
        });
      }

      if (!isUnassigned) {
        // Find new driver socket session
        let targetSocket = null;
        Object.values(connectedDrivers).forEach(d => {
          if (d.driverId.toUpperCase() === targetDriverUpper) {
            targetSocket = d.socketId;
            d.status = "On Job";
            d.activeJobId = jobId;
          }
        });

        if (targetSocket) {
          io.to(targetSocket).emit('active_trip_assigned', freshJob);
          console.log(`📲 Dispatched reassigned job #${jobId} directly to driver ${targetDriverUpper}`);
        } else {
          console.log(`⚠️ Driver ${targetDriverUpper} not currently connected online.`);
        }
      } else {
        console.log(`🎯 Auto-dispatching reassigned job #${jobId} via routeJobCascade...`);
        routeJobCascade(jobId);
      }

      broadcastAdminState();
    } catch (err) {
      console.error('Error in admin_reassign_booking:', err.message);
    }
  });

  
  socket.on('get_booking_audit', (jobId) => {
    try {
      const logs = db.prepare("SELECT * FROM booking_audits WHERE bookingId = ? ORDER BY id ASC").all(jobId);
      socket.emit('booking_audit_data', { jobId, logs });
    } catch(err) {
      console.error('Audit query error:', err.message);
      socket.emit('booking_audit_data', { jobId, logs: [] });
    }
  });

  socket.on('admin_cancel_booking', (data) => {
    try {
      const id = String(data.jobId || data.id || "").trim();
      const reason = (data.reason || "Admin cancelled").trim();
      console.log("🛑 Cancelling booking:", id, "Reason:", reason);

      if (!id) {
        console.warn("admin_cancel_booking received empty ID:", data);
        return;
      }

      // Update status to Cancelled (and CANCELLED for full safety)
      db.prepare("UPDATE bookings SET status = 'Cancelled' WHERE id = ?").run(id);
      appendAudit(id, "CANCELLED", `Cancelled by Operator. Reason: ${reason}`);

      // Broadcast state and explicitly push updated jobs list
      broadcastAdminState();
      io.emit("update_jobs_list", getAllJobs(clientTenant));
      console.log("✅ Successfully cancelled booking:", id);
    } catch (err) {
      console.error("Error in admin_cancel_booking:", err.message);
    }
  });

  // 8. DRIVER AUTHENTICATION & LOCATION
  
  socket.on("driver_logout", (data) => {
    try {
      const d = connectedDrivers[socket.id];
      const dId = ((data && data.driverId) || (d ? d.driverId : "")).toUpperCase().trim();
      const dName = d ? d.name : dId;
      console.log(`🚪 Driver explicit logout: ${dName} (${dId}) - instant zero-delay stand purge.`);
      
      // Purge driver from all stands immediately
      if (dId) {
        removeDriverFromPlotQueues(dId);
      }
      
      // Clean up connectedDriver entry
      delete connectedDrivers[socket.id];
      
      // Re-broadcast updated ranks to all remaining connected drivers
      broadcastPlotQueueRanks();
      broadcastAdminState();
    } catch(err) {
      console.error("Error in driver_logout:", err.message);
    }
  });

  
  // CLEAN DISCONNECT HANDLER FOR DRIVER SOCKETS
  // 45-second reconnect grace period
  
  // Handle driver wake-up sync from mobile sleep mode
  
  // Handle driver wake-up sync from mobile sleep mode with full state push
  socket.on("driver_wakeup_sync", (data) => {
    try {
      const dId = data && data.driverId ? data.driverId.toUpperCase() : null;
      if (!dId) return;
      console.log("⚡ Full Driver State Wakeup Sync received for " + dId);
      
      // 1. Check active or offered job
      const activeJob = db.prepare(
        "SELECT * FROM bookings WHERE UPPER(assignedDriverId) = ? AND status IN ('Offered', 'OFFERED', 'Accepted', 'ACCEPTED', 'Arrived', 'ARRIVED', 'POB') LIMIT 1"
      ).get(dId);

      if (activeJob) {
        socket.emit("job_offer", activeJob);
        socket.emit("active_job_sync", activeJob);
      } else {
        socket.emit("no_active_job");
      }

      // 2. Send Open Bid Board jobs
      try {
        const bidBoardJobs = db.prepare("SELECT * FROM bookings WHERE status = 'BID_BOARD' OR status = 'Open' ORDER BY id DESC").all();
        socket.emit("bid_board_list", bidBoardJobs);
      } catch(e) {}

      
      // 3. Check stand rank info and auto-re-queue driver if they were on a plot
      /* removed duplicate */
      if (driverObj && driverObj.currentPlot) {
        const pName = driverObj.currentPlot;
        
        // Ensure driver is back in the plot queue upon wakeup if not already there
        if (!plotQueues[pName]) plotQueues[pName] = [];
        const existingInQueue = plotQueues[pName].find(q => q.driverId.toUpperCase() === dId);
        
        if (!existingInQueue && driverObj.status === "Available" && !driverObj.activeJobId) {
          // Re-add to queue at current time so they take their fair place at the back
          plotQueues[pName].push({
            driverId: dId,
            driverName: driverObj.name || dId,
            callsign: driverObj.callsign || dId,
            enteredAt: Date.now()
          });
          ensureSortedQueue(pName);
          console.log("⚡ Auto-requeued woken driver " + dId + " to stand " + pName);
        }

        const queue = plotQueues[pName] || [];
        const index = queue.findIndex(q => q.driverId.toUpperCase() === dId);
        const rank = index !== -1 ? index + 1 : null;
        const total = queue.length;
        socket.emit("stand_rank_update", { plotName: pName, rank, total });
        if (typeof broadcastPlotQueueRanks === "function") broadcastPlotQueueRanks(pName);
      }

      /* removed duplicate */
      if (driverObj && driverObj.currentPlot) {
        const pName = driverObj.currentPlot;
        const queue = plotQueues[pName] || [];
        const index = queue.findIndex(q => q.driverId.toUpperCase() === dId);
        const rank = index !== -1 ? index + 1 : null;
        const total = queue.length;
        socket.emit("stand_rank_update", { plotName: pName, rank, total });
      }

      socket.emit("wallet_refresh_needed");
      console.log("✅ Full state sync delivered to woken driver " + dId);
    } catch(e) {
      console.error("Error in driver_wakeup_sync:", e.message);
    }
  });


  socket.on("disconnect", () => {
    const d = connectedDrivers[socket.id];
    if (d) {
      const dId = (d.driverId || "").toUpperCase();
      const dName = d.name;
      console.log(`🔌 Driver socket disconnected: ${dName} (${dId}) - preserving stand rank (45s grace)`);
      delete connectedDrivers[socket.id];

      // Delay queue eviction to survive tab reloads and brief network blips
      setTimeout(() => {
        const isReconnected = Object.values(connectedDrivers).some(x => (x.driverId || "").toUpperCase() === dId);
        if (isReconnected) {
          console.log(`🛡️ Driver ${dName} (${dId}) is actively connected on another socket. Stand rank preserved.`);
          return;
        }
        if (!isReconnected) {
          console.log(`⏰ Reconnect grace expired for ${dName} (${dId}). Evicting from stand.`);
          for (const p of Object.keys(plotQueues)) {
            plotQueues[p] = (plotQueues[p] || []).filter(x => x.driverId.toUpperCase() !== dId);
          }
          broadcastPlotQueueRanks();
          broadcastAdminState();
        }
      }, 45000);
    }
  });

  
  socket.on("driver_switch_plot", (data) => {
    try {
      const d = connectedDrivers[socket.id];
      if (!d) return;
      const newPlot = (data && data.plotName) ? data.plotName.trim() : "Larkhall";
      const dId = d.driverId.toUpperCase();

      // Remove from all plots
      for (const p of Object.keys(plotQueues)) {
        plotQueues[p] = (plotQueues[p] || []).filter(x => x.driverId.toUpperCase() !== dId);
      }
      if (!plotQueues[newPlot]) plotQueues[newPlot] = [];
      plotQueues[newPlot].push({ driverId: dId, enteredAt: Date.now() });
      d.currentPlotName = newPlot;
      console.log(`📍 Driver ${dId} moved to stand ${newPlot}`);
      broadcastPlotQueueRanks();
    } catch(e) {}
  });

  socket.on("driver_login", (data) => {
    try {
      const driverId = (data.driverId || "").toUpperCase().trim();
      const pin = String(data.pin || "").trim();
      const clientDeviceId = String(data.deviceId || "").trim();

      const driver = db.prepare("SELECT * FROM drivers WHERE UPPER(driverId) = ? LIMIT 1").get(driverId);
      if (!driver) {
        return socket.emit("login_result", { success: false, message: "Driver ID not found" });
      }

      if (driver.pin && String(driver.pin).trim() !== pin) {
        return socket.emit("login_result", { success: false, message: "Invalid PIN" });
      }

      // STRICT HARDWARE DEVICE ENFORCEMENT
      for (const [oldSid, d] of Object.entries(connectedDrivers)) {
        if (d.driverId.toUpperCase() === driverId && oldSid !== socket.id) {
          const oldSock = io.sockets.sockets.get(oldSid);
          const isOldSockAlive = oldSock && oldSock.connected;

          if (isOldSockAlive && d.deviceId && clientDeviceId && d.deviceId !== clientDeviceId) {
            console.log(`🚫 REJECTED login for ${driverId}: active on device ${d.deviceId}, attempt from ${clientDeviceId}`);
            return socket.emit("login_result", {
              success: false,
              message: "Driver " + driverId + " is currently active on another device (" + d.deviceId.substring(0, 10) + "...). Please log off from your other handset first."
            });
          }

          if (oldSock) {
            oldSock.disconnect(true);
          }
          delete connectedDrivers[oldSid];
        }
      }

      const activeTrip = db.prepare(
        "SELECT * FROM bookings WHERE UPPER(assignedDriverId) = ? AND status IN ('Accepted', 'ACCEPTED', 'Arrived', 'ARRIVED', 'POB') LIMIT 1"
      ).get(driverId);

      socket.driverId = driverId;

      // Determine Stand / Plot Queue Rank
      const defaultPlot = "Larkhall";
      if (!plotQueues[defaultPlot]) plotQueues[defaultPlot] = [];
      plotQueues[defaultPlot] = plotQueues[defaultPlot].filter(x => x.driverId.toUpperCase() !== driverId);
      if (!activeTrip) {
        plotQueues[defaultPlot].push({ driverId: driverId, enteredAt: Date.now() });
      }

      const qList = plotQueues[defaultPlot] || [];
      const myCalculatedRank = activeTrip ? 0 : qList.findIndex(x => x.driverId.toUpperCase() === driverId) + 1;
      const totalInPlotCount = qList.length;

      // REGISTER DRIVER FIRST so broadcastPlotQueueRanks finds this socket!
      connectedDrivers[socket.id] = {
        deviceId: clientDeviceId,
        socketId: socket.id,
        driverId: driver.driverId,
        name: driver.name,
        phone: driver.phone,
        vehicle: driver.vehicle,
        vehicleClass: driver.vehicleClass || "Standard",
        status: activeTrip ? "On Job" : "Available",
        activeJobId: activeTrip ? activeTrip.id : null,
        currentPlotName: defaultPlot,
        plotRank: myCalculatedRank,
        totalInPlot: totalInPlotCount,
        lat: 51.3811,
        lng: -2.3590,
        lastSeen: new Date().toISOString()
      };

      console.log(`✅ Driver logged in: ${driver.name} (${driverId}) on ${defaultPlot} - Rank #${myCalculatedRank} of ${totalInPlotCount}`);

      // Broadcast fresh ranks to EVERYONE
      broadcastPlotQueueRanks(defaultPlot);

      // Send login success directly to this socket
      socket.emit("login_result", {
        success: true,
        driver: connectedDrivers[socket.id],
        activeTrip: activeTrip || null
      });

      // Deliver all existing Open For Bidding jobs directly to this driver handset
      try {
        const currentBids = db.prepare("SELECT * FROM bookings WHERE status = 'Open For Bidding'").all();
        currentBids.forEach(b => socket.emit("open_job_for_bidding", b));
      } catch(e) {}

      // Re-deliver any active, unexpired 15s job offer if driver reconnected mid-offer
      try {
        if (typeof activeOfferTimers !== 'undefined') {
          for (const [offerJobId, timer] of Object.entries(activeOfferTimers)) {
            if (timer) {
              const pendingJob = db.prepare("SELECT * FROM bookings WHERE id = ?").get(offerJobId);
              if (pendingJob && !['Accepted', 'ACCEPTED', 'Arrived', 'ARRIVED', 'POB', 'Completed', 'COMPLETED', 'Cancelled'].includes(pendingJob.status)) {
                socket.emit("job_offer", pendingJob);
                console.log(`🔄 Re-delivered active 15s offer for #${pendingJob.id} to reconnected driver ${driverId}`);
              }
            }
          }
        }
      } catch(e) {
        console.error("Error re-delivering active offer:", e.message);
      }

      // Send targeted queue_update so handset never waits
      socket.emit("queue_update", {
        plotName: defaultPlot,
        plotRank: myCalculatedRank,
        totalInPlot: totalInPlotCount
      });

      // Dispatched earnings push
      try {
        const walletRows = db.prepare("SELECT fare FROM bookings WHERE UPPER(assignedDriverId) = ? AND status IN ('Completed', 'COMPLETED')").all(driverId);
        const gross = walletRows.reduce((sum, r) => sum + (parseFloat(r.fare) || 0), 0);
        const net = gross * 0.8;
        socket.emit("wallet_update", {
          grossEarnings: gross.toFixed(2),
          netEarnings: net.toFixed(2),
          jobsCompleted: walletRows.length
        });
      } catch(e) {}

      broadcastAdminState();
    } catch (err) {
      console.error("Error in driver_login:", err.message);
      socket.emit("login_result", { success: false, message: "Server error during login" });
    }
  });

  socket.on('driver_location_update', (coords) => {
    const d = connectedDrivers[socket.id];
    if (!d || !coords) return;
    d.lat = coords.lat;
    d.lng = coords.lng;

    if (typeof updateDriverPlotPosition === 'function') {
      updateDriverPlotPosition(d.driverId, coords.lat, coords.lng, d.status);
    }

    io.emit('driver_pos_broadcast', {
      driverId: d.driverId,
      name: d.name,
      status: d.status,
      lat: coords.lat,
      lng: coords.lng
    });
  });

  // 9. DRIVER TRIP LIFECYCLE
    // FASTEST FINGER: OPEN BID BOARD CLAIM
  socket.on("driver_claim_bid_job", (data) => {
    try {
      const jobId = data.jobId || data.bookingId;
      const job = db.prepare("SELECT * FROM bookings WHERE id = ?").get(jobId);
      
      // Ensure job is still open for bidding
      if (!job || job.status !== "Open For Bidding") {
        return socket.emit("bid_claim_failed", { message: "Job already claimed by another driver." });
      }

      const d = connectedDrivers[socket.id];
      const driverId = d ? d.driverId : (socket.driverId || "MUKUND");
      const driverName = d ? d.name : driverId;
      const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

      if (d) {
        d.status = "On Job";
        d.activeJobId = jobId;
      }
      removeDriverFromPlotQueues(driverId);
      broadcastPlotQueueRanks();
      try {
        db.prepare("UPDATE drivers SET status = 'On Job', activeJobId = ? WHERE id = ? OR callsign = ?").run(jobId, driverId, driverId);
      } catch(e) {}

      db.prepare("UPDATE bookings SET status = 'Accepted', assignedDriverId = ?, acceptedAt = ? WHERE id = ?")
        .run(driverId, timeStr, jobId);

      appendAudit(jobId, "BID_CLAIMED", `Fastest-finger claimed by driver ${driverName} (${driverId})`);
      console.log(`🏆 Driver ${driverId} claimed Bid Board job #${jobId}`);

      const freshJob = db.prepare("SELECT * FROM bookings WHERE id = ?").get(jobId);
      socket.emit("active_trip_assigned", freshJob);

      // Broadcast fresh Open Bid Board list to all connected drivers
      const remainingBids = db.prepare("SELECT * FROM bookings WHERE status = 'Open For Bidding'").all();
      io.emit("bid_board_list", remainingBids);

      // Remove busy driver from stand queue so other waiting drivers advance
      const claimingDriver = connectedDrivers[socket.id];
      const claimPlot = claimingDriver ? claimingDriver.currentPlot : null;
      removeDriverFromPlotQueues(driverId);
      if (claimPlot) broadcastPlotQueueRanks(claimPlot);

      // Notify all drivers to remove this job from their bid boards
      io.emit("bid_job_claimed", { jobId: jobId });
      broadcastAdminState();
    } catch(err) {
      console.error("Error in driver_claim_bid_job:", err.message);
    }
  });

  socket.on('driver_job_response', (data) => {
    try {
      const jobId = data.jobId || data.bookingId;
      const resp = (data.response || '').toUpperCase();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      if (resp === 'ACCEPTED' || resp === 'ACCEPT') {
        const d = connectedDrivers[socket.id];
        const driverId = (d ? d.driverId : (socket.driverId || "")).toUpperCase().trim();
        const driverName = d ? d.name : driverId;

        // ATOMIC VERIFICATION: Check if booking is still available for THIS driver
        const currentBooking = db.prepare("SELECT * FROM bookings WHERE id = ?").get(jobId);
        if (!currentBooking) {
          return socket.emit("offer_failed", { message: "Job no longer exists." });
        }

        const isCurrentlyOfferedToMe = (currentBooking.status === "Offered" && String(currentBooking.assignedDriverId || "").toUpperCase() === driverId);
        const isOpenBid = (currentBooking.status === "Open For Bidding");

        if (!isCurrentlyOfferedToMe && !isOpenBid) {
          console.log(`⚠️ Late accept blocked: Driver ${driverId} tried to accept #${jobId}, but job is ${currentBooking.status} (assigned to ${currentBooking.assignedDriverId})`);
          socket.emit("offer_failed", { message: "Offer expired! Job was already cascaded or accepted." });
          return socket.emit("job_offer_withdrawn", { jobId: jobId, reason: "Expired" });
        }

        // KILL CASCADE TIMER INSTANTLY
        if (activeOfferTimers[jobId]) {
          clearTimeout(activeOfferTimers[jobId]);
          delete activeOfferTimers[jobId];
        }

        if (d) {
          d.status = 'On Job';
          d.activeJobId = jobId;
          removeDriverFromPlotQueues(driverId);
          broadcastPlotQueueRanks();
        }
        try {
          db.prepare("UPDATE drivers SET status = 'On Job', activeJobId = ? WHERE id = ? OR callsign = ?").run(jobId, driverId, driverId);
        } catch(e) {}

        db.prepare("UPDATE bookings SET status = 'Accepted', assignedDriverId = ?, acceptedAt = ? WHERE id = ?")
          .run(driverId, timeStr, jobId);

        appendAudit(jobId, 'ACCEPTED', `Accepted by driver ${driverName} (${driverId}) at ${timeStr}`);

        const job = db.prepare('SELECT * FROM bookings WHERE id = ?').get(jobId);
        socket.emit('active_trip_assigned', job);
        broadcastAdminState();
      } else {
        const d = connectedDrivers[socket.id];
        const rejectingDriverId = (d ? d.driverId : (socket.driverId || '')).toUpperCase().trim();
        
        // Record declining driver so they are never offered this job again in the cascade
        const currentJob = db.prepare("SELECT attemptedDrivers FROM bookings WHERE id = ?").get(jobId);
        let attempted = [];
        try { attempted = JSON.parse((currentJob && currentJob.attemptedDrivers) || "[]"); } catch(e){}
        if (rejectingDriverId && !attempted.includes(rejectingDriverId)) {
          attempted.push(rejectingDriverId);
          db.prepare("UPDATE bookings SET attemptedDrivers = ? WHERE id = ?").run(JSON.stringify(attempted), jobId);
        }

        appendAudit(jobId, 'REJECTED', `Driver ${rejectingDriverId || "Unknown"} declined run`);
        console.log(`🚫 Driver ${rejectingDriverId} rejected job #${jobId}. Advancing cascade...`);
        // DEMOTE REJECTING DRIVER TO BACK OF STAND QUEUE
        demoteDriverToEndOfPlotQueue(rejectingDriverId);
        
        if (typeof routeJobCascade === 'function') routeJobCascade(jobId);
      }
    } catch (err) {
      console.error('Error in driver_job_response:', err.message);
    }
  });

    // ================= 2-WAY CHAT & LIVE MESSAGING =================
  socket.on('send_driver_message', (data) => {
    try {
      const driverId = socket.driverId || (connectedDrivers[socket.id] && connectedDrivers[socket.id].driverId) || data.driverId;
      const driverName = (connectedDrivers[socket.id] && connectedDrivers[socket.id].name) || driverId || 'Driver';
      const text = (data.text || data.message || '').trim();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!text) return;

      const payload = {
        sender: 'driver',
        driverId: driverId,
        driverName: driverName,
        text: text,
        time: timeStr
      };

      console.log(`💬 [${driverId}] -> Dispatcher: ${text}`);
      // Broadcast to admin dashboard
      io.emit('driver_message_received', payload);
      // Echo back to sender driver socket
      socket.emit('driver_message_received', payload);
    } catch(err) {
      console.error('Error in send_driver_message:', err.message);
    }
  });

  socket.on('send_admin_message', (data) => {
    try {
      const targetDriverId = (data.driverId || '').trim();
      const text = (data.text || data.message || '').trim();
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (!text) return;

      const payload = {
        sender: 'dispatcher',
        driverId: targetDriverId,
        text: text,
        time: timeStr
      };

      console.log(`💬 Dispatcher -> [${targetDriverId || 'ALL'}]: ${text}`);

      if (targetDriverId && targetDriverId.toUpperCase() !== 'ALL') {
        const targetSid = findDriverSocket(targetDriverId);
        if (targetSid) {
          io.to(targetSid).emit('driver_message_received', payload);
        }
      } else {
        // Broadcast to all drivers
        Object.keys(connectedDrivers).forEach(sid => {
          io.to(sid).emit('driver_message_received', payload);
        });
      }
      // Also echo to admin
      io.emit('driver_message_received', payload);
    } catch(err) {
      console.error('Error in send_admin_message:', err.message);
    }
  });

  // ================= DRIVER WAITING TIME SYNC =================
  // ================= TRIP STATUS LIFECYCLE ENGINE =================
  socket.on("update_trip_status", (data) => {
    try {
      const rawJobId = String(data.jobId || data.id || "").trim();
      if (!rawJobId) return;
      const strippedId = rawJobId.replace(/[^0-9]/g, "");
      const fullJobId = rawJobId.startsWith("JOB-") ? rawJobId : ("JOB-" + strippedId);
      const status = (data.status || "").toUpperCase();
      const fare = data.fare !== undefined ? parseFloat(data.fare) : null;
      const driverId = (data.driverId || "").toUpperCase();
      const waitingCharge = data.waitingCharge !== undefined ? parseFloat(data.waitingCharge) : 0.00;

      console.log("🔄 [STATUS UPDATE] Job #" + rawJobId + " -> " + status + " (Fare: " + fare + ")");

      // Guard: Never downgrade a completed or cancelled job
      try {
        const existingJob = db.prepare("SELECT status FROM bookings WHERE id = ? OR id = ?").get(rawJobId, fullJobId);
        if (existingJob && (existingJob.status === "COMPLETED" || existingJob.status === "CANCELLED")) {
          console.log("🛑 [GUARD] Ignored stale status '" + status + "' for already finished job #" + rawJobId);
          return;
        }
      } catch(e) {}

      if (status === "COMPLETED") {
        const completedIso = new Date().toISOString();

        db.prepare(`
          UPDATE bookings SET 
            status = 'COMPLETED',
            fare = COALESCE(?, fare),
            waitingCharge = COALESCE(?, waitingCharge),
            completedAt = ?
          WHERE id = ? OR id = ?
        `).run(fare, waitingCharge, completedIso, rawJobId, fullJobId);

        

        // Free driver in memory ONLY IF NO FOLLOW-UP/NEXT TRIP EXISTS
        Object.values(connectedDrivers).forEach(d => {
          const isTargetDriver = String(d.activeJobId) === rawJobId || 
                                 String(d.activeJobId) === fullJobId || 
                                 (driverId && String(d.driverId).toUpperCase() === driverId.toUpperCase());

          if (isTargetDriver) {
            const thisDriverId = String(d.driverId).toUpperCase();
            
            // Check if driver has another active or accepted job queued
            let nextJob = null;
            try {
              nextJob = db.prepare(`
                SELECT id FROM bookings 
                WHERE UPPER(assignedDriverId) = ? 
                  AND status IN ('ACCEPTED', 'Accepted', 'ARRIVED', 'Arrived', 'POB')
                  AND id != ? AND id != ?
                ORDER BY id ASC LIMIT 1
              `).get(thisDriverId, rawJobId, fullJobId);
            } catch(e) {
              console.error("Error checking next job:", e.message);
            }

            if (nextJob) {
              // Driver is still busy with follow-up run: DO NOT re-enter stand queue!
              d.activeJobId = nextJob.id;
              d.status = "On Job";
              removeDriverFromPlotQueues(thisDriverId);
              console.log(`🚖 Driver ${thisDriverId} transitioned immediately to follow-up Job #${nextJob.id}. Stand queue bypassed.`);
            } else {
              // Driver is completely free: re-join stand queue at back
              d.activeJobId = null;
              d.status = "Available";
              const pName = d.currentPlotName || d.currentPlot || "Larkhall";
              if (!plotQueues[pName]) plotQueues[pName] = [];
              plotQueues[pName] = plotQueues[pName].filter(x => x.driverId.toUpperCase() !== thisDriverId);
              plotQueues[pName].push({ driverId: d.driverId, enteredAt: Date.now() });
              console.log(`🏁 Driver ${thisDriverId} completed all jobs. Returned to stand ${pName}.`);
            }
          }
        });
        broadcastPlotQueueRanks();

        // Free driver in SQLite
        if (driverId) {
          try {
            db.prepare("UPDATE drivers SET status = 'Available' WHERE UPPER(driverId) = ?").run(driverId);
          } catch(e) {}
        }

        appendAudit(rawJobId, "COMPLETED", "Job completed. Final Fare: £" + (fare ? fare.toFixed(2) : "0.00"));
        broadcastAdminState();
        if (typeof getAllJobs === "function") io.emit("update_jobs_list", getAllJobs(clientTenant));
      } else {
        db.prepare(`
          UPDATE bookings SET 
            status = ?,
            fare = COALESCE(?, fare)
          WHERE id = ? OR id = ?
        `).run(status, fare, rawJobId, fullJobId);

        appendAudit(rawJobId, status, "Driver updated status to " + status);
        const curJob = db.prepare("SELECT * FROM bookings WHERE id = ? OR id = ?").get(rawJobId, fullJobId);
        if (curJob && curJob.phone) {
          const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
          const trackLink = `${baseUrl}/track.html?jobId=${rawJobId}`;
          
          // Fetch assigned driver and vehicle specs
          const dId = curJob.assignedDriverId || driverId;
          let driverDetails = "Mukund Desai";
          let carDetails = "";
          if (dId) {
            try {
              const dRow = db.prepare("SELECT name, vehicleMake, vehicleModel, vehicleReg, vehicleColor FROM drivers WHERE UPPER(driverId) = UPPER(?)").get(dId);
              if (dRow) {
                driverDetails = dRow.name || dId;
                const vParts = [dRow.vehicleColor, dRow.vehicleMake, dRow.vehicleModel].filter(Boolean).join(" ");
                if (vParts || dRow.vehicleReg) {
                  carDetails = ` in ${vParts || "vehicle"}${dRow.vehicleReg ? " (" + dRow.vehicleReg + ")" : ""}`;
                }
              }
            } catch(e) {}
          }

          if (status === "ACCEPTED" || status === "ON_THE_WAY" || status === "EN_ROUTE") {
            const msg = `MD Taxi Update: Driver ${driverDetails}${carDetails} is on the way! Live Tracking: ${trackLink}`;
            sendPassengerSMS(curJob.phone, msg);
          } else if (status === "ARRIVED") {
            const msg = `MD Taxi: Driver${driverDetails}${carDetails} has arrived outside ${curJob.pickup || "your address"}. Track: ${trackLink}`;
            sendPassengerSMS(curJob.phone, msg);
          }
        }
      }

      socket.emit("wallet_refresh_needed");
      io.emit("job_status_changed", { jobId: rawJobId, status, fare });
      broadcastAdminState();
    } catch(err) {
      console.error("❌ Error in update_trip_status:", err.message);
    }
  });

  socket.on('driver_update_waiting', (data) => {
    try {
      const { jobId, arrivalWaitMins, enRouteWaitMins, waitingCharge, totalFare } = data;
      if (!jobId) return;

      db.prepare(`
        UPDATE bookings SET
          arrivalWaitMins = COALESCE(?, arrivalWaitMins),
          enRouteWaitMins = COALESCE(?, enRouteWaitMins),
          waitingCharge = COALESCE(?, waitingCharge),
          fare = COALESCE(?, fare)
        WHERE id = ?
      `).run(
        arrivalWaitMins !== undefined ? arrivalWaitMins : null,
        enRouteWaitMins !== undefined ? enRouteWaitMins : null,
        waitingCharge !== undefined ? waitingCharge : null,
        totalFare !== undefined ? totalFare : null,
        jobId
      );

      // Instantly broadcast to admin ledger
      broadcastAdminState();
    } catch(err) {
      console.error('Error in driver_update_waiting:', err.message);
    }
  });

  
  // ================= RECALL & RETURN TO BASE HANDLERS =================
  socket.on('driver_reject_active_job', (data) => {
    try {
      const jobId = data.jobId || data.id;
      const driverId = (data.driverId || '').toUpperCase().trim();
      const reason = data.reason || 'Driver problem';
      if (!jobId) return;

      // Reset booking status to Open For Bidding and clear driver
      db.prepare(`
        UPDATE bookings SET 
          status = 'Open For Bidding', 
          assignedDriverId = NULL
        WHERE id = ? OR id = ?
      `).run(jobId, "JOB-" + String(jobId).replace(/\D/g, ""));

      // Free driver in memory
      Object.values(connectedDrivers).forEach(d => {
        if (d.driverId.toUpperCase() === driverId || d.activeJobId === jobId) {
          d.status = "Available";
          d.activeJobId = null;
        }
      });
      if (driverId) {
        try {
          db.prepare("UPDATE drivers SET status = 'Available', activeJobId = NULL WHERE UPPER(driverId) = ?").run(driverId);
        } catch(e) {}
      }

      appendAudit(jobId, 'RETURNED_TO_BASE', `Driver ${driverId || "MUKUND"} returned job to base. Moved to Open Bid Board. Reason: ${reason}`);
      
      const freshJob = db.prepare("SELECT * FROM bookings WHERE id = ?").get(jobId);
      if (freshJob) {
        io.emit("open_job_for_bidding", freshJob);
      }
      socket.emit("active_trip_cleared");
      broadcastAdminState();
      console.log(`📢 Job #${jobId} returned to base and placed on Bid Board`);
    } catch(err) {
      console.error('Error in driver_reject_active_job:', err.message);
    }
  });

    // ================= ADMIN EDIT & AMEND ENGINE =================
  socket.on("admin_amend_booking", (data) => {
    try {
      if (!data || !data.id) return;
      const rawId = String(data.id).trim();
      const numId = parseInt(rawId.replace(/[^0-9]/g, ""), 10);
      const fullId = rawId.startsWith("JOB-") ? rawId : ("JOB-" + numId);
      const viasStr = typeof data.vias === "string" ? data.vias : JSON.stringify(data.vias || []);

      db.prepare(`
        UPDATE bookings SET
          passenger = COALESCE(?, passenger),
          phone = COALESCE(?, phone),
          pickup = COALESCE(?, pickup),
          dropoff = COALESCE(?, dropoff),
          fare = COALESCE(?, fare),
          vehicleClass = COALESCE(?, vehicleClass),
          vias = COALESCE(?, vias),
          customerNotes = COALESCE(?, customerNotes)
        WHERE id = ? OR id = ?
      `).run(data.passenger, data.phone, data.pickup, data.dropoff, data.fare, data.vehicleClass, viasStr, data.customerNotes || data.reason, numId, fullId);

      if (typeof appendAudit === "function") appendAudit(fullId, "AMENDED", "Admin amended booking details.");
      broadcastAdminState();
      console.log(`✅ Booking ${fullId} amended successfully.`);
    } catch (err) {
      console.error("Error in admin_amend_booking:", err.message);
    }
  });

  socket.on("admin_update_driver", (data) => {
    try {
      if (!data || !data.driverId) return;
      db.prepare(`
        UPDATE drivers SET
          name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          vehicle = COALESCE(?, vehicle),
          vehicleClass = COALESCE(?, vehicleClass),
          customCommissionPct = COALESCE(?, customCommissionPct),
          badgeExpiry = COALESCE(?, badgeExpiry),
          motExpiry = COALESCE(?, motExpiry),
          insuranceExpiry = COALESCE(?, insuranceExpiry)
        WHERE driverId = ?
      `).run(data.name, data.phone, data.vehicle, data.vehicleClass, data.customCommissionPct, data.badgeExpiry, data.motExpiry, data.insuranceExpiry, data.driverId);

      broadcastAdminState();
      console.log(`✅ Driver ${data.driverId} updated successfully.`);
    } catch (err) {
      console.error("Error in admin_update_driver:", err.message);
    }
  });

  socket.on("admin_update_airport", (data) => {
    try {
      if (!data || !data.id) return;
      db.prepare(`
        UPDATE airport_matrix SET
          name = COALESCE(?, name),
          iataCode = COALESCE(?, iataCode),
          baseRate = COALESCE(?, baseRate)
        WHERE id = ?
      `).run(data.name, data.iataCode, data.baseRate, data.id);

      broadcastAdminState();
      console.log(`✅ Airport #${data.id} (${data.name}) updated successfully.`);
    } catch (err) {
      console.error("Error in admin_update_airport:", err.message);
    }
  });

  socket.on("admin_update_plot", (data) => {
    try {
      if (!data || !data.id) return;
      db.prepare(`
        UPDATE plots SET
          name = COALESCE(?, name),
          code = COALESCE(?, code),
          postcodeSector = COALESCE(?, postcodeSector),
          plotType = COALESCE(?, plotType),
          radiusMeters = COALESCE(?, radiusMeters),
          maxCapacity = COALESCE(?, maxCapacity)
        WHERE id = ?
      `).run(data.name, data.code, data.postcodeSector, data.plotType, data.radiusMeters, data.maxCapacity, data.id);

      broadcastAdminState();
      console.log(`✅ Plot #${data.id} updated successfully.`);
    } catch (err) {
      console.error("Error in admin_update_plot:", err.message);
    }
  });

  socket.on("admin_update_account", (data) => {
    try {
      if (!data || !data.accountNumber) return;
      db.prepare(`
        UPDATE corporate_accounts SET
          companyName = COALESCE(?, companyName),
          discountPct = COALESCE(?, discountPct),
          paymentTerms = COALESCE(?, paymentTerms),
          billingEmail = COALESCE(?, billingEmail),
          billingAddress = COALESCE(?, billingAddress)
        WHERE accountNumber = ?
      `).run(data.companyName, data.discountPct, data.paymentTerms, data.billingEmail, data.billingAddress, data.accountNumber);

      broadcastAdminState();
      console.log(`✅ Account #${data.accountNumber} updated successfully.`);
    } catch (err) {
      console.error("Error in admin_update_account:", err.message);
    }
  });

  // ================= ADMIN RECALL (ENHANCED WORKFLOW) =================
  socket.on("admin_recall_job", (data) => {
    try {
      const rawId = String(data.id || data.jobId || "").trim();
      if (!rawId) return;
      const strippedId = rawId.replace(/[^0-9]/g, "");
      const fullJobId = rawId.startsWith("JOB-") ? rawId : ("JOB-" + strippedId);

      db.prepare(`
        UPDATE bookings SET 
          status = 'UNASSIGNED', 
          assignedDriverId = NULL 
        WHERE id = ? OR id = ?
      `).run(rawId, fullJobId);

      // Notify and free the driver terminal
      Object.entries(connectedDrivers).forEach(([sockId, dr]) => {
        if (String(dr.activeJobId) === rawId || String(dr.activeJobId) === fullJobId) {
          dr.activeJobId = null;
          dr.status = "Available";
          io.to(sockId).emit("job_recalled_to_base", { jobId: fullJobId });
          console.log(`📢 Recalled job ${fullJobId} from driver ${dr.driverId}`);
        }
      });

      // Recalculate and update plots & stands immediately
      if (typeof updateDriverPlotPosition === "function") {
        Object.values(connectedDrivers).forEach(d => {
          if (d.lat && d.lng) updateDriverPlotPosition(d.driverId, d.lat, d.lng, d.status);
        });
      }

      appendAudit(rawId, "RECALLED_TO_BASE", "Admin recalled job back to unassigned dispatch.");
      broadcastAdminState();
    } catch(err) {
      console.error("Error in admin_recall_job:", err.message);
    }
  });

  
  // ================= DRIVER WALLET & EARNINGS ENGINE =================
  socket.on('get_driver_wallet', (data) => {
    try {
      const driverId = (data && data.driverId) ? String(data.driverId).trim().toUpperCase() : '';
      if (!driverId) return;

      // 1. Fetch driver details (name and commission)
      let commPct = 20.0;
      let driverName = driverId;
      try {
        const dRow = db.prepare('SELECT name, customCommissionPct FROM drivers WHERE UPPER(driverId) = ?').get(driverId);
        if (dRow) {
          if (dRow.name) driverName = dRow.name;
          if (dRow.customCommissionPct !== null && dRow.customCommissionPct !== undefined) {
            commPct = parseFloat(dRow.customCommissionPct) || 20.0;
          }
        }
      } catch (e) {}

      // 2. Fetch completed trips
      let allJobs = [];
      try {
        allJobs = db.prepare(`
          SELECT id, pickup, dropoff, fare, waitingCharge,
                 COALESCE(paymentMethod, 'Cash') AS paymentMethod,
                 paymentType, COALESCE(tip, 0.0) AS tip, COALESCE(tollFee, 0.0) AS tollFee,
                 createdAt, completedAt
          FROM bookings
          WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
          ORDER BY rowid DESC
        `).all(driverId);
      } catch (e) {
        console.error("Error fetching jobs in get_driver_wallet:", e.message);
        allJobs = [];
      }

      // 3. Date Range Filtering
      const period = (data && data.period) ? data.period : 'ALL';
      let startDate = (data && data.startDate) ? data.startDate : null;
      let endDate = (data && data.endDate) ? data.endDate : null;
      let periodLabel = 'All Time to Date';

      const now = new Date();

      if (period === 'THIS_WEEK') {
        const day = now.getDay(); // 0 is Sunday
        const diffToMon = (day === 0 ? -6 : 1) - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        startDate = monday.toISOString();
        endDate = sunday.toISOString();
        periodLabel = monday.toLocaleDateString('en-GB') + ' - ' + sunday.toLocaleDateString('en-GB');
      } else if (period === 'LAST_WEEK') {
        const day = now.getDay();
        const diffToMon = (day === 0 ? -6 : 1) - day - 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMon);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        startDate = monday.toISOString();
        endDate = sunday.toISOString();
        periodLabel = monday.toLocaleDateString('en-GB') + ' - ' + sunday.toLocaleDateString('en-GB');
      } else if (startDate && endDate) {
        periodLabel = new Date(startDate).toLocaleDateString('en-GB') + ' - ' + new Date(endDate).toLocaleDateString('en-GB');
      }

      let filteredJobs = allJobs;
      if (startDate && endDate) {
        const startTime = new Date(startDate).getTime();
        const endTime = new Date(endDate).getTime();
        filteredJobs = allJobs.filter(j => {
          if (!j.completedAt) return false;
          const tripTime = new Date(j.completedAt).getTime();
          return !isNaN(tripTime) && tripTime >= startTime && tripTime <= endTime;
        });
      }

      // 4. Compute totals (Separate Cash, Prepaid, Corporate Account, Tips & Tolls)
      let grossTotal = 0;
      let cashTotal = 0;
      let prepaidTotal = 0;
      let accountTotal = 0;
      let tipsTotal = 0;
      let tollsTotal = 0;

      filteredJobs.forEach(j => {
        const fareVal = parseFloat(j.fare || 0);
        const tipVal = parseFloat(j.tip || 0);
        const tollVal = parseFloat(j.tollFee || 0);

        grossTotal += fareVal;
        tipsTotal += tipVal;
        tollsTotal += tollVal;

        const method = String(j.paymentMethod || j.paymentType || 'Cash').toLowerCase();
        if (method.includes('account') || method.includes('corporate')) {
          accountTotal += fareVal;
        } else if (method.includes('card') || method.includes('prepaid') || method.includes('online')) {
          prepaidTotal += fareVal;
        } else {
          cashTotal += fareVal;
        }
      });

      const cardTotal = prepaidTotal + accountTotal;
      // Commission is charged ONLY on gross core fare (0% on tips and tolls)
      const commission = grossTotal * (commPct / 100);
      const netPay = grossTotal - commission + tipsTotal + tollsTotal;
      const settlement = netPay - cashTotal;
      const settlementType = settlement >= 0 ? 'OFFICE_OWES_DRIVER' : 'DRIVER_OWES_OFFICE';

      // 5. Emit complete payload with driverName, period, and formatted dates
      socket.emit('driver_wallet_data', {
        success: true,
        driverId: driverId,
        driverName: driverName,
        period: periodLabel,
        gross: grossTotal.toFixed(2),
        totalJobs: filteredJobs.length,
        cashTotal: cashTotal.toFixed(2),
        prepaidTotal: prepaidTotal.toFixed(2),
        accountTotal: accountTotal.toFixed(2),
        cardTotal: cardTotal.toFixed(2),
        tipsTotal: tipsTotal.toFixed(2),
        tollsTotal: tollsTotal.toFixed(2),
        commission: commission.toFixed(2),
        commPct: commPct,
        netPay: netPay.toFixed(2),
        settlement: Math.abs(settlement).toFixed(2),
        settlementRaw: settlement,
        settlementType: settlementType,
        jobs: filteredJobs.map(j => {
          let formattedDate = '-';
          if (j.completedAt && j.completedAt.includes('T')) {
            const d = new Date(j.completedAt);
            formattedDate = !isNaN(d) 
              ? d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              : j.completedAt;
          } else {
            formattedDate = j.completedAt || j.createdAt || '-';
          }
          return {
            id: j.id,
            pickup: j.pickup,
            dropoff: j.dropoff || 'Local Drop',
            fare: parseFloat(j.fare || 0).toFixed(2),
            paymentMethod: j.paymentMethod || 'Cash',
            tip: parseFloat(j.tip || 0).toFixed(2),
            tollFee: parseFloat(j.tollFee || 0).toFixed(2),
            completedAt: j.completedAt || '',
            dateTime: formattedDate
          };
        })
      });

      console.log(`💰 [WALLET] Driver ${driverName} (${driverId}) Period: ${periodLabel} -> Trips=${filteredJobs.length}, Gross=£${grossTotal.toFixed(2)}, Settlement=${settlementType} (£${Math.abs(settlement).toFixed(2)})`);
    } catch(err) {
      console.error('❌ Error processing get_driver_wallet:', err.message);
    }
  }); // <--- Cleanly closes io.on('connection')
});


// ================= PASSENGER WEB TRACKING & SMS ENGINE =================
app.get("/track/:jobId", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "track.html"));
});

app.get("/api/track/:jobId", (req, res) => {
  try {
    const rawId = req.params.jobId;
    const strippedId = rawId.replace(/[^0-9]/g, "");
    const fullId = rawId.startsWith("JOB-") ? rawId : ("JOB-" + strippedId);
    const job = db.prepare("SELECT * FROM bookings WHERE id = ? OR id = ?").get(rawId, fullId);
    if (!job) return res.status(404).json({ error: "Booking not found" });

    let driverInfo = null;
    let liveCoords = null;

    if (job.assignedDriverId && job.assignedDriverId !== "UNASSIGNED") {
      const dRec = db.prepare("SELECT driverId, name, phone, vehicle, vehicleClass FROM drivers WHERE UPPER(driverId) = ?").get(job.assignedDriverId.toUpperCase());
      if (dRec) {
        driverInfo = dRec;
      }
      // Check live memory for realtime GPS position
      const memDriver = Object.values(connectedDrivers).find(d => d.driverId && d.driverId.toUpperCase() === job.assignedDriverId.toUpperCase());
      if (memDriver) {
        liveCoords = { lat: memDriver.lat, lng: memDriver.lng };
      }
    }

    res.json({
      ...job,
      driver: driverInfo,
      driverLocation: liveCoords
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


function sendAcceptanceNotification(bookingId, driverId) {
  try {
    const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(bookingId);
    if (!b || !b.phone) return;
    const d = db.prepare("SELECT name, vehicle FROM drivers WHERE UPPER(driverId) = ?").get((driverId || "").toUpperCase());
    const driverName = (d && d.name) || driverId;
    const vehicleDesc = (d && d.vehicle) ? ` (${d.vehicle})` : "";
    const trackUrl = `http://localhost:3000/track/${bookingId}`;
    const msg = `Your MD Taxi is on its way! Driver: ${driverName}${vehicleDesc}. Track your car live: ${trackUrl}`;
    sendPassengerSMS(b.phone, msg);
  } catch(err) {
    console.error("Error sending acceptance SMS:", err.message);
  }
}

// ================= MULTI-PROVIDER SMS GATEWAY ENGINE =================
async function executeSmsDispatch(provider, cfg, toPhone, messageText) {
  if (provider === "twilio") {
    if (!cfg.twilioSid || !cfg.twilioToken) throw new Error("Twilio Account SID or Auth Token missing.");
    const twilio = require("twilio");
    const client = twilio(cfg.twilioSid, cfg.twilioToken);
    const res = await client.messages.create({
      body: messageText,
      from: cfg.twilioSender || "MD-TAXI",
      to: toPhone
    });
    return { success: true, provider: "twilio", messageId: res.sid };
  } 
  
  if (provider === "textlocal") {
    if (!cfg.textlocalApiKey) throw new Error("Textlocal API Key missing.");
    const params = new URLSearchParams({
      apiKey: cfg.textlocalApiKey,
      numbers: toPhone.replace("+", ""),
      message: messageText,
      sender: (cfg.textlocalSender || "MD TAXI").substring(0, 11)
    });
    const resp = await fetch("https://api.textlocal.in/send/?" + params.toString(), { method: "POST" });
    const data = await resp.json();
    if (data.status !== "success") {
      const errMsg = (data.errors && data.errors[0] && data.errors[0].message) || JSON.stringify(data);
      throw new Error("Textlocal error: " + errMsg);
    }
    return { success: true, provider: "textlocal", data };
  }

  if (provider === "android_gateway") {
    if (!cfg.androidWebhookUrl) throw new Error("Android Gateway Webhook URL missing.");
    const headers = { "Content-Type": "application/json" };
    if (cfg.androidApiToken) headers["Authorization"] = "Bearer " + cfg.androidApiToken;
    const resp = await fetch(cfg.androidWebhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ to: toPhone, message: messageText })
    });
    if (!resp.ok) throw new Error("Android Gateway HTTP " + resp.status + ": " + (await resp.text()));
    return { success: true, provider: "android_gateway" };
  }

  // Simulation mode
  console.log(`📲 [SMS SIMULATION] -> To: ${toPhone} | Message: "${messageText}"`);
  return { success: true, provider: "simulation" };
}

function normalizeUkPhone(phone) {
  if (!phone) return "";
  let p = String(phone).replace(/[^0-9+]/g, "").trim();
  if (p.startsWith("07") && p.length === 11) return "+44" + p.substring(1);
  if (p.startsWith("447") && p.length === 12) return "+" + p;
  return p;
}

async function sendPassengerSMS(phone, messageText) {
  if (!phone) return;
  const toPhone = normalizeUkPhone(phone);
  try {
    const cfg = db.prepare("SELECT * FROM sms_settings WHERE id = 1").get() || { activeProvider: "simulation" };
    console.log(`📲 [SMS DISPATCH - ${(cfg.activeProvider || "simulation").toUpperCase()}] -> To: ${toPhone}`);
    const res = await executeSmsDispatch(cfg.activeProvider, cfg, toPhone, messageText);
    console.log("✅ [SMS SUCCESS]", JSON.stringify(res));
  } catch (err) {
    console.error("❌ [SMS DISPATCH ERROR]:", err.message);
  }
}

// REST API Endpoints for Admin UI Settings
app.get("/api/sms/settings", (req, res) => {
  try {
    const cfg = db.prepare("SELECT * FROM sms_settings WHERE id = 1").get();
    res.json(cfg || {});
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/sms/settings", (req, res) => {
  try {
    const { activeProvider, twilioSid, twilioToken, twilioSender, textlocalApiKey, textlocalSender, androidWebhookUrl, androidApiToken } = req.body;
    db.prepare(`
      UPDATE sms_settings SET
        activeProvider = ?,
        twilioSid = ?,
        twilioToken = ?,
        twilioSender = ?,
        textlocalApiKey = ?,
        textlocalSender = ?,
        androidWebhookUrl = ?,
        androidApiToken = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = 1
    `).run(
      activeProvider || "simulation",
      twilioSid || "",
      twilioToken || "",
      twilioSender || "MD-TAXI",
      textlocalApiKey || "",
      textlocalSender || "MD TAXI",
      androidWebhookUrl || "",
      androidApiToken || ""
    );
    console.log("⚙️ [SMS SETTINGS] Updated settings. Active Provider:", activeProvider);
    res.json({ success: true, activeProvider });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/sms/test", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone number required" });
    const toPhone = normalizeUkPhone(phone);
    const cfg = db.prepare("SELECT * FROM sms_settings WHERE id = 1").get() || { activeProvider: "simulation" };
    const testMsg = "MD Taxi Test: Your SMS gateway is connected and active!";
    const result = await executeSmsDispatch(cfg.activeProvider, cfg, toPhone, testMsg);
    res.json({ success: true, result });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});


// ================= DRIVER SETTLEMENT & WEEKLY STATEMENT API =================
app.get('/api/admin/driver-statement', (req, res) => {
  try {
    const { driverId, startDate, endDate, periodLabel } = req.query;
    if (!driverId) {
      return res.status(400).json({ success: false, error: 'driverId is required' });
    }

    const dId = String(driverId).trim().toUpperCase();
    const driver = db.prepare('SELECT driverId, name, vehicle, phone, customCommissionPct FROM drivers WHERE UPPER(driverId) = ?').get(dId);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    const commPct = parseFloat(driver.customCommissionPct) || 20.0;

    // Fetch all completed bookings for driver
    const allJobs = db.prepare(`
      SELECT id, pickup, COALESCE(dropoff, destination) AS dropoff,
             fare, waitingCharge, COALESCE(paymentMethod, 'Cash') AS paymentMethod,
             paymentType, createdAt, completedAt
      FROM bookings
      WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
      ORDER BY rowid DESC
    `).all(dId);

    // Filter by completedAt date range if provided
    let filteredJobs = allJobs;
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1; // inclusive of end day
      filteredJobs = allJobs.filter(j => {
        if (!j.completedAt) return false;
        const tripTime = new Date(j.completedAt).getTime();
        return !isNaN(tripTime) && tripTime >= start && tripTime <= end;
      });
    }

    let grossTotal = 0;
    let cashTotal = 0;
    let cardTotal = 0;

    const itemized = filteredJobs.map(j => {
      const f = parseFloat(j.fare || 0);
      grossTotal += f;
      const method = String(j.paymentMethod || j.paymentType || 'Cash').toLowerCase();
      const isCard = method.includes('card') || method.includes('account') || method.includes('prepaid');
      if (isCard) {
        cardTotal += f;
      } else {
        cashTotal += f;
      }
      const tripComm = f * (commPct / 100);
      const tripNet = f - tripComm;

      let formattedDate = '';
      if (j.completedAt && j.completedAt.includes('T')) {
        const d = new Date(j.completedAt);
        formattedDate = d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      } else {
        formattedDate = j.completedAt || j.createdAt || 'N/A';
      }

      return {
        id: j.id,
        dateTime: formattedDate,
        pickup: j.pickup,
        dropoff: j.dropoff || 'Local Drop',
        paymentMethod: isCard ? 'Account / Card' : 'Cash',
        fare: f.toFixed(2),
        commission: tripComm.toFixed(2),
        net: tripNet.toFixed(2)
      };
    });

    const totalCommission = grossTotal * (commPct / 100);
    const driverNet = grossTotal - totalCommission;
    const settlement = driverNet - cashTotal;

    res.json({
      success: true,
      statementId: 'STMT-' + dId + '-' + Date.now().toString().slice(-6),
      generatedAt: new Date().toLocaleString('en-GB'),
      period: periodLabel || (startDate && endDate ? (startDate + ' to ' + endDate) : 'All Time to Date'),
      driverId: driver.driverId,
      driverName: driver.name || driver.driverId,
      vehicle: driver.vehicle || 'Standard Vehicle',
      phone: driver.phone || 'N/A',
      commPct: commPct,
      totalJobs: filteredJobs.length,
      gross: grossTotal.toFixed(2),
      cashTotal: cashTotal.toFixed(2),
      cardTotal: cardTotal.toFixed(2),
      commission: totalCommission.toFixed(2),
      netPay: driverNet.toFixed(2),
      settlement: Math.abs(settlement).toFixed(2),
      settlementType: settlement >= 0 ? 'OFFICE_OWES_DRIVER' : 'DRIVER_OWES_OFFICE',
      jobs: itemized
    });
  } catch (err) {
    console.error('❌ Error generating driver statement:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


app.get('/api/admin/driver-statement', (req, res) => {
  try {
    const { driverId, startDate, endDate } = req.query;
    if (!driverId) {
      return res.status(400).json({ success: false, error: 'driverId is required' });
    }

    const dId = String(driverId).trim().toUpperCase();
    const driver = db.prepare('SELECT driverId, name, vehicle, phone, customCommissionPct FROM drivers WHERE UPPER(driverId) = ?').get(dId);
    if (!driver) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }

    const commPct = parseFloat(driver.customCommissionPct) || 20.0;

    let query = `
      SELECT id, pickup, COALESCE(dropoff, destination) AS dropoff,
             fare, waitingCharge, COALESCE(paymentMethod, 'Cash') AS paymentMethod,
             paymentType, createdAt, completedAt
      FROM bookings
      WHERE UPPER(COALESCE(assignedDriverId, '')) = ? AND UPPER(status) = 'COMPLETED'
    `;
    const params = [dId];

    if (startDate && endDate) {
      query += ` AND createdAt >= ? AND createdAt <= ?`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY rowid DESC`;
    const jobs = db.prepare(query).all(...params);

    let grossTotal = 0;
    let cashTotal = 0;
    let cardTotal = 0;

    const itemized = jobs.map(j => {
      const f = parseFloat(j.fare || 0);
      grossTotal += f;
      const method = String(j.paymentMethod || j.paymentType || 'Cash').toLowerCase();
      const isCard = method.includes('card') || method.includes('account') || method.includes('prepaid');
      if (isCard) {
        cardTotal += f;
      } else {
        cashTotal += f;
      }
      const tripComm = f * (commPct / 100);
      const tripNet = f - tripComm;

      return {
        id: j.id,
        completedAt: j.completedAt || j.createdAt || '',
        pickup: j.pickup,
        dropoff: j.dropoff || 'Local Drop',
        paymentMethod: isCard ? 'Account / Card' : 'Cash',
        fare: f.toFixed(2),
        commission: tripComm.toFixed(2),
        net: tripNet.toFixed(2)
      };
    });

    const totalCommission = grossTotal * (commPct / 100);
    const driverNet = grossTotal - totalCommission;
    const settlement = driverNet - cashTotal; // Positive = Office pays driver, Negative = Driver owes office

    res.json({
      success: true,
      statementId: 'STM-' + dId + '-' + Date.now().toString().slice(-6),
      generatedAt: new Date().toLocaleString('en-GB'),
      driver: {
        id: driver.driverId,
        name: driver.name,
        vehicle: driver.vehicle,
        phone: driver.phone,
        commissionRatePct: commPct
      },
      summary: {
        totalJobs: jobs.length,
        grossTotal: grossTotal.toFixed(2),
        cashTotal: cashTotal.toFixed(2),
        cardTotal: cardTotal.toFixed(2),
        totalCommission: totalCommission.toFixed(2),
        driverNet: driverNet.toFixed(2),
        settlementBalance: Math.abs(settlement).toFixed(2),
        settlementType: settlement >= 0 ? 'OFFICE_OWES_DRIVER' : 'DRIVER_OWES_OFFICE'
      },
      jobs: itemized
    });
  } catch (err) {
    console.error('❌ Error generating driver statement:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

server.listen(3000, () => {
  console.log('🚀 MD Transport Server Online on http://localhost:3000');
});
