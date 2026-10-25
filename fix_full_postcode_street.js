const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const updatedAddressSearch = `
// ================= UK STREET & FULL POSTCODE RESOLVER =================
app.get('/api/address-search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json({ results: [] });

  let results = [];
  const pcMatch = q.match(/([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\\s?[0-9][A-Za-z]{2})/i);

  // If a full UK postcode is entered, resolve street thoroughfare via reverse geocoding
  if (pcMatch) {
    try {
      const pc = pcMatch[0].replace(/\\s+/g, '').toUpperCase();
      const pcRes = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(pc));
      const pcData = await pcRes.json();
      
      if (pcData && pcData.status === 200 && pcData.result) {
        const { latitude, longitude, postcode, admin_district, parish, admin_ward } = pcData.result;
        
        // Reverse geocode coordinates to obtain street/road name
        const revUrl = \`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${latitude}&lon=\${longitude}&addressdetails=1\`;
        const revRes = await fetch(revUrl, {
          headers: { 'User-Agent': 'MDTaxiDespatch/1.0 (admin@mdtaxi.co.uk)' }
        });
        const revData = await revRes.json();
        const addr = (revData && revData.address) ? revData.address : {};

        const street = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood || parish || admin_ward || 'Central';
        const town = addr.city || addr.town || addr.village || admin_district || 'Bath';

        // Add specific street line
        results.push({
          primary: street + ', ' + postcode,
          secondary: town + ', ' + (admin_district || 'Somerset'),
          full: street + ', ' + town + ', ' + postcode
        });
      }
    } catch (e) {
      console.warn('Postcode reverse geocode failed:', e.message);
    }
  }

  // General street name / building search
  try {
    const qStr = q.toLowerCase().includes('bath') ? q : (q + ' Bath');
    const nomUrl = 'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=gb&limit=6&q=' + encodeURIComponent(qStr);
    const nomRes = await fetch(nomUrl, {
      headers: { 'User-Agent': 'MDTaxiDespatch/1.0 (admin@mdtaxi.co.uk)' }
    });
    const nomData = await nomRes.json();
    if (Array.isArray(nomData)) {
      nomData.forEach(item => {
        const a = item.address || {};
        const road = a.road || a.pedestrian || a.suburb || '';
        const house = a.house_number ? a.house_number + ' ' : '';
        const town = a.city || a.town || a.village || 'Bath';
        const pc = a.postcode || '';
        let line1 = (house + road).trim();
        if (!line1 && item.name && !item.name.toLowerCase().includes('unparished')) {
          line1 = item.name;
        }

        if (line1 && !line1.toLowerCase().includes('unparished')) {
          const full = [line1, town, pc].filter(Boolean).join(', ');
          if (!results.some(r => r.full === full)) {
            results.push({
              primary: line1 + (pc ? ', ' + pc : ''),
              secondary: town + (pc ? ' • ' + pc : ''),
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

// Replace /api/address-search in index.js
if (code.includes("app.get('/api/address-search'")) {
  const startIdx = code.indexOf("app.get('/api/address-search'");
  const nextAppIdx = code.indexOf("app.", startIdx + 20);
  if (startIdx !== -1 && nextAppIdx !== -1) {
    code = code.substring(0, startIdx) + updatedAddressSearch.trim() + '\n\n' + code.substring(nextAppIdx);
    fs.writeFileSync('index.js', code);
    console.log('✅ Replaced /api/address-search in index.js with reverse street lookup!');
  }
} else {
  // Inject right before app.listen or socket.io
  const insertMarker = 'app.use(express.json());';
  code = code.replace(insertMarker, insertMarker + '\n' + updatedAddressSearch);
  fs.writeFileSync('index.js', code);
  console.log('✅ Added /api/address-search to index.js!');
}
