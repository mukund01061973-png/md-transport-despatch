const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Remove duplicate declarations of waitTimerInterval
// Replace all let/var/const waitTimerInterval with a single window-level definition
html = html.replace(/(?:let|var|const)\s+waitTimerInterval\s*=[^;]*;/g, '/* removed dup waitTimerInterval */');
html = html.replace(/(?:let|var|const)\s+waitTimerInterval;/g, '/* removed dup waitTimerInterval */');

// 2. Remove duplicate declarations of master waiting variables
html = html.replace(/(?:let|var|const)\s+freeGraceTimer\s*=[^;]*;/g, '/* removed dup freeGraceTimer */');
html = html.replace(/(?:let|var|const)\s+freeGraceSeconds\s*=[^;]*;/g, '/* removed dup freeGraceSeconds */');
html = html.replace(/(?:let|var|const)\s+isGraceArmedByDriver\s*=[^;]*;/g, '/* removed dup isGraceArmedByDriver */');
html = html.replace(/(?:let|var|const)\s+waitChargeTimer\s*=[^;]*;/g, '/* removed dup waitChargeTimer */');
html = html.replace(/(?:let|var|const)\s+waitChargeSeconds\s*=[^;]*;/g, '/* removed dup waitChargeSeconds */');
html = html.replace(/(?:let|var|const)\s+isChargingActive\s*=[^;]*;/g, '/* removed dup isChargingActive */');
html = html.replace(/(?:let|var|const)\s+enRouteTimer\s*=[^;]*;/g, '/* removed dup enRouteTimer */');
html = html.replace(/(?:let|var|const)\s+enRouteSeconds\s*=[^;]*;/g, '/* removed dup enRouteSeconds */');
html = html.replace(/(?:let|var|const)\s+isEnRouteStopped\s*=[^;]*;/g, '/* removed dup isEnRouteStopped */');
html = html.replace(/(?:let|var|const)\s+WAIT_RATE\s*=[^;]*;/g, '/* removed dup WAIT_RATE */');

// 3. Inject global definitions right at the very beginning of the main <script> tag
const mainScriptTag = '<script>';
const firstScriptIdx = html.indexOf(mainScriptTag);

const topLevelState = `
    // GLOBAL TIMERS & LIFECYCLE STATE (Single Declaration)
    window.waitTimerInterval = null;
    window.freeGraceTimer = null;
    window.freeGraceSeconds = 300;
    window.isGraceArmedByDriver = false;
    window.waitChargeTimer = null;
    window.waitChargeSeconds = 0;
    window.isChargingActive = false;
    window.enRouteTimer = null;
    window.enRouteSeconds = 0;
    window.isEnRouteStopped = false;
    window.WAIT_RATE = 0.35;

    function clearAllTimers() {
        if (window.freeGraceTimer) { clearInterval(window.freeGraceTimer); window.freeGraceTimer = null; }
        if (window.waitChargeTimer) { clearInterval(window.waitChargeTimer); window.waitChargeTimer = null; }
        if (window.enRouteTimer) { clearInterval(window.enRouteTimer); window.enRouteTimer = null; }
        if (window.waitTimerInterval) { clearInterval(window.waitTimerInterval); window.waitTimerInterval = null; }
        window.isChargingActive = false;
        window.isEnRouteStopped = false;
    }
`;

if (firstScriptIdx !== -1) {
  html = html.slice(0, firstScriptIdx + mainScriptTag.length) + topLevelState + html.slice(firstScriptIdx + mainScriptTag.length);
}

fs.writeFileSync('public/driver.html', html);
console.log('✅ Removed duplicate variables and made clearAllTimers globally available!');
