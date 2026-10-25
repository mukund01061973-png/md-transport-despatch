const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// 1. Fix duplicated "async async" keywords
html = html.replace(/\basync\s+async\b/g, 'async');
html = html.replace(/\basync\s+async\s+async\b/g, 'async');

// 2. Wrap top-level await in syncLiveTariff properly
// Instead of top-level "const res = await fetch...", wrap in an IIFE or standard async function
html = html.replace(/const res = await fetch\('\/api\/tariff'\);[\s\S]*?const data = await res\.json\(\);/g, `
(async () => {
    try {
        const res = await fetch('/api/tariff');
        const data = await res.json();
        if (data && (data.tariff || data.settings || data.data)) {
            const t = data.tariff || data.settings || data.data;
            activeTariff = { ...activeTariff, ...t };
            console.log("✅ Live Tariff Loaded:", activeTariff);
            calculateQuote();
        }
    } catch(e) {}
})();
`);

fs.writeFileSync('public/book.html', html);
console.log('✅ Cleaned double keywords and wrapped top-level await!');
