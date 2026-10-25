const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Ensure updateTripStatus resolves trip ID dynamically from window.activeJob first
const targetSearch = `const tripId = current.id || current.bookingId;`;
const replacement = `const activeObj = window.activeJob || activeTrip || window.activeTrip;
            const tripId = (activeObj && (activeObj.id || activeObj.bookingId)) ? (activeObj.id || activeObj.bookingId) : (current.id || current.bookingId);`;

if (html.includes(targetSearch) && !html.includes('const activeObj = window.activeJob || activeTrip')) {
  html = html.replace(targetSearch, replacement);
  console.log("✅ Fixed dynamic tripId resolution in updateTripStatus!");
}

// When renderActiveTrip runs, guarantee all references are locked onto the new job
const renderActiveTarget = `window.activeJob = job;`;
const renderActiveReplacement = `window.activeJob = job;
        window.activeTrip = job;
        activeTrip = job;
        window.currentTrip = job;`;

if (html.includes(renderActiveTarget) && !html.includes('window.currentTrip = job;')) {
  html = html.replace(renderActiveTarget, renderActiveReplacement);
  console.log("✅ Synchronized all global job pointers in renderActiveTrip!");
}

fs.writeFileSync('public/driver.html', html);
console.log("🚀 driver.html patched successfully!");
