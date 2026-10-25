const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Create a helper function updateHeaderBadge to keep the badge accurate everywhere
const helperFunc = `
        function updateHeaderBadge() {
            const hdrRank = document.getElementById("hdrQueueRank");
            if (!hdrRank) return;
            const hasTrip = (window.activeJob && window.activeJob.status && !['COMPLETED', 'CANCELLED'].includes(window.activeJob.status.toUpperCase())) ||
                            (window.activeTrip && window.activeTrip.status && !['COMPLETED', 'CANCELLED'].includes(window.activeTrip.status.toUpperCase())) ||
                            (typeof activeTrip !== "undefined" && activeTrip && activeTrip.status && !['COMPLETED', 'CANCELLED'].includes(activeTrip.status.toUpperCase()));
            
            if (hasTrip) {
                hdrRank.textContent = "🚖 ON JOB";
                hdrRank.style.background = "#0284c7";
                hdrRank.style.color = "#ffffff";
            } else {
                const pName = window.myCurrentPlot || "Larkhall";
                const pRank = window.myCurrentRank || "Position #1 of 1";
                hdrRank.textContent = "🚕 Stand: " + pName + " • " + pRank;
                hdrRank.style.background = "";
                hdrRank.style.color = "";
            }
        }
`;

// Insert helper right before socket.on("queue_update"
const qTarget = 'socket.on("queue_update", function(data) {';
if (html.includes(qTarget) && !html.includes('function updateHeaderBadge()')) {
    html = html.replace(qTarget, helperFunc + '\n        ' + qTarget);
    console.log("✅ Added updateHeaderBadge() helper function!");
}

// 2. In socket.on("queue_update"), use updateHeaderBadge instead of unconditionally setting stand text
const targetHdrAssignment = `const hdrRank = document.getElementById("hdrQueueRank");
                if (hdrRank) hdrRank.textContent = "🚕 Stand: " + (data.plotName || "Larkhall") + " • " + rankTxt;`;

const newHdrAssignment = `updateHeaderBadge();`;

if (html.includes(targetHdrAssignment)) {
    html = html.replace(targetHdrAssignment, newHdrAssignment);
    console.log("✅ Patched queue_update to respect active trips!");
}

// 3. Call updateHeaderBadge() when rendering an active trip
const renderTarget = 'function renderActiveTrip(job) {';
if (html.includes(renderTarget) && !html.includes('renderActiveTrip(job) {\n            setTimeout(updateHeaderBadge, 50);')) {
    html = html.replace(renderTarget, 'function renderActiveTrip(job) {\n            setTimeout(updateHeaderBadge, 50);');
    console.log("✅ Linked updateHeaderBadge to renderActiveTrip!");
}

// 4. Call updateHeaderBadge() when resetting to standby upon trip completion
const resetTarget = 'function resetDriverToStandby() {';
if (html.includes(resetTarget) && !html.includes('resetDriverToStandby() {\n            setTimeout(updateHeaderBadge, 50);')) {
    html = html.replace(resetTarget, 'function resetDriverToStandby() {\n            setTimeout(updateHeaderBadge, 50);');
    console.log("✅ Linked updateHeaderBadge to resetDriverToStandby!");
}

fs.writeFileSync('public/driver.html', html);

// Validate JS syntax in driver.html
const scriptBlocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
let valid = true;
scriptBlocks.forEach((block) => {
    try {
        new Function(block[1]);
    } catch (e) {
        valid = false;
        console.error("Syntax error:", e.message);
    }
});
if (valid) console.log("🚀 public/driver.html syntax is 100% CLEAN!");
