const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

const driverSyncScript = `
        // LIVE SYNC: Pull waiting time & tariff settings from server
        async function syncDriverMasterTariff() {
            try {
                const res = await fetch('/api/tariff');
                const data = await res.json();
                if (data && data.success && data.tariff) {
                    const t = data.tariff;
                    masterTariff.freeWaitMins = parseInt(t.freeWaitMins || t.waitingGraceMins || 3);
                    masterTariff.waitingRatePerMin = parseFloat(t.waitingRatePerMin || 0.45);
                    masterTariff.viaStopFee = parseFloat(t.viaStopFee || 5.00);
                    masterTariff.companyCommissionPct = parseFloat(t.companyCommissionPct || 20.0);
                    console.log("⚡ Driver terminal master tariff synced:", masterTariff);
                }
            } catch(e) {}
        }
        syncDriverMasterTariff();
`;

if (!html.includes('syncDriverMasterTariff()')) {
  const marker = 'let masterTariff = {';
  const endMarker = '};';
  const startIdx = html.indexOf(marker);
  const endIdx = html.indexOf(endMarker, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    html = html.substring(0, endIdx + 2) + '\n' + driverSyncScript + html.substring(endIdx + 2);
    fs.writeFileSync('public/driver.html', html);
    console.log('✅ Wired live master tariff sync into public/driver.html!');
  }
} else {
  console.log('ℹ️ driver.html already has syncDriverMasterTariff');
}
