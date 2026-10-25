const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Replace updateSequentialUI with a rock-solid, crash-proof version
const oldSequentialStart = "function updateSequentialUI(status) {";
const oldSequentialEnd = "function transitionTrip(nextStatus) {";
const idxStart = html.indexOf(oldSequentialStart);
const idxEnd = html.indexOf(oldSequentialEnd);

if (idxStart !== -1 && idxEnd !== -1) {
  const newSequential = `function updateSequentialUI(status) {
            const container = document.getElementById('lifecycleActionBtnContainer');
            const badge = document.getElementById('tripStatusBadge');
            const waitCard = document.getElementById('unifiedWaitingCard');
            const navBtn = document.getElementById('btnNavMaps');

            const st = String(status || 'ACCEPTED').toUpperCase();
            if (badge) badge.textContent = st;

            if (st === 'ACCEPTED' || st === 'OFFERED' || st === 'PENDING') {
                clearAllTimers();
                isGraceArmedByDriver = false;
                waitChargeSeconds = 0;
                enRouteSeconds = 0;

                if (badge) badge.style.background = '#0284c7';
                if (waitCard) waitCard.style.display = 'none';
                if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Pickup';
                
                if (container) {
                    container.innerHTML = '<button type="button" id="btnMainLifecycle" class="btn btn-blue" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer;" onclick="transitionTrip(\\'Arrived\\')">📍 Mark Arrived at Pickup</button>';
                }
            } 
            else if (st === 'ARRIVED') {
                clearAllTimers();
                if (badge) badge.style.background = '#f59e0b';
                if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Pickup';
                
                // RENDER POB BUTTON FIRST SO IT NEVER FREEZES
                if (container) {
                    container.innerHTML = '<button type="button" id="btnMainLifecycle" class="btn btn-green" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer; margin-top:8px;" onclick="transitionTrip(\\'POB\\')">👥 Passenger On Board (POB)</button>';
                }

                // THEN SHOW & START WAITING CARD
                if (waitCard) {
                    waitCard.style.display = 'block';
                }
                
                try {
                    startArrivalGraceCountdown();
                } catch (e) {
                    console.error("Error starting arrival grace:", e);
                }
            } 
            else if (st === 'POB') {
                clearAllTimers();
                if (badge) {
                    badge.style.background = '#10b981';
                    badge.textContent = 'POB (En Route)';
                }
                if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Destination';
                
                if (container) {
                    container.innerHTML = '<button type="button" id="btnMainLifecycle" class="btn btn-red" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer; margin-top:8px;" onclick="transitionTrip(\\'Completed\\')">🏁 Complete &amp; Clear Run</button>';
                }

                if (waitCard) {
                    waitCard.style.display = 'block';
                }

                try {
                    renderEnRouteStopControls();
                } catch (e) {
                    console.error("Error setting en route controls:", e);
                }
            } 
            else {
                clearAllTimers();
                if (waitCard) waitCard.style.display = 'none';
                if (container) container.innerHTML = '';
            }
        }\n\n        `;

  html = html.slice(0, idxStart) + newSequential + html.slice(idxEnd);
  console.log("✅ Replaced updateSequentialUI with safe render-first order!");
}

// 2. Also ensure renderArrivalGraceUI checks all DOM nodes safely
const oldRenderGraceStart = "function renderArrivalGraceUI() {";
const oldRenderGraceEnd = "function toggleArmWaitingEarly() {";
const gStart = html.indexOf(oldRenderGraceStart);
const gEnd = html.indexOf(oldRenderGraceEnd);

if (gStart !== -1 && gEnd !== -1) {
  const safeRenderGrace = `function renderArrivalGraceUI() {
    const title = document.getElementById('waitCardTitle');
    const badge = document.getElementById('waitCardBadge');
    const clock = document.getElementById('waitClockDisplay');
    const btnBox = document.getElementById('waitActionBtnBox');

    if (title) title.textContent = '⏱️ Free Arrival Grace Window';
    if (badge) {
        badge.textContent = isGraceArmedByDriver ? 'Armed: Starts After Grace' : 'Free 5-Min Grace';
        badge.style.background = isGraceArmedByDriver ? '#0284c7' : '#15803d';
        badge.style.color = '#fff';
    }

    const mins = Math.floor(Math.max(0, freeGraceSeconds) / 60);
    const secs = Math.max(0, freeGraceSeconds) % 60;
    if (clock) {
        clock.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        clock.style.color = '#fde047';
    }

    if (btnBox) {
        if (!isGraceArmedByDriver) {
            btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:10px; font-weight:700; background:#334155; color:#38bdf8; border:1px solid #0284c7; border-radius:6px; cursor:pointer;" onclick="toggleArmWaitingEarly()">⚡ Arm Waiting Charge (Starts After Grace)</button>';
        } else {
            btnBox.innerHTML = '<button type="button" class="btn" style="width:100%; padding:10px; font-weight:700; background:#065f46; color:#a7f3d0; border:1px solid #10b981; border-radius:6px; cursor:pointer;" onclick="toggleArmWaitingEarly()">✅ Armed: Free window running, will charge after 00:00 (Click to Disarm)</button>';
        }
    }
}\n\n`;

  html = html.slice(0, gStart) + safeRenderGrace + html.slice(gEnd);
  console.log("✅ Patched renderArrivalGraceUI with complete safety checks!");
}

fs.writeFileSync('public/driver.html', html);
console.log("🎉 Complete driver sequence patched!");
