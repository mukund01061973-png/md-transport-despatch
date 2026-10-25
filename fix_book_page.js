const fs = require('fs');

// --- 1. FIX index.js (Ensure job_created_ack is emitted back to the client socket) ---
let serverCode = fs.readFileSync('index.js', 'utf8');

if (!serverCode.includes("socket.emit('job_created_ack'")) {
  const target = "broadcastAdminState();";
  // Insert socket.emit right after the first broadcastAdminState() inside create_job
  const createJobIdx = serverCode.indexOf("socket.on('create_job'");
  if (createJobIdx !== -1) {
    const broadcastIdx = serverCode.indexOf(target, createJobIdx);
    if (broadcastIdx !== -1) {
      serverCode = serverCode.substring(0, broadcastIdx + target.length) +
        `\n        socket.emit('job_created_ack', { success: true, id: newJobId, jobId: newJobId, message: 'Booking confirmed!' });` +
        serverCode.substring(broadcastIdx + target.length);
      fs.writeFileSync('index.js', serverCode);
      console.log('✅ index.js: Added socket.emit(job_created_ack) directly inside create_job!');
    }
  }
} else {
  console.log('ℹ️ index.js already has job_created_ack.');
}

// --- 2. FIX public/book.html (Address Autocomplete & Form Reset) ---
let bookHtml = fs.readFileSync('public/book.html', 'utf8');

// Ensure stylesheet for dropdown exists
const styleTag = `
<style id="addressFixStyle">
.addr-container { position: relative; width: 100%; margin-bottom: 8px; }
.addr-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #0f172a;
  border: 1px solid #38bdf8;
  border-radius: 6px;
  max-height: 220px;
  overflow-y: auto;
  z-index: 99999;
  display: none;
  box-shadow: 0 8px 24px rgba(0,0,0,0.8);
}
.addr-option {
  padding: 10px 12px;
  border-bottom: 1px solid #1e293b;
  cursor: pointer;
  color: #f1f5f9;
  text-align: left;
  font-size: 0.85rem;
}
.addr-option:hover {
  background: #0284c7;
  color: #ffffff;
}
.addr-option .primary-text { font-weight: bold; display: block; }
.addr-option .sub-text { font-size: 0.75rem; color: #94a3b8; }
.addr-option:hover .sub-text { color: #e2e8f0; }
</style>
`;

if (!bookHtml.includes('id="addressFixStyle"')) {
  bookHtml = bookHtml.replace('</head>', styleTag + '\n</head>');
}

// Wrap custPickup if not already wrapped
if (!bookHtml.includes('id="pickupDropdown"')) {
  bookHtml = bookHtml.replace(
    /<input[^>]*id=["']custPickup["'][^>]*>/i,
    `<div class="addr-container">
      <input type="text" id="custPickup" placeholder="e.g. BA1 1AA or 10 High Street" oninput="runAddressLookup('custPickup', 'pickupDropdown')" autocomplete="off" required>
      <div id="pickupDropdown" class="addr-dropdown"></div>
    </div>`
  );
  console.log('✅ Wrapped custPickup with autocomplete dropdown');
}

// Wrap custDropoff if not already wrapped
if (!bookHtml.includes('id="dropoffDropdown"')) {
  bookHtml = bookHtml.replace(
    /<input[^>]*id=["']custDropoff["'][^>]*>/i,
    `<div class="addr-container">
      <input type="text" id="custDropoff" placeholder="e.g. Bristol Airport or BA1 6BA" oninput="runAddressLookup('custDropoff', 'dropoffDropdown')" autocomplete="off" required>
      <div id="dropoffDropdown" class="addr-dropdown"></div>
    </div>`
  );
  console.log('✅ Wrapped custDropoff with autocomplete dropdown');
}

// Add the client lookup script and acknowledge handler
const lookupAndAckScript = `
<script id="addressLookupEngine">
let searchTimer = null;

async function runAddressLookup(inputId, dropdownId) {
  if (typeof triggerAutoRouting === 'function') triggerAutoRouting();
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
    let results = [];

    // 1. Check for UK Postcode
    const pcMatch = val.match(/([Gg][Ii][Rr] 0[Aa]{2})|((([A-Za-z][0-9]{1,2})|(([A-Za-z][A-Ha-hJ-Yj-y][0-9]{1,2})|(([A-Za-z][0-9][A-Za-z])|([A-Za-z][A-Ha-hJ-Yj-y][0-9][A-Za-z]?))))\\s?[0-9][A-Za-z]{2})/i);
    if (pcMatch) {
      try {
        const pcClean = pcMatch[0].replace(/\\s+/g, '');
        const r = await fetch('https://api.postcodes.io/postcodes/' + encodeURIComponent(pcClean));
        const data = await r.json();
        if (data && data.status === 200 && data.result) {
          const res = data.result;
          const loc = res.parish || res.admin_ward || res.admin_district || 'Bath';
          results.push({
            primary: loc + ', ' + res.postcode,
            secondary: (res.admin_district || '') + ' (' + (res.region || 'South West') + ')',
            full: loc + ', ' + res.postcode
          });
        }
      } catch (e) {}
    }

    // 2. OpenStreetMap Photon Geocoder for UK Street Names & Houses
    try {
      const geo = await fetch('https://photon.komoot.io/api/?q=' + encodeURIComponent(val) + '&limit=5&bbox=-2.45,51.35,-2.30,51.42');
      const gData = await geo.json();
      if (gData && Array.isArray(gData.features)) {
        gData.features.forEach(f => {
          const p = f.properties || {};
          const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ');
          const city = p.city || p.town || 'Bath';
          const postcode = p.postcode || '';
          if (street) {
            const formatted = [street, city, postcode].filter(Boolean).join(', ');
            if (!results.some(r => r.full === formatted)) {
              results.push({
                primary: street,
                secondary: [city, postcode].filter(Boolean).join(', '),
                full: formatted
              });
            }
          }
        });
      }
    } catch (e) {}

    // Fallback if photon returns empty: general nominatim
    if (results.length === 0) {
      try {
        const nom = await fetch('https://nominatim.openstreetmap.org/search?format=json&countrycodes=gb&limit=4&q=' + encodeURIComponent(val));
        const nomData = await nom.json();
        if (Array.isArray(nomData)) {
          nomData.forEach(n => {
            results.push({
              primary: n.display_name.split(',')[0],
              secondary: n.display_name.split(',').slice(1, 3).join(','),
              full: n.display_name
            });
          });
        }
      } catch (e) {}
    }

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
  }, 220);
}

function pickAddr(inputId, dropdownId, encodedFull) {
  document.getElementById(inputId).value = decodeURIComponent(encodedFull);
  const box = document.getElementById(dropdownId);
  box.style.display = 'none';
  box.innerHTML = '';
  if (typeof triggerAutoRouting === 'function') triggerAutoRouting();
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  if (!e.target.closest('.addr-container')) {
    document.querySelectorAll('.addr-dropdown').forEach(b => b.style.display = 'none');
  }
});

// Intercept job_created_ack to update button and show confirmation
if (typeof socket !== 'undefined') {
  socket.on('job_created_ack', (res) => {
    const btn = document.querySelector('button[type="submit"]') || document.getElementById('btnSubmitBooking');
    if (btn) {
      btn.style.background = '#10b981';
      btn.textContent = '✅ Booking Confirmed (# ' + (res.jobId || res.id) + ')';
      btn.disabled = false;
    }
    alert('✅ Booking Confirmed! Job #' + (res.jobId || res.id) + '\\nCheck your phone for SMS confirmation and tracking.');
  });
}
</script>
`;

if (!bookHtml.includes('id="addressLookupEngine"')) {
  bookHtml = bookHtml.replace('</body>', lookupAndAckScript + '\n</body>');
  console.log('✅ Added address lookup and acknowledgment engine to public/book.html');
}

fs.writeFileSync('public/book.html', bookHtml);
console.log('🎯 public/book.html and index.js successfully repaired!');
