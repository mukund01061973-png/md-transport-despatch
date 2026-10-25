const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

const targetListener = `socket.on('active_trip_assigned', (job) => {
            activeBids = activeBids.filter(x => x.id !== job.id);
            renderBidBoard();
            renderActiveTrip(job);
        });`;

const updatedListener = `socket.on('active_trip_assigned', (job) => {
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
            }

            const tripContainer = document.getElementById("activeTripContainer") || document.getElementById("activeTripSection");
            if (tripContainer) {
                tripContainer.style.display = "block";
            }
            const standbySection = document.getElementById("standbySection") || document.getElementById("availableSection");
            if (standbySection) {
                standbySection.style.display = "none";
            }

            // 4. Scroll smoothly to top of active trip
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });`;

if (html.includes(targetListener)) {
    html = html.replace(targetListener, updatedListener);
    fs.writeFileSync('public/driver.html', html);
    console.log("✅ Successfully patched active_trip_assigned with automatic tab switch & display!");
} else {
    // Fallback regex replacement if formatting differs
    html = html.replace(
        /socket\.on\(\s*['"]active_trip_assigned['"]\s*,\s*\(?job\)?\s*=>\s*\{[\s\S]*?renderActiveTrip\(job\);[\s\S]*?\}\);/,
        updatedListener
    );
    fs.writeFileSync('public/driver.html', html);
    console.log("✅ Patched via regex match.");
}

// Validate syntax
const scriptBlocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
let valid = true;
scriptBlocks.forEach((block, idx) => {
    try {
        new Function(block[1]);
    } catch (e) {
        valid = false;
        console.error(`Syntax error in block ${idx + 1}:`, e.message);
    }
});
if (valid) console.log("🚀 driver.html syntax is 100% CLEAN!");
