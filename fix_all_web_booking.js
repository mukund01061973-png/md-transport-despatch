const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// 1. Fix syncLiveTariff so it is ASYNC and loads tariff immediately
const fixedSyncScript = `
        let activeTariff = {
            baseFlagDrop: 3.50,
            firstMileRate: 2.50,
            tier1BaseFare: 3.50,
            tier1FirstMile: 2.50,
            tier1PerMile: 2.50,
            tier2BaseFare: 5.00,
            tier2FirstMile: 3.00,
            tier2PerMile: 1.80,
            tier3BaseFare: 5.00,
            tier3FirstMile: 3.00,
            tier3PerMile: 1.50,
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
                if (data && (data.tariff || data.data || data.settings)) {
                    const t = data.tariff || data.data || data.settings;
                    activeTariff = { ...activeTariff, ...t };
                    console.log('✅ Master Tariff Synchronized:', activeTariff);
                    calculateQuote();
                }
            } catch(e) {
                console.warn('Using baseline master tariff defaults', e);
            }
        }
        syncLiveTariff();
`;

// Replace broken syncLiveTariff function
html = html.replace(/function syncLiveTariff\(\)[\s\S]*?syncLiveTariff\(\);/s, fixedSyncScript);

// 2. Fix onPaxChange to enforce passenger capacity & auto-select vehicle tier
const onPaxChangeScript = `
        function onPaxChange() {
            const paxEl = document.getElementById('custPax');
            const vehEl = document.getElementById('custVehicleClass');
            if (!paxEl || !vehEl) return;
            const pax = parseInt(paxEl.value, 10);

            // Reset all options
            Array.from(vehEl.options).forEach(opt => opt.disabled = false);

            if (pax >= 8) {
                vehEl.value = 'Minibus_8';
                Array.from(vehEl.options).forEach(opt => {
                    if (opt.value !== 'Minibus_8') opt.disabled = true;
                });
            } else if (pax === 7) {
                if (vehEl.value !== 'Minibus_8') vehEl.value = 'Minibus_7';
                Array.from(vehEl.options).forEach(opt => {
                    if (!['Minibus_7', 'Minibus_8'].includes(opt.value)) opt.disabled = true;
                });
            } else if (pax >= 5) {
                if (!['MPV_6', 'Minibus_7', 'Minibus_8'].includes(vehEl.value)) vehEl.value = 'MPV_6';
                Array.from(vehEl.options).forEach(opt => {
                    if (['ANY', 'LOW_CAR', 'Saloon', 'Estate', 'Executive'].includes(opt.value)) opt.disabled = true;
                });
            }
            calculateQuote();
        }
`;

if (html.includes('function onPaxChange()')) {
    html = html.replace(/function onPaxChange\(\)[\s\S]*?calculateQuote\(\);\s*\}/s, onPaxChangeScript);
} else {
    html = html.replace('function calculateQuote()', onPaxChangeScript + '\n        function calculateQuote()');
}

// 3. Fix calculateQuote so it calculates live fare correctly with master tariff
const cleanQuoteScript = `
        function calculateQuote() {
            const pVal = (document.getElementById('custPickup') ? document.getElementById('custPickup').value.trim() : '');
            const dVal = (document.getElementById('custDropoff') ? document.getElementById('custDropoff').value.trim() : '');
            const pax = parseInt(document.getElementById('custPax') ? document.getElementById('custPax').value : '4', 10);
            let vClass = document.getElementById('custVehicleClass') ? document.getElementById('custVehicleClass').value : 'Saloon';
            const petVal = document.getElementById('custPet') ? document.getElementById('custPet').value : 'None';
            const viaCount = document.querySelectorAll('.cust-via-input').length;

            if (pax >= 8) vClass = 'Minibus_8';
            else if (pax === 7 && !['Minibus_7', 'Minibus_8'].includes(vClass)) vClass = 'Minibus_7';
            else if (pax >= 5 && !['MPV_6', 'Minibus_7', 'Minibus_8'].includes(vClass)) vClass = 'MPV_6';

            // Check if dropoff is an airport
            let airportMatch = (typeof airportList !== 'undefined' && airportList) 
                ? airportList.find(a => (a.name && dVal.toLowerCase().includes(a.name.toLowerCase())) || (a.iataCode && dVal.toLowerCase().includes(a.iataCode.toLowerCase())))
                : null;

            let finalFare = 0.0;
            let miles = (typeof calculatedMiles !== 'undefined' && calculatedMiles > 0) ? calculatedMiles : 3.5;

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
                const fMile = activeTariff.tier1FirstMile || activeTariff.firstMileRate || 2.50;
                const t1 = activeTariff.tier1PerMile || 2.50;
                const t2 = activeTariff.tier2PerMile || 1.80;
                const t3 = activeTariff.tier3PerMile || 1.50;

                let distCost = 0.0;
                if (miles <= 25) {
                    distCost = miles <= 1 ? (fMile * miles) : (fMile + ((miles - 1) * t1));
                } else if (miles <= 50) {
                    distCost = fMile + (24 * t1) + ((miles - 25) * t2);
                } else {
                    distCost = fMile + (24 * t1) + (25 * t2) + ((miles - 50) * t3);
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
                const detEl = document.getElementById('displayQuoteDetails');
                if (detEl) detEl.textContent = miles.toFixed(1) + ' Miles | ' + pax + ' Passengers (' + vClass + ')';
            }

            if (petVal === 'Dog' || petVal === 'Cat') {
                finalFare += (activeTariff.petSurcharge || 6.00);
            }

            const quoteEl = document.getElementById('displayQuoteAmount');
            if (quoteEl) quoteEl.textContent = '£' + finalFare.toFixed(2);
            return finalFare;
        }
`;

html = html.replace(/function calculateQuote\(\)[\s\S]*?return finalFare;\s*\}/s, cleanQuoteScript);

// 4. Ensure selectSuggestion places full address into input and recalculates
const selectSuggestionScript = `
function selectSuggestion(inputId, boxId, encodedVal) {
    const val = decodeURIComponent(encodedVal);
    const input = document.getElementById(inputId);
    if (input) input.value = val;
    const box = document.getElementById(boxId);
    if (box) {
        box.style.display = 'none';
        box.innerHTML = '';
    }
    triggerAutoRouting();
}
`;
html = html.replace(/function selectSuggestion[\s\S]*?triggerAutoRouting\(\);\s*\}/s, selectSuggestionScript);

fs.writeFileSync('public/book.html', html);
console.log('✅ public/book.html cleaned and repaired!');
