const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// 1. Add Bath Hotspots Datalist before the form
const datalistHtml = `
<datalist id="bathHotspots">
    <option value="Bath Spa Railway Station, Dorchester St, BA1 1SU">
    <option value="Bath Bus Station, Dorchester St, BA1 1ER">
    <option value="The Roman Baths, Abbey Churchyard, BA1 1LZ">
    <option value="Royal Crescent, Bath, BA1 2LS">
    <option value="The Circus, Bath, BA1 2EW">
    <option value="Milsom Street, Bath, BA1 1DA">
    <option value="Pulteney Bridge, Argyle St, BA2 4BA">
    <option value="University of Bath, Claverton Down, BA2 7AY">
    <option value="Bath Spa University, Newton Park, BA2 9BN">
    <option value="Royal United Hospital (RUH), Combe Park, BA1 3NG">
    <option value="Kingsmead Square, Bath, BA1 2AB">
    <option value="Green Park Station, Bath, BA1 1JB">
    <option value="Lansdown Park and Ride, Bath, BA1 9BJ">
    <option value="Odd Down Park and Ride, Bath, BA2 2PF">
    <option value="Newbridge Park and Ride, Bath, BA1 3NB">
    <option value="Apex City of Bath Hotel, James St West, BA1 2DA">
    <option value="The Gainsborough Bath Spa, Beau St, BA1 1QY">
    <option value="Macdonald Bath Spa Hotel, Sydney Rd, BA2 6JF">
    <option value="Bristol Airport (BRS), Bristol, BS48 3DY">
    <option value="London Heathrow Airport (LHR), Hounslow, TW6 1AP">
</datalist>
`;

if (!html.includes('id="bathHotspots"')) {
  html = html.replace('<form id="onlineBookingForm"', datalistHtml + '\n            <form id="onlineBookingForm"');
}

// 2. Enhance Pickup with building/door number and datalist
const oldPickup = `<label>Pickup Address or Station:</label>
            <input type="text" id="custPickup" placeholder="e.g. Bath Spa Station" oninput="triggerAutoRouting()" required>`;

const newPickup = `<label>Pickup Postcode, Street or Landmark:</label>
            <input type="text" id="custPickup" list="bathHotspots" placeholder="e.g. BA1 1AA, Milsom St, or Bath Spa Station" oninput="triggerAutoRouting()" required>
            <input type="text" id="custPickupBuilding" placeholder="📍 Door / Flat No. or Building Name (e.g. Flat 3, No. 12)" style="margin-top: -6px; margin-bottom: 12px; font-size: 0.85rem; border-color: #334155;">`;

if (html.includes(oldPickup)) {
  html = html.replace(oldPickup, newPickup);
  console.log('✅ Injected Door/Building field and hotspot suggestions for Pickup!');
}

// 3. Enhance Dropoff with building/door number and datalist
const oldDropoff = `<label>Destination Address or Airport:</label>
            <input type="text" id="custDropoff" placeholder="e.g. Bristol Airport or Heathrow T5" oninput="triggerAutoRouting()" required>`;

const newDropoff = `<label>Destination Postcode, Street or Airport:</label>
            <input type="text" id="custDropoff" list="bathHotspots" placeholder="e.g. BA1 6BA, Bristol Airport or Heathrow" oninput="triggerAutoRouting()" required>
            <input type="text" id="custDropoffBuilding" placeholder="🏁 Dropoff Details (e.g. Terminal 2, Entrance B, Door 8)" style="margin-top: -6px; margin-bottom: 12px; font-size: 0.85rem; border-color: #334155;">`;

if (html.includes(oldDropoff)) {
  html = html.replace(oldDropoff, newDropoff);
  console.log('✅ Injected Door/Building field and hotspot suggestions for Dropoff!');
}

// 4. Update the submission payload to merge building/door with address
const oldSubmitPickup = `pickup: document.getElementById('custPickup').value.trim(),`;
const newSubmitPickup = `pickup: (() => {
                    const pMain = document.getElementById('custPickup').value.trim();
                    const pBldg = (document.getElementById('custPickupBuilding') ? document.getElementById('custPickupBuilding').value.trim() : '');
                    return pBldg ? (pBldg + ', ' + pMain) : pMain;
                })(),`;

const oldSubmitDropoff = `dropoff: document.getElementById('custDropoff').value.trim(),`;
const newSubmitDropoff = `dropoff: (() => {
                    const dMain = document.getElementById('custDropoff').value.trim();
                    const dBldg = (document.getElementById('custDropoffBuilding') ? document.getElementById('custDropoffBuilding').value.trim() : '');
                    return dBldg ? (dBldg + ', ' + dMain) : dMain;
                })(),`;

if (html.includes(oldSubmitPickup)) {
  html = html.replace(oldSubmitPickup, newSubmitPickup);
}
if (html.includes(oldSubmitDropoff)) {
  html = html.replace(oldSubmitDropoff, newSubmitDropoff);
}

fs.writeFileSync('public/book.html', html);
console.log('🎯 public/book.html safely updated with door/building inputs!');
