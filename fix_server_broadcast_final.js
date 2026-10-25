const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// 1. Create a bulletproof, global broadcast function right above io.on('connection')
const globalBroadcastDef = `
// === GLOBAL MASTER BROADCAST ===
function broadcastAdminState() {
  try {
    const activeTariff = typeof getTariff === "function" ? getTariff(clientTenant) : {};
    let allDrivers = [];
    try {
      allDrivers = typeof getMergedDrivers === "function" ? getMergedDrivers(clientTenant) : db.prepare("SELECT * FROM drivers").all();
    } catch(e) {
      try { allDrivers = db.prepare("SELECT * FROM drivers").all(); } catch(e2) {}
    }
    let allPlots = [];
    try { allPlots = db.prepare("SELECT * FROM plots").all(); } catch(e) {}
    let allAirports = [];
    try { allAirports = db.prepare("SELECT * FROM airport_matrix").all(); } catch(e) {}
    let allAccounts = [];
    try {
      allAccounts = db.prepare("SELECT * FROM corporate_accounts").all();
    } catch(e) {
      try { allAccounts = db.prepare("SELECT * FROM accounts").all(); } catch(e2) {}
    }
    let allJobs = [];
    try {
      allJobs = typeof getAllJobs === "function" ? getAllJobs(clientTenant) : db.prepare("SELECT * FROM bookings ORDER BY id DESC").all();
    } catch(e) {
      try { allJobs = db.prepare("SELECT * FROM bookings ORDER BY id DESC").all(); } catch(e2) {}
    }

    io.emit("update_tariff", activeTariff);
    io.emit("update_driver_list", allDrivers);
    io.emit("update_jobs_list", allJobs);
    io.emit("update_airports", allAirports);
    io.emit("update_plots", allPlots);
    io.emit("update_accounts", allAccounts);
    console.log("📡 [BROADCAST] Fresh admin state pushed to all clients live.");
  } catch(err) {
    console.error("❌ Broadcast admin state error:", err);
  }
}
`;

if (!code.includes('function broadcastAdminState()')) {
  const connIdx = code.indexOf("io.on('connection'");
  if (connIdx !== -1) {
    code = code.slice(0, connIdx) + globalBroadcastDef + '\n' + code.slice(connIdx);
    console.log('✅ Added global broadcastAdminState function');
  }
}

// 2. Wire broadcastAdminState() into admin_update_driver
if (code.includes("admin_update_driver")) {
  code = code.replace(
    /console\.log\(`✅ Driver \${dId} updated in fleet database`\);?/,
    `console.log(\`✅ Driver \${dId} updated in fleet database\`);\n      broadcastAdminState();`
  );
}

// 3. Wire into admin_update_plot
if (code.includes("admin_update_plot")) {
  const pIdx = code.indexOf("admin_update_plot");
  const endTry = code.indexOf("} catch", pIdx);
  if (endTry !== -1 && !code.slice(pIdx, endTry).includes("broadcastAdminState()")) {
    code = code.slice(0, endTry) + "      broadcastAdminState();\n    " + code.slice(endTry);
    console.log('✅ Wired broadcastAdminState to admin_update_plot');
  }
}

// 4. Wire into admin_update_account
if (code.includes("admin_update_account")) {
  const aIdx = code.indexOf("admin_update_account");
  const endTry = code.indexOf("} catch", aIdx);
  if (endTry !== -1 && !code.slice(aIdx, endTry).includes("broadcastAdminState()")) {
    code = code.slice(0, endTry) + "      broadcastAdminState();\n    " + code.slice(endTry);
    console.log('✅ Wired broadcastAdminState to admin_update_account');
  }
}

// 5. Wire into admin_update_airport
if (code.includes("admin_update_airport")) {
  const apIdx = code.indexOf("admin_update_airport");
  const endTry = code.indexOf("} catch", apIdx);
  if (endTry !== -1 && !code.slice(apIdx, endTry).includes("broadcastAdminState()")) {
    code = code.slice(0, endTry) + "      broadcastAdminState();\n    " + code.slice(endTry);
    console.log('✅ Wired broadcastAdminState to admin_update_airport');
  }
}

fs.writeFileSync('index.js', code);
console.log('✅ index.js successfully patched with instant broadcasts!');
