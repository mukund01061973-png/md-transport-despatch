const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

const liveSyncScript = `
        // LIVE SYNC: Pull master tariff from database
        async function syncLiveTariff() {
            try {
                const res = await fetch('/api/tariff');
                const data = await res.json();
                if (data && data.success && data.tariff) {
                    const t = data.tariff;
                    activeTariff = {
                        baseFlagDrop: parseFloat(t.baseFlagDrop || t.tier1BaseFare || 7.00),
                        firstMileRate: parseFloat(t.firstMileRate || t.tier1FirstMile || 3.00),
                        tier1PerMile: parseFloat(t.tier1PerMile || 2.50),
                        tier2PerMile: parseFloat(t.tier2PerMile || 1.80),
                        tier3PerMile: parseFloat(t.tier3PerMile || 1.50),
                        viaStopFee: parseFloat(t.viaStopFee || 5.00),
                        petSurcharge: parseFloat(t.petSurcharge || 6.00),
                        estatePercent: parseFloat(t.estatePercent || 0.10),
                        mpvPercent: parseFloat(t.mpvPercent || 0.40),
                        minibus7Percent: parseFloat(t.minibus7Percent || 0.60),
                        minibus8Percent: parseFloat(t.minibus8Percent || 0.80),
                        execPercent: parseFloat(t.execPercent || 1.00)
                    };
                    if (typeof calculateQuote === 'function') calculateQuote();
                }
            } catch(e) {}
        }
        syncLiveTariff();
`;

if (!html.includes('syncLiveTariff()')) {
  // Insert right after activeTariff definition
  const marker = 'activeTariff = {';
  const endMarker = '};';
  const startIdx = html.indexOf(marker);
  const endIdx = html.indexOf(endMarker, startIdx);
  if (startIdx !== -1 && endIdx !== -1) {
    html = html.substring(0, endIdx + 2) + '\n' + liveSyncScript + html.substring(endIdx + 2);
    fs.writeFileSync('public/book.html', html);
    console.log('✅ Wired live master tariff sync into public/book.html!');
  }
} else {
  console.log('ℹ️ book.html already has syncLiveTariff');
}
