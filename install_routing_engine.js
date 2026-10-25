const fs = require('fs');

// ==========================================
// 1. ADD SERVER-SIDE PROXY ENDPOINTS TO index.js
// ==========================================
let serverCode = fs.readFileSync('index.js', 'utf8');

const proxyEndpoints = `
// ================= UK GEOCODING & ROUTING PROXY =================
app.get('/api/geocode', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.json({ error: 'Missing query' });

  // 1. If UK postcode, resolve via postcodes.io
  const pcMatch = query.match(/([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\\s?[0-9][A-Za-z]{2})/i);
  if (pcMatch) {
    try {
      const pc = pcMatch[0].replace(/\\s+/g, '');
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
    const osrmUrl = \`https://router.project-osrm.org/route/v1/driving/\${startLon},\${startLat};\${endLon},\${endLat}?overview=false\`;
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
app.get('/api/address-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });

  let results = [];
  const pcMatch = q.match(/([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\\s?[0-9][A-Za-z]{2})/i);
  
  if (pcMatch) {
    try {
      const pc = pcMatch[0].replace(/\\s+/g, '');
      const r = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(pc));
      const d = await r.json();
      if (d && d.status === 200 && d.result) {
        const item = d.result;
        const area = item.admin_ward || item.parish || 'Bath';
        results.push({
          primary: (item.parish ? item.parish + ', ' : '') + item.postcode,
          secondary: (item.admin_district || 'Bath') + ', Somerset',
          full: (item.parish ? item.parish + ', ' : '') + item.postcode
        });
      }
    } catch (e) {}
  }

  try {
    const photonUrl = 'https://photon.komoot.io/api/?q=' + encodeURIComponent(q + (q.toLowerCase().includes('bath') ? '' : ' Bath')) + '&limit=6&lang=en';
    const r = await fetch(photonUrl);
    const d = await r.json();
    if (d && Array.isArray(d.features)) {
      d.features.forEach(f => {
        const p = f.properties || {};
        const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ');
        const city = p.city || p.town || 'Bath';
        const pc = p.postcode || '';
        if (street && !street.toLowerCase().includes('unparished')) {
          const full = [street, city, pc].filter(Boolean).join(', ');
          if (!results.some(x => x.full === full)) {
            results.push({
              primary: street,
              secondary: [city, pc].filter(Boolean).join(', '),
              full: full
            });
          }
        }
      });
    }
  } catch (e) {}

  res.json({ results });
});
`;

if (!serverCode.includes('/api/route-distance')) {
  // Inject right after express.json()
  const insertMarker = 'app.use(express.json());';
  if (serverCode.includes(insertMarker)) {
    serverCode = serverCode.replace(insertMarker, insertMarker + '\n' + proxyEndpoints);
    fs.writeFileSync('index.js', serverCode);
    console.log('✅ Added /api/geocode, /api/route-distance, and /api/address-search to index.js');
  }
} else {
  console.log('ℹ️ Routing endpoints already present in index.js');
}

// ==========================================
// 2. UPDATE public/book.html TO USE LOCAL PROXY
// ==========================================
let bookHtml = fs.readFileSync('public/book.html', 'utf8');

// Replace triggerAutoRouting with server-backed routing
const autoRoutingCode = `
        let debounceTimer = null;
        function triggerAutoRouting() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                const pickup = document.getElementById('custPickup').value.trim();
                const dropoff = document.getElementById('custDropoff').value.trim();

                if (!pickup || !dropoff) {
                    calculateQuote();
                    return;
                }

                try {
                    // 1. Geocode Pickup
                    const pRes = await fetch('/api/geocode?q=' + encodeURIComponent(pickup));
                    const pData = await pRes.json();

                    // 2. Geocode Dropoff
                    const dRes = await fetch('/api/geocode?q=' + encodeURIComponent(dropoff));
                    const dData = await dRes.json();

                    if (pData.lat && dData.lat) {
                        // 3. Request route distance
                        const rRes = await fetch(\`/api/route-distance?startLon=\${pData.lon}&startLat=\${pData.lat}&endLon=\${dData.lon}&endLat=\${dData.lat}\`);
                        const rData = await rRes.json();
                        if (rData.success && rData.miles) {
                            calculatedMiles = rData.miles;
                            console.log('✅ Calculated distance:', calculatedMiles, 'miles');
                        }
                    }
                } catch (e) {
                    console.warn('Routing fetch error:', e);
                }

                calculateQuote();
            }, 300);
        }
`;

// Replace lines between 'function triggerAutoRouting' and 'function calculateQuote'
const trigIdx = bookHtml.indexOf('function triggerAutoRouting()');
const calcIdx = bookHtml.indexOf('function calculateQuote()');

if (trigIdx !== -1 && calcIdx !== -1) {
  bookHtml = bookHtml.substring(0, trigIdx) + autoRoutingCode.trim() + '\n\n        ' + bookHtml.substring(calcIdx);
  console.log('✅ Successfully connected triggerAutoRouting to local server proxy');
}

// Replace runAddressLookup inside book.html to use /api/address-search
const newLookupFunction = `
async function runAddressLookup(inputId, dropdownId) {
  triggerAutoRouting();
  clearTimeout(searchTimer);
  const input = document.getElementById(inputId);
  const box = document.getElementById(dropdownId);
  const val = (input.value || '').trim();

  if (val.length < 2) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/address-search?q=' + encodeURIComponent(val));
      const data = await res.json();
      const results = data.results || [];

      if (results.length === 0) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
      }

      box.innerHTML = results.map(r => \`
        <div class="addr-option" onclick="pickAddr('\${inputId}', '\${dropdownId}', '\${encodeURIComponent(r.full)}')">
          <span class="primary-text">\${r.primary}</span>
          <span class="sub-text">\${r.secondary}</span>
        </div>
      \`).join('');
      box.style.display = 'block';
    } catch(e) {
      box.style.display = 'none';
    }
  }, 200);
}
`;

if (bookHtml.includes('async function runAddressLookup')) {
  const startIdx = bookHtml.indexOf('async function runAddressLookup');
  const endIdx = bookHtml.indexOf('function pickAddr', startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    bookHtml = bookHtml.substring(0, startIdx) + newLookupFunction.trim() + '\n\n' + bookHtml.substring(endIdx);
    console.log('✅ Connected runAddressLookup to /api/address-search');
  }
}

fs.writeFileSync('public/book.html', bookHtml);
console.log('🎯 Routing and address lookups fully patched!');
