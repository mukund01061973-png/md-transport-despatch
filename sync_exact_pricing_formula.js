const fs = require('fs');
let bookHtml = fs.readFileSync('public/book.html', 'utf8');

// Align distance rounding and quote calculations to match admin.html
const unifiedQuoteFunc = `
        function calculateQuote() {
            const dropoffEl = document.getElementById('custDropoff');
            const dropoff = dropoffEl ? dropoffEl.value.trim().toLowerCase() : '';
            const paxEl = document.getElementById('custPax');
            const pax = paxEl ? parseInt(paxEl.value || '4', 10) : 4;
            const vehEl = document.getElementById('custVehicleClass');
            let vClass = vehEl ? vehEl.value : 'Saloon';
            const petEl = document.getElementById('custPet');
            const petVal = petEl ? petEl.value : 'None';
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
            // Round to 1 decimal place matching admin.html
            const miles = (typeof calculatedMiles !== 'undefined' && calculatedMiles > 0) 
                ? Math.round(calculatedMiles * 10) / 10 
                : 0.0;

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
                if (detEl) detEl.textContent = '✈️ Fixed Airport: ' + airportMatch.name + ' (' + vClass + ')';
            } else {
                const baseDrop = parseFloat(activeTariff.baseFlagDrop || activeTariff.tier1BaseFare || 7.00);
                const fMile = parseFloat(activeTariff.tier1FirstMile || activeTariff.firstMileRate || 3.00);
                const t1 = parseFloat(activeTariff.tier1PerMile || 2.50);
                const t2 = parseFloat(activeTariff.tier2PerMile || 1.80);
                const t3 = parseFloat(activeTariff.tier3PerMile || 1.50);

                let distCost = 0.0;
                if (miles > 0) {
                    if (miles <= 1.0) {
                        distCost = fMile;
                    } else if (miles <= 25.0) {
                        distCost = fMile + ((miles - 1.0) * t1);
                    } else if (miles <= 50.0) {
                        distCost = fMile + (24.0 * t1) + ((miles - 25.0) * t2);
                    } else {
                        distCost = fMile + (24.0 * t1) + (25.0 * t2) + ((miles - 50.0) * t3);
                    }
                }

                let subtotal = baseDrop + distCost;
                const surgePct = parseFloat(activeTariff.busySurgePct || activeTariff.busySurgePercent || 20);
                if (surgePct > 0) {
                    subtotal = subtotal * (1.0 + (surgePct / 100));
                }

                let vehMult = 1.0;
                if (vClass === 'Estate') vehMult += (activeTariff.localEstatePercent || 0.10);
                else if (vClass === 'MPV_6') vehMult += (activeTariff.localMpvPercent || 0.40);
                else if (vClass === 'Minibus_7') vehMult += (activeTariff.localMinibus7Percent || 0.60);
                else if (vClass === 'Minibus_8') vehMult += (activeTariff.localMinibus8Percent || 0.80);
                else if (vClass === 'Executive') vehMult += (activeTariff.localExecPercent || 0.80);

                finalFare = (subtotal * vehMult) + (viaCount * (activeTariff.viaStopFee || 5.00));

                const detEl = document.getElementById('displayQuoteDetails');
                if (detEl) {
                    if (miles > 0) {
                        detEl.textContent = miles.toFixed(1) + ' Miles | ' + pax + ' Pax (' + vClass + ')';
                    } else {
                        detEl.textContent = 'Flag Drop Rate (£7.00 + 20% Surge) | ' + pax + ' Pax (' + vClass + ')';
                    }
                }
            }

            if (petVal === 'Dog' || petVal === 'Cat') {
                finalFare += (activeTariff.petSurcharge || 6.00);
            }

            const fareSpan = document.getElementById('displayFare');
            if (fareSpan) {
                fareSpan.textContent = finalFare.toFixed(2);
            }
            return finalFare;
        }
`;

bookHtml = bookHtml.replace(/function calculateQuote\(\)[\s\S]*?return finalFare;\s*\}/s, unifiedQuoteFunc);
fs.writeFileSync('public/book.html', bookHtml);
console.log('✅ Synchronized book.html pricing and mileage rounding!');
