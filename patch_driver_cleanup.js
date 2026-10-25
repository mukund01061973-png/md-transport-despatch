const fs = require('fs');
let code = fs.readFileSync('public/driver.html', 'utf8');

// Target the fare parsing logic inside transitionTrip
const oldFareCalc = `const liveTotalText = document.getElementById('tripFare') ? document.getElementById('tripFare').textContent : '';
            const base = parseFloat(window.activeBaseFare || (trip ? trip.fare : 0) || 0);
            const extra = parseFloat(window.extraChargesTotal || 0);
            const totalFare = Number(liveTotalText) || (base + extra);`;

const safeFareCalc = `const liveTotalText = document.getElementById('tripFare') ? document.getElementById('tripFare').textContent : '';
            // Sanitize: strip non-numeric characters (like £, $, spaces)
            const cleanLiveFare = parseFloat(String(liveTotalText).replace(/[^0-9.]/g, ''));
            const base = parseFloat(window.activeBaseFare || (trip ? trip.fare : 0) || 0);
            const extra = parseFloat(window.extraChargesTotal || 0);
            const totalFare = (!isNaN(cleanLiveFare) && cleanLiveFare > 0) ? cleanLiveFare : ((base + extra) > 0 ? (base + extra) : 0.00);`;

if (code.includes(oldFareCalc)) {
  code = code.replace(oldFareCalc, safeFareCalc);
  console.log("✅ Safe fare calculation installed (No more Fare: NaN).");
} else {
  // Regex fallback
  code = code.replace(/const liveTotalText[\s\S]*?const totalFare\s*=\s*Number\(liveTotalText\)[\s\S]*?;/, safeFareCalc);
  console.log("✅ Safe fare calculation applied via regex fallback.");
}

// Target the trip completion cleanup
const oldCompletionReset = `activeTrip = null;
                currentOffer = null;
                document.getElementById('activeTripCard').style.display = 'none';`;

const safeCompletionReset = `// Cleanly purge all global job references to prevent stale resurrection
                activeTrip = null;
                window.activeTrip = null;
                window.activeJob = null;
                window.currentTrip = null;
                if (typeof currentTripJob !== "undefined") currentTripJob = null;
                currentOffer = null;
                window.activeBaseFare = 0;
                window.extraChargesTotal = 0;
                document.getElementById('activeTripCard').style.display = 'none';`;

if (code.includes(oldCompletionReset)) {
  code = code.replace(oldCompletionReset, safeCompletionReset);
  console.log("✅ Complete global job reset installed.");
} else {
  console.log("⚠️ Old completion block not matched verbatim, checking fallback...");
}

fs.writeFileSync('public/driver.html', code);
console.log("🚀 public/driver.html updated successfully!");
