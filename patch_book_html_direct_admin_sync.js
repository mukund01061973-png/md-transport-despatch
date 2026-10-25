const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// Replace the routing and calculation logic inside Script Block 3
const synchronizedQuoteEngine = `
        async function syncLiveTariff() {
            try {
                const res = await fetch('/api/tariff');
                const data = await res.json();
                if (data && data.tariff) {
                    activeTariff = Object.assign({}, activeTariff, data.tariff);
                    console.log('✅ Synchronized with Database Master Tariff:', activeTariff);
                }
            } catch(e) {}
            calculateQuote();
        }
        syncLiveTariff();

        let debounceTimer = null;
        function triggerAutoRouting() {
            calculateQuote();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async function() {
                const pickup = document.getElementById('custPickup') ? document.getElementById('custPickup').value.trim() : '';
                const dropoff = document.getElementById('custDropoff') ? document.getElementById('custDropoff').value.trim() : '';
                if (!pickup || !dropoff) return;

                try {
                    // Use the exact OSRM distance endpoint
                    const res = await fetch('/api/calculate-distance?from=' + encodeURIComponent(pickup) + '&to=' + encodeURIComponent(dropoff));
                    const data = await res.json();
                    if (data && data.miles) {
                        calculatedMiles = parseFloat(data.miles);
                    }
                } catch(e) {
                    calculatedMiles = 2.1;
                }
                calculateQuote();
            }, 350);
        }

        function calculateQuote() {
            const dropoffEl = document.getElementById('custDropoff');
            const dropoff = dropoffEl ? dropoffEl.value.trim().toLowerCase() : '';
            const paxEl = document.getElementById('custPax');
            const pax = paxEl ? parseInt(paxEl.value || '4', 10) : 4;
            const vehEl = document.getElementById('custVehicleClass');
            let vClass = vehEl ? vehEl.value : 'Saloon';
            const petEl = document.getElementById('custPet');
            const petVal = petEl ? petEl.value : 'None';
            const hasPet = (petVal === 'Dog' || petVal === 'Cat');
            const viaCount = document.querySelectorAll('.cust-via-input').length;

            if (pax >= 8) vClass = 'Minibus_8';
            else if (pax === 7 && !['Minibus_7', 'Minibus_8'].includes(vClass)) vClass = 'Minibus_7';
            else if (pax >= 5 && !['MPV_6', 'Minibus_7', 'Minibus_8'].includes(vClass)) vClass = 'MPV_6';
            if (vehEl && pax >= 5 && vehEl.value !== vClass) vehEl.value = vClass;

            let airportMatch = (typeof airportList !== 'undefined' && Array.isArray(airportList)) 
                ? airportList.find(function(a) { 
                    return (a.name && dropoff.includes(a.name.toLowerCase())) || (a.iataCode && dropoff.includes(a.iataCode.toLowerCase())); 
                  }) 
                : null;

            let finalFare = 0.0;
            const miles = (typeof calculatedMiles !== 'undefined' && calculatedMiles > 0) ? calculatedMiles : 0.0;

            if (airportMatch) {
                let base = parseFloat(airportMatch.baseRate || 0);
                let mult = 1.0;
                if (vClass === 'Estate') mult += 0.10;
                else if (vClass === 'MPV_6') mult += 0.45;
                else if (vClass === 'Minibus_7' || vClass === 'Minibus_8') mult += 0.60;
                else if (vClass === 'Executive') mult += 0.70;
                finalFare = (base * mult) + (viaCount * 5.00);
                const detEl = document.getElementById('displayQuoteDetails');
                if (detEl) detEl.textContent = '✈️ Fixed Airport: ' + airportMatch.name + ' (' + vClass + ')';
            } else {
                // Exact formula from calculateProgressiveTariff in admin.html
                const baseFee = parseFloat(activeTariff.baseFlagDrop) || 5.00;
                const firstMileRate = parseFloat(activeTariff.firstMileRate) || 2.00;
                const tier1Rate = parseFloat(activeTariff.tier1PerMile) || 2.00;
                const tier2Rate = parseFloat(activeTariff.tier2PerMile) || 1.80;
                const tier3Rate = parseFloat(activeTariff.tier3PerMile) || 1.50;
                const viaStopFee = parseFloat(activeTariff.viaStopFee) || 5.00;
                const petFee = parseFloat(activeTariff.petSurcharge) || 6.00;
                const busySurgePct = parseFloat(activeTariff.busySurgePct) || 40.0;

                let distanceCost = 0.0;
                if (miles > 0) {
                    if (miles <= 25) {
                        distanceCost = (miles <= 1) ? firstMileRate * miles : firstMileRate + ((miles - 1) * tier1Rate);
                    } else if (miles <= 50) {
                        const tier1Total = firstMileRate + (24 * tier1Rate);
                        const tier2Miles = miles - 25;
                        distanceCost = tier1Total + (tier2Miles * tier2Rate);
                    } else {
                        const tier1Total = firstMileRate + (24 * tier1Rate);
                        const tier2Total = 25 * tier2Rate;
                        const tier3Miles = miles - 50;
                        distanceCost = tier1Total + tier2Total + (tier3Miles * tier3Rate);
                    }
                }

                let subtotal = baseFee + distanceCost;
                let multiplier = 1.0;
                if (vClass === 'Estate') multiplier += 0.10;
                else if (vClass === 'MPV_6') multiplier += 0.40;
                else if (vClass === 'Minibus_7' || vClass === 'Minibus_8') multiplier += 0.60;
                else if (vClass === 'Executive') multiplier += 0.70;

                let total = subtotal * multiplier;
                if (busySurgePct > 0) {
                    total = total * (1.0 + (busySurgePct / 100));
                }

                total += (viaCount * viaStopFee);
                if (hasPet) total += petFee;

                finalFare = total;

                const detEl = document.getElementById('displayQuoteDetails');
                if (detEl) {
                    if (miles > 0) {
                        detEl.textContent = miles.toFixed(1) + ' Miles | ' + pax + ' Pax (' + (vClass === 'Saloon' ? 'ANY' : vClass) + ')';
                    } else {
                        detEl.textContent = 'Standard Starting Rate';
                    }
                }
            }

            const fareSpan = document.getElementById('displayFare');
            if (fareSpan) {
                fareSpan.textContent = finalFare.toFixed(2);
            }
            return finalFare;
        }
`;

// Replace syncLiveTariff through calculateQuote
html = html.replace(/async function syncLiveTariff\(\)[\s\S]*?return finalFare;\s*\}/s, synchronizedQuoteEngine);
fs.writeFileSync('public/book.html', html);
console.log('✅ Integrated admin progressive tariff directly into book.html!');
