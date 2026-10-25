const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Target the logout handler
const targetLogout = `if (typeof socket !== "undefined" && socket.connected) {
                socket.emit("driver_logout", { driverId: window.myDriverId || "MUKUND" });
                socket.disconnect();
            }
            window.location.reload();`;

const newLogout = `const activeDId = (window.myDriver && (window.myDriver.driverId || window.myDriver.id)) ||
                              sessionStorage.getItem("driverId") ||
                              localStorage.getItem("driverId") ||
                              (typeof myDriverId !== "undefined" ? myDriverId : "");

            if (typeof socket !== "undefined" && socket && socket.connected) {
                console.log("📤 Emitting immediate driver_logout for:", activeDId);
                socket.emit("driver_logout", { driverId: activeDId });
                // Small buffer so socket flush finishes before reload
                setTimeout(() => {
                    try { socket.disconnect(); } catch(e) {}
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                }, 100);
            } else {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
            }`;

if (html.includes(targetLogout)) {
  html = html.replace(targetLogout, newLogout);
  console.log("✅ Patched driver.html logout handler to guarantee packet delivery and correct driverId!");
} else {
  // Broader regex search if formatting differs slightly
  html = html.replace(/socket\.emit\(["']driver_logout["'][^;]+;\s*socket\.disconnect\(\);\s*\}\s*window\.location\.reload\(\);/, newLogout);
  console.log("✅ Applied regex patch to driver.html logout handler!");
}

// Ensure window.myDriverId is always kept in sync on login_result
const loginTarget = `myDriver = res.driver;`;
const loginReplacement = `myDriver = res.driver;
            window.myDriver = res.driver;
            window.myDriverId = res.driver ? (res.driver.driverId || res.driver.id) : null;
            if (window.myDriverId) {
                sessionStorage.setItem("driverId", window.myDriverId);
                localStorage.setItem("driverId", window.myDriverId);
            }`;

if (html.includes(loginTarget) && !html.includes('window.myDriverId = res.driver ?')) {
  html = html.replace(loginTarget, loginReplacement);
  console.log("✅ Bound window.myDriverId directly to login_result!");
}

fs.writeFileSync('public/driver.html', html);
console.log("🚀 driver.html update complete!");
