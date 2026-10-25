const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Put the default button directly into the static HTML so it NEVER renders blank
const oldContainerHtml = '<div id="lifecycleActionBtnContainer" style="display:block; min-height:55px; margin:10px 0 12px 0; width:100%; position:relative; z-index:100;"></div>';
const permanentContainerHtml = `<div id="lifecycleActionBtnContainer" style="display:block; margin:10px 0 12px 0; width:100%;">
                    <button type="button" id="btnMainLifecycle" class="btn btn-blue" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer;" onclick="transitionTrip('Arrived')">📍 Mark Arrived at Pickup</button>
                </div>`;

if (html.includes(oldContainerHtml)) {
  html = html.replace(oldContainerHtml, permanentContainerHtml);
} else {
  html = html.replace(/<div id="lifecycleActionBtnContainer"[^>]*>[\s\S]*?<\/div>/, permanentContainerHtml);
}

// 2. Remove the trailing updateSequentialUI from the bottom of the script
const bottomSequentialIdx = html.indexOf('function updateSequentialUI(status) {');
if (bottomSequentialIdx !== -1) {
  // Find where it ends before master controller
  const trailingScript = html.slice(bottomSequentialIdx);
  // We remove the redundant implementation at the end
  html = html.replace(/function updateSequentialUI\(status\) \{[\s\S]*?\}\s*(?=\/\/\s*1\.\s*ARRIVAL|\/\/ =)/, '');
}

// 3. Inject updateSequentialUI directly right below renderActiveTrip (line 484)
const targetHook = "updateSequentialUI(initialStatus);\n        }";
const robustSequential = `updateSequentialUI(initialStatus);
        }

        function updateSequentialUI(status) {
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
                if (waitCard) waitCard.style.display = 'block';

                startArrivalGraceCountdown();

                if (container) {
                    container.innerHTML = '<button type="button" id="btnMainLifecycle" class="btn btn-green" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer; margin-top:8px;" onclick="transitionTrip(\\'POB\\')">👥 Passenger On Board (POB)</button>';
                }
            } 
            else if (st === 'POB') {
                clearAllTimers();
                if (badge) {
                    badge.style.background = '#10b981';
                    badge.textContent = 'POB (En Route)';
                }
                if (navBtn) navBtn.textContent = '🗺️ Open Navigation to Destination';
                if (waitCard) waitCard.style.display = 'block';

                renderEnRouteStopControls();

                if (container) {
                    container.innerHTML = '<button type="button" id="btnMainLifecycle" class="btn btn-red" style="width:100%; padding:14px; font-size:1.1rem; font-weight:800; cursor:pointer; margin-top:8px;" onclick="transitionTrip(\\'Completed\\')">🏁 Complete &amp; Clear Run</button>';
                }
            } 
            else {
                clearAllTimers();
                if (waitCard) waitCard.style.display = 'none';
                if (container) container.innerHTML = '';
            }
        }`;

if (html.includes(targetHook)) {
  html = html.replace(targetHook, robustSequential);
}

fs.writeFileSync('public/driver.html', html);
console.log('✅ Driver interface updated with permanent button and localized sequential engine!');
