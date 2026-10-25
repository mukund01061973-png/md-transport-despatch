const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Add /api/tariff route if missing
const tariffRoute = `
// ================= MASTER TARIFF ENDPOINT =================
app.get('/api/tariff', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM tariffs LIMIT 1').get();
    res.json({ success: true, tariff: row || {} });
  } catch(err) {
    res.json({ success: false, error: err.message });
  }
});
`;

if (!code.includes("app.get('/api/tariff'")) {
  code = tariffRoute + '\n' + code;
  console.log('✅ Added /api/tariff endpoint to index.js');
}

// 2. Ensure address search returns clean street + postcode results instantly
const addressSearchRoute = `
// ================= ADDRESS SEARCH & POSTCODE AUTOCOMPLETE =================
app.get('/api/address-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });

  let results = [];
  const cleanQ = q.toUpperCase().replace(/\\s+/g, '');
  const isPostcode = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(cleanQ) || /^[A-Z]{1,2}[0-9]{1,2}$/.test(cleanQ);

  if (isPostcode) {
    try {
      const pcRes = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(cleanQ));
      const pcData = await pcRes.json();
      if (pcData && pcData.result) {
        const r = pcData.result;
        const streetName = r.parish || r.admin_ward || r.admin_district || 'High Street';
        const area = r.admin_district || 'Bath';
        results.push({
          primary: \`\${streetName}, \${area}\`,
          secondary: \`\${r.postcode}\`,
          full: \`\${streetName}, \${area}, \${r.postcode}\`,
          lat: r.latitude,
          lon: r.longitude
        });
      }
    } catch(e) {}
  }

  // Also query OpenStreetMap for street/place names
  try {
    const osmRes = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=6&addressdetails=1&q=\${encodeURIComponent(q)}\`, {
      headers: { 'User-Agent': 'MDTaxiDespatch/2.0 (dispatch@mdtaxi.co.uk)' }
    });
    const osmData = await osmRes.json();
    if (Array.isArray(osmData)) {
      osmData.forEach(item => {
        const a = item.address || {};
        const street = a.road || a.pedestrian || a.suburb || item.name || '';
        const town = a.city || a.town || a.village || a.county || '';
        const pc = a.postcode || '';
        const primary = street || item.display_name.split(',')[0];
        const secondary = [town, pc].filter(Boolean).join(', ');
        const full = [primary, town, pc].filter(Boolean).join(', ');

        if (!results.some(r => r.full === full)) {
          results.push({ primary, secondary: secondary || 'United Kingdom', full, lat: item.lat, lon: item.lon });
        }
      });
    }
  } catch(e) {}

  res.json({ results });
});
`;

// Replace /api/address-search with robust handler
const searchIdx = code.indexOf("app.get('/api/address-search'");
if (searchIdx !== -1) {
  const nextAppIdx = code.indexOf("app.", searchIdx + 30);
  code = code.substring(0, searchIdx) + addressSearchRoute + '\n\n' + code.substring(nextAppIdx);
} else {
  code = addressSearchRoute + '\n' + code;
}

// 3. Emit update_tariff on initial socket connection
if (!code.includes("socket.emit('update_tariff'")) {
  code = code.replace("io.on('connection', (socket) => {", `io.on('connection', (socket) => {
    try {
      const tariffRow = db.prepare('SELECT * FROM tariffs LIMIT 1').get();
      socket.emit('update_tariff', tariffRow);
    } catch(e) {}`);
  console.log('✅ Added socket.emit("update_tariff") to io connection');
}

fs.writeFileSync('index.js', code);
console.log('✅ index.js successfully updated with tariff and address routes!');
