const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Replace the manual stopover/wait box with our comprehensive Driver Waiting Control HUD
const targetHook = '<div id="pobExtraBox" style="display:none; margin-bottom:6px;">';

const newWaitingHUD = `<!-- DRIVER-CONTROLLED WAITING & EN-ROUTE STOPS -->
                <div id="driverWaitingHUD" style="background:#0f172a; border:1px solid #334155; border-radius:8px; padding:10px; margin-bottom:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-size:0.8rem; font-weight:700; color:#38bdf8;">⏱️ Waiting Time Control</span>
                        <span id="waitingStatusBadge" style="font-size:0.75rem; padding:2px 8px; border-radius:4px; background:#334155; color:#94a3b8;">Inactive</span>
                    </div>

                    <div id="waitingTimerDisplay" style="font-size:1.1rem; font-weight:800; color:#fde047; text-align:center; padding:6px; background:#1e293b; border-radius:6px; margin-bottom:8px;">
                        00:00 <span style="font-size:0.75rem; color:#94a3b8; font-weight:400;">(+£<span id="liveWaitingCharge">0.00</span>)</span>
                    </div>

                    <div style="display:flex; gap:6px;">
                        <button type="button" id="btnToggleWait" class="btn" style="flex:1; padding:8px; font-size:0.8rem; background:#2563eb; color:#fff; font-weight:700;" onclick="toggleDriverWaiting()">
                            ▶️ Start Waiting (5m Free)
                        </button>
                        <button type="button" class="btn" style="flex:1; padding:8px; font-size:0.8rem; background:#d97706; color:#fff; font-weight:700;" onclick="addEnRouteStop()">
                            ➕ Via / Stopover
                        </button>
                    </div>
                </div>

                <div id="pobExtraBox" style="display:none; margin-bottom:6px;">`;

if (!html.includes('id="driverWaitingHUD"')) {
  html = html.replace(targetHook, newWaitingHUD);
}

// Add the JS logic for the waiting timer, grace period, and stops
const scriptAnchor = "function submitDriverChat(e) {";

const waitingLogicJS = `
// ================= DRIVER WAITING & STOP CONTROL =================
let waitTimerInterval = null;
let waitSecondsElapsed = 0;
let isWaitingActive = false;
let waitType = 'arrival'; // 'arrival' or 'enroute'
const FREE_GRACE_SECONDS = 300; // 5 minutes free
const WAIT_RATE_PER_MIN = 0.35; // £0.35/min after grace

function toggleDriverWaiting() {
    const btn = document.getElementById('btnToggleWait');
    const badge = document.getElementById('waitingStatusBadge');
    
    if (!isWaitingActive) {
        // Start Waiting
        isWaitingActive = true;
        btn.textContent = '⏸️ Stop Waiting';
        btn.style.background = '#dc2626';
        badge.textContent = 'Waiting Active';
        badge.style.background = '#15803d';
        badge.style.color = '#fff';

        if (!waitTimerInterval) {
            waitTimerInterval = setInterval(updateWaitTick, 1000);
        }
    } else {
        // Pause / Stop Waiting
        isWaitingActive = false;
        btn.textContent = '▶️ Resume Waiting';
        btn.style.background = '#2563eb';
        badge.textContent = 'Paused';
        badge.style.background = '#ca8a04';
        badge.style.color = '#fff';
    }
}

function updateWaitTick() {
    if (!isWaitingActive) return;
    waitSecondsElapsed++;

    const mins = Math.floor(waitSecondsElapsed / 60);
    const secs = waitSecondsElapsed % 60;
    const timeFormatted = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');

    // Calculate chargeable minutes beyond the free grace period
    const chargeableSecs = Math.max(0, waitSecondsElapsed - FREE_GRACE_SECONDS);
    const chargeableMins = Math.ceil(chargeableSecs / 60);
    const currentWaitCharge = (chargeableMins * WAIT_RATE_PER_MIN);

    const timerDisp = document.getElementById('waitingTimerDisplay');
    if (waitSecondsElapsed <= FREE_GRACE_SECONDS) {
        const remainingGrace = FREE_GRACE_SECONDS - waitSecondsElapsed;
        const gMins = Math.floor(remainingGrace / 60);
        const gSecs = remainingGrace % 60;
        timerDisp.innerHTML = \`\${timeFormatted} <span style="font-size:0.75rem; color:#4ade80;">(Free: \${gMins}m \${gSecs}s left)</span>\`;
    } else {
        timerDisp.innerHTML = \`\${timeFormatted} <span style="font-size:0.75rem; color:#f87171;">(+£\${currentWaitCharge.toFixed(2)})</span>\`;
    }

    document.getElementById('liveWaitingCharge').textContent = currentWaitCharge.toFixed(2);

    // Sync periodically to server every 30 seconds or when charges tick
    if (waitSecondsElapsed % 30 === 0 && currentTrip) {
        syncWaitingToServer(mins, currentWaitCharge);
    }
}

function syncWaitingToServer(mins, charge) {
    if (!currentTrip || !currentTrip.id) return;
    const baseFare = parseFloat(currentTrip.fare || 0);
    socket.emit('driver_update_waiting', {
        jobId: currentTrip.id,
        arrivalWaitMins: waitType === 'arrival' ? mins : 0,
        enRouteWaitMins: waitType === 'enroute' ? mins : 0,
        waitingCharge: charge,
        totalFare: (baseFare + charge).toFixed(2)
    });
}

function addEnRouteStop() {
    waitType = 'enroute';
    alert('En-route stop added. Use "Start Waiting" if vehicle is stopped.');
}
`;

if (!html.includes('function toggleDriverWaiting()')) {
  html = html.replace(scriptAnchor, waitingLogicJS + "\n" + scriptAnchor);
}

fs.writeFileSync('public/driver.html', html);
console.log('✅ public/driver.html updated with Driver-Controlled Waiting!');
