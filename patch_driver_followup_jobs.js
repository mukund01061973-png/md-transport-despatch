const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Initialize followUpJob state
if (!html.includes('window.followUpJob = null;')) {
  html = html.replace('let activeTrip = null;', 'let activeTrip = null;\n        window.followUpJob = null;');
}

// 2. Add Follow-Up UI Card element right below activeTripCard
const targetCardSearch = `<div id="activeTripCard"`;
const followUpCardHtml = `<!-- FOLLOW-UP / BACK-TO-BACK QUEUED TRIP BANNER -->
        <div id="followUpTripCard" style="display:none; background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); border: 2px dashed #818cf8; border-radius: 12px; padding: 14px; margin-top: 14px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="background:#4338ca; color:#e0e7ff; font-size:0.75rem; font-weight:800; padding:3px 8px; border-radius:6px; letter-spacing:0.5px;">⏳ NEXT / FOLLOW-UP JOB</span>
                <span id="fuFare" style="color:#a5b4fc; font-weight:bold; font-size:1rem;">£0.00</span>
            </div>
            <div style="font-size:0.9rem; font-weight:bold; color:#fff;" id="fuId">#JOB-XXXXXX</div>
            <div style="font-size:0.85rem; color:#cbd5e1; margin-top:4px;">
                <span style="color:#38bdf8;">📍 Next Pickup:</span> <span id="fuPickup">...</span>
            </div>
            <div style="font-size:0.85rem; color:#cbd5e1; margin-top:2px;">
                <span style="color:#4ade80;">🏁 Next Dropoff:</span> <span id="fuDropoff">...</span>
            </div>
            <div style="font-size:0.75rem; color:#94a3b8; margin-top:8px; border-top:1px solid #4338ca; padding-top:6px; text-align:center;">
                ✅ Queued. Will activate automatically upon completing current run.
            </div>
        </div>

        <div id="activeTripCard"`;

if (!html.includes('id="followUpTripCard"') && html.includes(targetCardSearch)) {
  html = html.replace(targetCardSearch, followUpCardHtml);
  console.log("✅ Added Follow-Up Trip Card container to driver.html!");
}

// 3. Update active_trip_assigned handler to queue if already on a job
const oldAssignedTarget = `socket.on('active_trip_assigned', (job) => {
            console.log("🚀 active_trip_assigned received:", job);
            window.activeJob = job;
            activeBids = activeBids.filter(x => x.id !== job.id);
            renderBidBoard();

            // 1. Dismiss any offer/bid modal still open
            const offerModal = document.getElementById("offerModal");
            if (offerModal) offerModal.style.display = "none";
            if (typeof offerInterval !== "undefined") clearInterval(offerInterval);
            if (typeof offerChimeInterval !== "undefined") clearInterval(offerChimeInterval);

            // 2. Automatically switch to Shift view
            if (typeof switchTab === "function") {
                switchTab('Shift');
            }

            // 3. Render and unhide active trip panel
            if (typeof renderActiveTrip === "function") {
                renderActiveTrip(job);
            }`;

const newAssignedBlock = `socket.on('active_trip_assigned', (job) => {
            console.log("🚀 active_trip_assigned received:", job);
            activeBids = activeBids.filter(x => x.id !== job.id);
            renderBidBoard();

            // 1. Dismiss any offer/bid modal still open
            const offerModal = document.getElementById("offerModal");
            if (offerModal) offerModal.style.display = "none";
            if (typeof offerInterval !== "undefined") clearInterval(offerInterval);
            if (typeof offerChimeInterval !== "undefined") clearInterval(offerChimeInterval);

            // 2. CHECK IF DRIVER ALREADY HAS A JOB IN PROGRESS
            const isCurrentlyOnJob = activeTrip && ['Accepted', 'ACCEPTED', 'Arrived', 'ARRIVED', 'POB'].includes(activeTrip.status);

            if (isCurrentlyOnJob && activeTrip.id !== job.id) {
                // QUEUE AS FOLLOW-UP JOB
                window.followUpJob = job;
                console.log("📦 Stashed job #" + job.id + " as FOLLOW-UP run.");
                renderFollowUpCard(job);
                if (typeof speakAlert === "function") {
                    speakAlert("Follow-up job queued for after current trip.");
                }
                if (typeof switchTab === "function") {
                    switchTab('Shift');
                }
                return;
            }

            // PRIMARY ACTIVE JOB
            window.activeJob = job;
            if (typeof switchTab === "function") {
                switchTab('Shift');
            }
            if (typeof renderActiveTrip === "function") {
                renderActiveTrip(job);
            }`;

if (html.includes(oldAssignedTarget)) {
  html = html.replace(oldAssignedTarget, newAssignedBlock);
  console.log("✅ Updated active_trip_assigned to queue follow-up jobs!");
} else {
  console.log("⚠️ Could not match oldAssignedTarget exactly.");
}

// 4. Add renderFollowUpCard helper and patch resetDriverToStandby to promote followUpJob
const helperFunctions = `
        function renderFollowUpCard(job) {
            const card = document.getElementById("followUpTripCard");
            if (!card) return;
            if (!job) {
                card.style.display = "none";
                return;
            }
            document.getElementById("fuId").textContent = "#" + job.id + " • " + (job.passengerName || "Passenger");
            document.getElementById("fuFare").textContent = "£" + Number(job.fare || 0).toFixed(2);
            document.getElementById("fuPickup").textContent = job.pickup || "";
            document.getElementById("fuDropoff").textContent = job.dropoff || "";
            card.style.display = "block";
        }
`;

if (!html.includes('function renderFollowUpCard')) {
  html = html.replace('function resetDriverToStandby() {', helperFunctions + '\n        function resetDriverToStandby() {');
}

// 5. Update resetDriverToStandby to promote follow-up job automatically
const oldResetTarget = `function resetDriverToStandby() {
            if (typeof clearAllTimers === "function") clearAllTimers();
            activeTrip = null;
            currentOffer = null;
            window.activeJob = null;`;

const newResetBlock = `function resetDriverToStandby() {
            if (typeof clearAllTimers === "function") clearAllTimers();

            // CHECK IF THERE IS A QUEUED FOLLOW-UP JOB READY TO ACTIVATE
            if (window.followUpJob) {
                const nextTrip = window.followUpJob;
                window.followUpJob = null;
                renderFollowUpCard(null);
                console.log("🚀 Promoting follow-up job #" + nextTrip.id + " to ACTIVE TRIP!");
                if (typeof speakAlert === "function") {
                    speakAlert("Next job activated. Heading to pickup: " + (nextTrip.pickup || ""));
                }
                renderActiveTrip(nextTrip);
                return;
            }

            renderFollowUpCard(null);
            activeTrip = null;
            currentOffer = null;
            window.activeJob = null;`;

if (html.includes(oldResetTarget)) {
  html = html.replace(oldResetTarget, newResetBlock);
  console.log("✅ Updated resetDriverToStandby to automatically promote follow-up job on completion!");
}

fs.writeFileSync('public/driver.html', html);

// Validate JS syntax in driver.html
const scriptBlocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
let valid = true;
scriptBlocks.forEach((block, idx) => {
    try {
        new Function(block[1]);
    } catch (e) {
        valid = false;
        console.error(`Syntax error in script block:`, e.message);
    }
});
if (valid) console.log("🚀 public/driver.html syntax is 100% CLEAN!");
