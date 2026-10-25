const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// 1. Add onchange="onPaxChange()" to custPax
html = html.replace('<select id="custPax">', '<select id="custPax" onchange="onPaxChange()">');
html = html.replace(/<select id="custPax"[^>]*>/, '<select id="custPax" onchange="onPaxChange()">');

// 2. Insert onPaxChange and update calculateQuote
const paxLogicScript = `
        function onPaxChange() {
            const pax = parseInt(document.getElementById('custPax').value, 10);
            const vehSelect = document.getElementById('custVehicleClass');
            
            // Re-enable all options first
            Array.from(vehSelect.options).forEach(opt => opt.disabled = false);

            if (pax >= 8) {
                vehSelect.value = 'Minibus_8';
                // Disable smaller vehicles
                Array.from(vehSelect.options).forEach(opt => {
                    if (['ANY', 'LOW_CAR', 'Saloon', 'Estate', 'MPV_6', 'Minibus_7', 'Executive'].includes(opt.value)) {
                        opt.disabled = true;
                    }
                });
            } else if (pax === 7) {
                if (vehSelect.value !== 'Minibus_8') {
                    vehSelect.value = 'Minibus_7';
                }
                // Disable 1-6 seaters
                Array.from(vehSelect.options).forEach(opt => {
                    if (['ANY', 'LOW_CAR', 'Saloon', 'Estate', 'MPV_6', 'Executive'].includes(opt.value)) {
                        opt.disabled = true;
                    }
                });
            } else if (pax >= 5) {
                if (!['MPV_6', 'Minibus_7', 'Minibus_8'].includes(vehSelect.value)) {
                    vehSelect.value = 'MPV_6';
                }
                // Disable 1-4 seaters
                Array.from(vehSelect.options).forEach(opt => {
                    if (['ANY', 'LOW_CAR', 'Saloon', 'Estate', 'Executive'].includes(opt.value)) {
                        opt.disabled = true;
                    }
                });
            }
            calculateQuote();
        }
`;

// Insert onPaxChange before calculateQuote
if (!html.includes('function onPaxChange()')) {
    html = html.replace('function calculateQuote()', paxLogicScript + '\n        function calculateQuote()');
}

// 3. Ensure calculateQuote uses master tariff uplifts correctly:
const updatedCalcQuote = `function calculateQuote() {
            const dropoff = document.getElementById('custDropoff').value.trim().toLowerCase();
            const pax = parseInt(document.getElementById('custPax').value || '4', 10);
            let vClass = document.getElementById('custVehicleClass').value;
            
            // Enforce minimum vehicle requirement based on passenger count
            if (pax >= 8 && vClass !== 'Minibus_8') vClass = 'Minibus_8';
            else if (pax === 7 && !['Minibus_7', 'Minibus_8'].includes(vClass)) vClass = 'Minibus_7';
            else if (pax >= 5 && !['MPV_6', 'Minibus_7', 'Minibus_8'].includes(vClass)) vClass = 'MPV_6';

            const viaCount = document.querySelectorAll('.cust-via-input').length;
            let airportMatch = (typeof airportList !== 'undefined') ? airportList.find(a => (a.name && dropoff.includes(a.name.toLowerCase())) || (a.iataCode && dropoff.includes(a.iataCode.toLowerCase()))) : null;
            let finalFare = 0.0;

            if (airportMatch) {
                let base = parseFloat(airportMatch.baseRate || 0);
                let mult = 1.0;
                if (vClass === 'Estate') mult += (activeTariff.airportEstatePercent || 0.10);
                else if (vClass === 'MPV_6') mult += (activeTariff.airportMpvPercent || activeTariff.localMpvPercent || 0.40);
                else if (vClass === 'Minibus_7') mult += (activeTariff.airportMinibus7Percent || activeTariff.localMinibus7Percent || 0.60);
                else if (vClass === 'Minibus_8') mult += (activeTariff.airportMinibus8Percent || activeTariff.localMinibus8Percent || 0.80);
                else if (vClass === 'Executive') mult += (activeTariff.airportExecPercent || 0.80);

                finalFare = (base * mult) + (viaCount * (activeTariff.viaStopFee || 5.00));
                document.getElementById('displayQuoteDetails').textContent = \`Fixed Airport: \${airportMatch.name} (\${vClass})\`;
            } else if (calculatedMiles > 0) {
                let distCost = 0.0;
                const fMile = activeTariff.tier1FirstMile || activeTariff.firstMileRate || 3.00;
                const t1 = activeTariff.tier1PerMile || 2.50;
                const t2 = activeTariff.tier2PerMile || 1.80;
                const t3 = activeTariff.tier3PerMile || 1.50;

                if (calculatedMiles <= 25) {
                    distCost = calculatedMiles <= 1 ? (fMile * calculatedMiles) : (fMile + ((calculatedMiles - 1) * t1));
                } else if (calculatedMiles <= 50) {
                    distCost = fMile + (24 * t1) + ((calculatedMiles - 25) * t2);
                } else {
                    distCost = fMile + (24 * t1) + (25 * t2) + ((calculatedMiles - 50) * t3);
                }

                let baseDrop = activeTariff.tier1BaseFare || activeTariff.baseFlagDrop || 3.50;
                let subtotal = baseDrop + distCost;
                let mult = 1.0;

                if (vClass === 'Estate') mult += (activeTariff.localEstatePercent || 0.10);
                else if (vClass === 'MPV_6') mult += (activeTariff.localMpvPercent || 0.40);
                else if (vClass === 'Minibus_7') mult += (activeTariff.localMinibus7Percent || 0.60);
                else if (vClass === 'Minibus_8') mult += (activeTariff.localMinibus8Percent || 0.80);
                else if (vClass === 'Executive') mult += (activeTariff.localExecPercent || 0.80);

                finalFare = (subtotal * mult) + (viaCount * (activeTariff.viaStopFee || 5.00));
                document.getElementById('displayQuoteDetails').textContent = \`\${calculatedMiles} Mi | \${pax} Pax (\${vClass})\`;
            }

            // Pet surcharge
            const petVal = document.getElementById('custPet').value;
            if (petVal === 'Dog' || petVal === 'Cat') {
                finalFare += (activeTariff.petSurcharge || 6.00);
            }

            const quoteEl = document.getElementById('displayQuoteAmount');
            if (quoteEl) quoteEl.textContent = '£' + finalFare.toFixed(2);
            return finalFare;
        }`;

// Replace calculateQuote body
html = html.replace(/function calculateQuote\(\)[\s\S]*?return finalFare;\s*\}/s, updatedCalcQuote);

fs.writeFileSync('public/book.html', html);
console.log('✅ book.html updated with dynamic passenger capacity and master tariff pricing!');
