const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// 1. Remove duplicate declarations of activeTariff
// Keep only ONE declaration at the very top of the script
html = html.replace(/let\s+activeTariff\s*=\s*\{[\s\S]*?\};\s*async\s+function\s+syncLiveTariff/g, 'async function syncLiveTariff');
html = html.replace(/var\s+activeTariff\s*=\s*\{[\s\S]*?\};\s*async\s+function\s+syncLiveTariff/g, 'async function syncLiveTariff');

// Clean up any remaining multiple declarations of activeTariff
let declCount = 0;
html = html.replace(/(let|const|var)\s+activeTariff\b/g, (match) => {
    declCount++;
    return declCount === 1 ? 'var activeTariff' : 'activeTariff';
});

// 2. Guarantee Master Tariff Calculation with £7 Base + 20% Surge = £8.40
const masterTariffCalculator = `
        var activeTariff = {
            baseFlagDrop: 7.00,
            tier1BaseFare: 7.00,
            tier1FirstMile: 3.00,
            firstMileRate: 3.00,
            tier1PerMile: 2.50,
            tier2BaseFare: 5.00,
            tier2FirstMile: 3.00,
            tier2PerMile: 1.80,
            tier3BaseFare: 5.00,
            tier3FirstMile: 3.00,
            tier3PerMile: 1.50,
            busySurgePct: 20,
            busySurgePercent: 20,
            localEstatePercent: 0.10,
            localMpvPercent: 0.40,
            localMinibus7Percent: 0.60,
            localMinibus8Percent: 0.80,
            localExecPercent: 0.80,
            petSurcharge: 6.00,
            viaStopFee: 5.00
        };

        async function syncLiveTariff() {
            try {
                const res = await fetch('/api/tariff');
                const data = await res.json();
                if (data && (data.tariff || data.settings || data.data)) {
                    const t = data.tariff || data.settings || data.data;
                    activeTariff = { ...activeTariff, ...t };
                    console.log('✅ Master Tariff Synchronized from DB:', activeTariff);
                }
            } catch(e) {
                console.warn('Using database master defaults');
            }
            calculateQuote();
        }

        function calculateQuote() {
            const pVal = (document.getElementById('custPickup') ? document.getElementById('custPickup').value.trim() : '');
            const dVal = (document.getElementById('custDropoff') ? document.getElementById('custDropoff').value.trim() : '');
            const paxEl = document.getElementById('custPax');
            const pax = paxEl ? parseInt(paxEl.value || '4', 10) : 4;
            let vehEl = document.getElementById('custVehicleClass');
            let vClass = vehEl ? vehEl.value : 'Saloon';
            const petVal = document.getElementById('custPet') ? document.getElementById('custPet').value : 'None';
            const viaCount = document.querySelectorAll('.cust-via-input').length;

            // Enforce minimum vehicle tier based on passenger capacity
            if (pax >= 8) vClass = 'Minibus_8';
            else if (pax === 7 && !['Minibus_7', 'Minibus_8'].includes(vClass)) vClass = 'Minibus_7';
            else if (pax >= 5 && !['MPV_6', 'Minibus_7', 'Minibus_8'].includes(vClass)) vClass = 'MPV_6';
            if (vehEl && vehEl.value !== vClass && pax >= 5) vehEl.value = vClass;

            // Check if dropoff is an airport
            let airportMatch = (typeof airportList !== 'undefined' && airportList) 
                ? airportList.find(a => (a.name && dVal.toLowerCase().includes(a.name.toLowerCase())) || (a.iataCode && dVal.toLowerCase().includes(a.iataCode.toLowerCase())))
                : null;

            let finalFare = 0.0;
            let miles = (typeof calculatedMiles !== 'undefined' && calculatedMiles > 0) ? calculatedMiles : 0;

            if (airportMatch) {
                let base = parseFloat(airportMatch.baseRate || 0);
                let mult = 1.0;
                if (vClass === 'Estate') mult += (activeTariff.airportEstatePercent || activeTariff.localEstatePercent || 0.10);
                else if (vClass === 'MPV_6') mult += (activeTariff.airportMpvPercent || activeTariff.localMpvPercent || 0.40);
                else if (vClass === 'Minibus_7') mult += (activeTariff.airportMinibus7Percent || activeTariff.localMinibus7Percent || 0.60);
                else if (vClass === 'Minibus_8') mult += (activeTariff.airportMinibus8Percent || activeTariff.localMinibus8Percent || 0.80);
                else if (vClass === 'Executive') mult += (activeTariff.airportExecPercent || activeTariff.localExecPercent || 0.80);

                finalFare = (base * mult) + (viaCount * (activeTariff.viaStopFee || 5.00));
                const detEl = document.getElementById('displayQuoteDetails');
                if (detEl) detEl.textContent = '✈️ Fixed Airport Rate: ' + airportMatch.name + ' (' + vClass + ')';
            } else {
                // Master Tariff calculation: Flag Drop (£7.00) + Miles
                const baseDrop = parseFloat(activeTariff.baseFlagDrop || activeTariff.tier1BaseFare || 7.00);
                const fMile = parseFloat(activeTariff.tier1FirstMile || activeTariff.firstMileRate || 3.00);
                const t1 = parseFloat(activeTariff.tier1PerMile || 2.50);
                const t2 = parseFloat(activeTariff.tier2PerMile || 1.80);
                const t3 = parseFloat(activeTariff.tier3PerMile || 1.50);

                let distCost = 0.0;
                if (miles > 0) {
                    if (miles <= 25) {
                        distCost = miles <= 1 ? (fMile * miles) : (fMile + ((miles - 1) * t1));
                    } else if (miles <= 50) {
                        distCost = fMile + (24 * t1) + ((miles - 25) * t2);
                    } else {
                        distCost = fMile + (24 * t1) + (25 * t2) + ((miles - 50) * t3);
                    }
                }

                let subtotal = baseDrop + distCost;

                // Busy Surge multiplier: 20% surge = * 1.20
                const surgePct = parseFloat(activeTariff.busySurgePct || activeTariff.busySurgePercent || 20);
                if (surgePct > 0) {
                    subtotal = subtotal * (1.0 + (surgePct / 100));
                }

                // Vehicle Category Uplift
                let vehMult = 1.0;
                if (vClass === 'Estate') vehMult += (activeTariff.localEstatePercent || 0.10);
                else if (vClass === 'MPV_6') vehMult += (activeTariff.localMpvPercent || 0.40);
                else if (vClass === 'Minibus_7') vehMult += (activeTariff.localMinibus7Percent || 0.60);
                else if (vClass === 'Minibus_8') vehMult += (activeTariff.localMinibus8Percent || 0.80);
                else if (vClass === 'Executive') vehMult += (activeTariff.localExecPercent || 0.80);

                finalFare = (subtotal * vehMult) + (viaCount * (activeTariff.viaStopFee || 5.00));
                const detEl = document.getElementById('displayQuoteDetails');
                if (detEl) {
                    detEl.textContent = (miles > 0 ? (miles.toFixed(1) + ' Miles | ') : 'Local Flag Drop | ') + pax + ' Pax (' + vClass + ')';
                }
            }

            if (petVal === 'Dog' || petVal === 'Cat') {
                finalFare += (activeTariff.petSurcharge || 6.00);
            }

            const quoteEl = document.getElementById('displayQuoteAmount');
            if (quoteEl) quoteEl.textContent = '£' + finalFare.toFixed(2);
            return finalFare;
        }
`;

// Replace syncLiveTariff and calculateQuote
html = html.replace(/async\s+function\s+syncLiveTariff[\s\S]*?return\s+finalFare;\s*\}/s, masterTariffCalculator);

fs.writeFileSync('public/book.html', html);
console.log('✅ Replaced tariff calculation block.');
