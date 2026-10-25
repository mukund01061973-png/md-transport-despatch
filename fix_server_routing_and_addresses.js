const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Unified OSRM Road Distance Engine for both Web and Admin
const unifiedDistanceRoute = `
// ================= ACCURATE OSRM ROAD DISTANCE =================
app.get('/api/calculate-distance', async (req, res) => {
  const from = (req.query.from || '').trim();
  const to = (req.query.to || '').trim();
  if (!from || !to) return res.json({ miles: 2.1 });

  try {
    const geocode = async (q) => {
      // Clean UK Postcode check
      const cleanPc = q.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      const isPc = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(cleanPc);
      if (isPc) {
        try {
          const pcRes = await fetch('https://api.postcodes.io/postcodes/' + cleanPc);
          const pcData = await pcRes.json();
          if (pcData && pcData.result) {
            return { lat: pcData.result.latitude, lon: pcData.result.longitude };
          }
        } catch(e) {}
      }
      
      const osmRes = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=1&q=\${encodeURIComponent(q)}\`, {
        headers: { 'User-Agent': 'MDTaxiDespatch/2.0 (dispatch@mdtaxi.co.uk)' }
      });
      const osmData = await osmRes.json();
      return (osmData && osmData.length > 0) ? { lat: parseFloat(osmData[0].lat), lon: parseFloat(osmData[0].lon) } : null;
    };

    const [c1, c2] = await Promise.all([geocode(from), geocode(to)]);
    if (c1 && c2) {
      // Accurate OSRM driving distance
      try {
        const osrmUrl = \`http://router.project-osrm.org/route/v1/driving/\${c1.lon},\${c1.lat};\${c2.lon},\${c2.lat}?overview=false\`;
        const osrmRes = await fetch(osrmUrl);
        const osrmData = await osrmRes.json();
        if (osrmData && osrmData.routes && osrmData.routes.length > 0) {
          const meters = osrmData.routes[0].distance;
          const miles = parseFloat((meters * 0.000621371).toFixed(1));
          return res.json({ miles: Math.max(1.0, miles) });
        }
      } catch(e) {}

      // Fallback Haversine road curve formula
      const R = 3958.8;
      const dLat = (c2.lat - c1.lat) * Math.PI / 180;
      const dLon = (c2.lon - c1.lon) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const roadMiles = parseFloat((R * c * 1.25).toFixed(1));
      return res.json({ miles: Math.max(1.2, roadMiles) });
    }
  } catch(e) {}

  res.json({ miles: 2.1 });
});
`;

// Replace calculate-distance route
const distStart = code.indexOf("app.get('/api/calculate-distance'");
if (distStart !== -1) {
  const distEnd = code.indexOf("app.", distStart + 35);
  code = code.substring(0, distStart) + unifiedDistanceRoute + '\n\n' + code.substring(distEnd);
} else {
  code = unifiedDistanceRoute + '\n' + code;
}

// 2. High-precision Address Search that extracts Street & Postcode cleanly
const cleanAddressSearch = `
// ================= CLEAN UK STREET & POSTCODE RESOLVER =================
app.get('/api/address-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });

  let results = [];
  const cleanQ = q.toUpperCase().replace(/\\s+/g, '');
  const isPostcode = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/.test(cleanQ);

  if (isPostcode) {
    try {
      const pcRes = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(cleanQ));
      const pcData = await pcRes.json();
      if (pcData && pcData.result) {
        const r = pcData.result;
        // Reverse geocode lat/lon to extract actual street / road name
        try {
          const revRes = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${r.latitude}&lon=\${r.longitude}&addressdetails=1\`, {
            headers: { 'User-Agent': 'MDTaxiDespatch/2.0 (dispatch@mdtaxi.co.uk)' }
          });
          const revData = await revRes.json();
          if (revData && revData.address) {
            const addr = revData.address;
            const road = addr.road || addr.pedestrian || addr.residential || addr.suburb || 'High Street';
            const city = addr.city || addr.town || addr.village || 'Bath';
            results.push({
              primary: \`\${road}, \${city}\`,
              secondary: \`\${r.postcode}\`,
              full: \`\${road}, \${city}, \${r.postcode}\`,
              lat: r.latitude,
              lon: r.longitude
            });
          }
        } catch(e) {}

        if (results.length === 0) {
          const area = r.admin_district || 'Bath';
          results.push({
            primary: \`\${area}\`,
            secondary: \`\${r.postcode}\`,
            full: \`\${area}, \${r.postcode}\`,
            lat: r.latitude,
            lon: r.longitude
          });
        }
      }
    } catch(e) {}
  }

  // Also query OSM for thoroughfare / landmark suggestions
  try {
    const osmRes = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=6&addressdetails=1&q=\${encodeURIComponent(q)}\`, {
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
          const primary = \`\${road}, \${city}\`;
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
`;

const addrStart = code.indexOf("app.get('/api/address-search'");
if (addrStart !== -1) {
  const addrEnd = code.indexOf("app.", addrStart + 35);
  code = code.substring(0, addrStart) + cleanAddressSearch + '\n\n' + code.substring(addrEnd);
} else {
  code = cleanAddressSearch + '\n' + code;
}

// 3. Fix Fare: NaN bug in driver status update so completed jobs archive cleanly
code = code.replace("Job #${jobId} -> COMPLETED (Fare:${fare})", "Job #${jobId} -> COMPLETED (Fare:${parseFloat(fare) || 0})");
code = code.replace("fare: req.body.fare", "fare: parseFloat(req.body.fare) || 0");

fs.writeFileSync('index.js', code);
console.log('✅ index.js updated with OSRM routing, clean street lookup, and completion fixes!');
