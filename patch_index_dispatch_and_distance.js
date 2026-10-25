const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Add distance calculation endpoint
const distanceEndpoint = `
// ================= RAPID DISTANCE CALCULATOR =================
app.get('/api/calculate-distance', async (req, res) => {
  const from = (req.query.from || '').trim();
  const to = (req.query.to || '').trim();
  if (!from || !to) return res.json({ miles: 3.5 });

  try {
    const geocode = async (q) => {
      const r = await fetch(\`https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=1&q=\${encodeURIComponent(q)}\`, {
        headers: { 'User-Agent': 'MDTaxiDespatch/1.0 (admin@mdtaxi.co.uk)' }
      });
      const d = await r.json();
      return (d && d.length > 0) ? { lat: parseFloat(d[0].lat), lon: parseFloat(d[0].lon) } : null;
    };

    const [c1, c2] = await Promise.all([geocode(from), geocode(to)]);
    if (c1 && c2) {
      // Haversine distance with road curve factor (1.3x)
      const R = 3958.8; // Radius in miles
      const dLat = (c2.lat - c1.lat) * Math.PI / 180;
      const dLon = (c2.lon - c1.lon) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const directMiles = R * c;
      const roadMiles = parseFloat((directMiles * 1.35).toFixed(1));
      return res.json({ miles: Math.max(1.5, roadMiles) });
    }
  } catch(e) {}
  
  res.json({ miles: 4.0 });
});
`;

if (!code.includes('/api/calculate-distance')) {
  const marker = "app.get('/api/address-search'";
  code = code.replace(marker, distanceEndpoint + '\n\n' + marker);
}

// 2. Ensure auto-dispatch properly finds driver MUKUND when jobs arrive
// Look for auto-dispatch logic inside socket.on('create_job')
const autoDispatchCheck = `
      // Auto-dispatch notification to eligible drivers
      const eligibleDrivers = db.prepare(\`
        SELECT * FROM drivers 
        WHERE status = 'Available'
      \`).all();
      
      console.log(\`📡 Auto-dispatching job \${jobRecord.id} (\${jobRecord.passengers} pax, \${jobRecord.vehicleClass}) to \${eligibleDrivers.length} online drivers\`);
      io.emit('job_created', jobRecord);
      io.emit('jobs_updated');
`;

if (!code.includes('Auto-dispatching job')) {
  // Insert before socket callback completion in create_job
  code = code.replace("io.emit('jobs_updated');", autoDispatchCheck);
}

fs.writeFileSync('index.js', code);
console.log('✅ Distance API and driver auto-broadcast updated in index.js!');
