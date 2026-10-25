const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const identicalDistanceRoute = `
// ================= UNIFIED OSRM ROAD DISTANCE (POSTCODE-CENTRIC) =================
app.get('/api/calculate-distance', async (req, res) => {
  const from = (req.query.from || '').trim();
  const to = (req.query.to || '').trim();
  if (!from || !to) return res.json({ miles: 2.1 });

  try {
    const geocodePoint = async (addr) => {
      // 1. Always look for a UK postcode first inside the string
      const pcMatch = addr.match(/([A-Z]{1,2}[0-9][A-Z0-9]?\\s*[0-9][A-Z]{2})/i);
      if (pcMatch) {
        const cleanPc = pcMatch[1].replace(/\\s+/g, '').toUpperCase();
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
        const osmRes = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=1&q=\${encodeURIComponent(addr)}\`, {
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
        const osrmUrl = \`http://router.project-osrm.org/route/v1/driving/\${c1.lon},\${c1.lat};\${c2.lon},\${c2.lat}?overview=false\`;
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
`;

const distStart = code.indexOf("app.get('/api/calculate-distance'");
if (distStart !== -1) {
  const distEnd = code.indexOf("app.", distStart + 35);
  code = code.substring(0, distStart) + identicalDistanceRoute + '\n\n' + code.substring(distEnd);
} else {
  code = identicalDistanceRoute + '\n' + code;
}

fs.writeFileSync('index.js', code);
console.log('✅ Updated /api/calculate-distance to extract postcodes first (matching admin.html)!');
