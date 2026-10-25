const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const updatedSearchRoute = `app.get('/api/address-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });

  let results = [];
  const pcMatch = q.match(/([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\s?[0-9][A-Za-z]{2})/i);

  // If a UK postcode is detected, query postcodes.io and reverse geocode street level
  if (pcMatch) {
    try {
      const pc = pcMatch[0].replace(/\\s+/g, '').toUpperCase();
      const pcRes = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(pc));
      const pcData = await pcRes.json();
      
      if (pcData && pcData.status === 200 && pcData.result) {
        const { latitude, longitude, postcode, admin_district, parish } = pcData.result;
        
        // Query Nominatim reverse geocoder for street/thoroughfare line
        const revUrl = \`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${latitude}&lon=\${longitude}&addressdetails=1\`;
        const revRes = await fetch(revUrl, {
          headers: { 'User-Agent': 'MDTaxiDespatch/1.0 (admin@mdtaxi.co.uk)' }
        });
        const revData = await revRes.json();
        
        const addr = (revData && revData.address) ? revData.address : {};
        const street = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || parish || '';
        const town = addr.city || addr.town || addr.village || admin_district || 'Bath';
        
        const primaryLine = street ? \`\${street}, \${town}\` : town;
        const fullAddr = street ? \`\${street}, \${town}, \${postcode}\` : \`\${town}, \${postcode}\`;
        
        results.push({
          primary: primaryLine,
          secondary: \`\${postcode} (\${admin_district || ''})\`,
          full: fullAddr,
          lat: latitude,
          lon: longitude
        });
      }
    } catch(err) {
      console.error('Postcode search error:', err.message);
    }
  }

  // Also query Nominatim for direct street / point of interest search
  try {
    const geoUrl = \`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=6&addressdetails=1&q=\${encodeURIComponent(q)}\`;
    const geoRes = await fetch(geoUrl, {
      headers: { 'User-Agent': 'MDTaxiDespatch/1.0 (admin@mdtaxi.co.uk)' }
    });
    const geoData = await geoRes.json();
    
    if (Array.isArray(geoData)) {
      geoData.forEach(item => {
        const a = item.address || {};
        const street = a.road || a.pedestrian || a.suburb || item.name || '';
        const town = a.city || a.town || a.village || a.county || '';
        const pc = a.postcode || '';
        
        let primary = street;
        if (!primary) primary = item.display_name.split(',')[0];
        
        let secondaryParts = [];
        if (town && town !== primary) secondaryParts.push(town);
        if (pc) secondaryParts.push(pc);
        const secondary = secondaryParts.join(', ');
        
        const full = [primary, secondary].filter(Boolean).join(', ');
        
        if (!results.some(r => r.full === full)) {
          results.push({
            primary: primary,
            secondary: secondary || 'United Kingdom',
            full: full,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
          });
        }
      });
    }
  } catch(e) {}

  res.json({ results });
});`;

// Replace existing /api/address-search route
const sIdx = code.indexOf("app.get('/api/address-search'");
if (sIdx !== -1) {
  // Find where the next route starts or closing brace
  const nextRouteIdx = code.indexOf("app.", sIdx + 20);
  if (nextRouteIdx !== -1) {
    code = code.substring(0, sIdx) + updatedSearchRoute + '\n\n' + code.substring(nextRouteIdx);
  } else {
    // fallback replace
    code = code.replace(/app\.get\('\/api\/address-search'[\s\S]*?\}\);\n/s, updatedSearchRoute + '\n');
  }
  fs.writeFileSync('index.js', code);
  console.log('✅ Updated index.js /api/address-search with street-level parsing!');
} else {
  console.error('Route app.get("/api/address-search") not found.');
}
