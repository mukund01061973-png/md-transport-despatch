const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Ensure driverWaitingHUD defaults to display:none
html = html.replace(
  '<div id="driverWaitingHUD" style="background:#0f172a;',
  '<div id="driverWaitingHUD" style="display:none; background:#0f172a;'
);

// 2. Rewrite updateSequentialUI cleanly without dead references to waitingTimeBox
const oldSequentialStart = "function updateSequentialUI(status) {";
const oldSequentialEnd = "// TARIFF-DRIVEN WAITING TIME ENGINE";

const startIdx = html.indexOf(oldSequentialStart);
const endIdx = html.indexOf(oldSequentialEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const cleanSequential = `function updateSequentialUI(status) {
            const container = document.getElementById('lifecycleActionBtnContainer');
            const badge = document.getElementById('tripStatusBadge');
            const hud = document.getElementById('driverWaitingHUD');
            const navBtn = document.getElementById('btnNavMaps');
            if (!container) return;

            const st = String(status || 'ACCEPTED').toUpperCase();
            if (badge) badge.textContent = st;

            if (st === 'ACCEPTED' || st === 'OFFERED' || st === 'PENDING') {
                if (badge) badge.style.background = '#0284c7';
                if (hud) hud.style.display = 'none';
                if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Pickup';

                container.innerHTML = '<button type="button" class="btn btn-blue" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer;" onclick="transitionTrip(\\'Arrived\\')">📍 Mark Arrived at Pickup</button>';
            } else if (st === 'ARRIVED') {
                if (badge) badge.style.background = '#f59e0b';
                if (hud) hud.style.display = 'block';
                if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Pickup';

                container.innerHTML = '<button type="button" class="btn btn-green" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer;" onclick="transitionTrip(\\'POB\\')">👥 Passenger On Board (POB)</button>';
            } else if (st === 'POB') {
                if (badge) {
                    badge.style.background = '#10b981';
                    badge.textContent = 'POB (En Route)';
                }
                if (hud) hud.style.display = 'block';
                if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Destination';

                container.innerHTML = '<button type="button" class="btn btn-red" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer;" onclick="transitionTrip(\\'Completed\\')">🏁 Complete &amp; Clear Run</button>';
            } else {
                if (hud) hud.style.display = 'none';
                container.innerHTML = '';
            }
        }

        `;

  html = html.slice(0, startIdx) + cleanSequential + html.slice(endIdx);
}

// 3. Ensure transitionTrip('Completed') hides the HUD and clears the state
html = html.replace(
  "document.getElementById('viewActiveTrip').style.display = 'none';",
  "document.getElementById('viewActiveTrip').style.display = 'none'; const hudEl = document.getElementById('driverWaitingHUD'); if (hudEl) hudEl.style.display = 'none';"
);

fs.writeFileSync('public/driver.html', html);
console.log('✅ updateSequentialUI repaired and Waiting HUD tied cleanly to trip lifecycle!');
