const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

const verifiedBlock3 = `<script>
        const socket = io();
        let calculatedMiles = 0.0;
        let airportList = [];
        let trackedJobId = null;

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
                if (data && (data.tariff || data.data || data.settings)) {
                    const t = data.tariff || data.data || data.settings;
                    activeTariff = Object.assign({}, activeTariff, t);
                    console.log('✅ Master Tariff Synchronized:', activeTariff);
                }
            } catch(e) {
                console.warn('Baseline tariff defaults retained');
            }
            calculateQuote();
        }
        syncLiveTariff();

        socket.on('update_tariff', function(t) { 
            if (t) {
                activeTariff = Object.assign({}, activeTariff, t);
                calculateQuote();
            }
        });
        
        socket.on('update_airports', function(airports) { 
            airportList = airports || []; 
            calculateQuote(); 
        });

        function addViaInput() {
            const wrap = document.getElementById('viasWrap');
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.gap = '6px';
            div.innerHTML = '<input type="text" class="cust-via-input" placeholder="Stopover address..." oninput="triggerAutoRouting()">' +
                            '<button type="button" style="background:#ef4444; width:45px; padding:0; height:38px;" onclick="this.parentElement.remove(); triggerAutoRouting();">✕</button>';
            wrap.appendChild(div);
        }

        let debounceTimer = null;
        function triggerAutoRouting() {
            calculateQuote();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async function() {
                const pickup = document.getElementById('custPickup') ? document.getElementById('custPickup').value.trim() : '';
                const dropoff = document.getElementById('custDropoff') ? document.getElementById('custDropoff').value.trim() : '';
                if (!pickup || !dropoff) return;

                try {
                    const res = await fetch('/api/calculate-distance?from=' + encodeURIComponent(pickup) + '&to=' + encodeURIComponent(dropoff));
                    const data = await res.json();
                    if (data && data.miles && data.miles > 0) {
                        calculatedMiles = parseFloat(data.miles);
                    }
                } catch(e) {
                    calculatedMiles = 2.1;
                }
                calculateQuote();
            }, 300);
        }

        function onPaxChange() {
            const paxEl = document.getElementById('custPax');
            const vehEl = document.getElementById('custVehicleClass');
            if (!paxEl || !vehEl) return;
            const pax = parseInt(paxEl.value, 10);

            Array.from(vehEl.options).forEach(function(opt) { opt.disabled = false; });

            if (pax >= 8) {
                vehEl.value = 'Minibus_8';
                Array.from(vehEl.options).forEach(function(opt) {
                    if (opt.value !== 'Minibus_8') opt.disabled = true;
                });
            } else if (pax === 7) {
                if (vehEl.value !== 'Minibus_8') vehEl.value = 'Minibus_7';
                Array.from(vehEl.options).forEach(function(opt) {
                    if (!['Minibus_7', 'Minibus_8'].includes(opt.value)) opt.disabled = true;
                });
            } else if (pax >= 5) {
                if (!['MPV_6', 'Minibus_7', 'Minibus_8'].includes(vehEl.value)) vehEl.value = 'MPV_6';
                Array.from(vehEl.options).forEach(function(opt) {
                    if (['ANY', 'LOW_CAR', 'Saloon', 'Estate', 'Executive'].includes(opt.value)) opt.disabled = true;
                });
            }
            calculateQuote();
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
                    if (miles <= 25) {
                        distCost = miles <= 1 ? (fMile * miles) : (fMile + ((miles - 1) * t1));
                    } else if (miles <= 50) {
                        distCost = fMile + (24 * t1) + ((miles - 25) * t2);
                    } else {
                        distCost = fMile + (24 * t1) + (25 * t2) + ((miles - 50) * t3);
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

        function resetBookingForm() {
            const form = document.getElementById('onlineBookingForm');
            if (form) form.reset();
            const confView = document.getElementById('bookingConfirmationView');
            if (confView) confView.style.display = 'none';
            if (form) form.style.display = 'block';
            calculatedMiles = 0.0;
            const submitBtn = document.getElementById('btnSubmitBooking');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '⚡ Confirm & Dispatch Booking';
            }
            calculateQuote();
        }

        async function submitCustomerBooking(e) {
            e.preventDefault();
            const submitBtn = document.getElementById('btnSubmitBooking');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Dispatching to Fleet...';
            }

            const vias = Array.from(document.querySelectorAll('.cust-via-input')).map(function(i) { return i.value.trim(); }).filter(function(v) { return v !== ''; });
            const pax = parseInt(document.getElementById('custPax').value || '1', 10);
            let vClass = document.getElementById('custVehicleClass').value;
            
            if (pax >= 8) vClass = 'Minibus_8';
            else if (pax === 7) vClass = 'Minibus_7';
            else if (pax >= 5) vClass = 'MPV_6';
            else if (vClass === 'ANY') vClass = 'Saloon';

            const petVal = document.getElementById('custPet').value;
            const fareSpan = document.getElementById('displayFare');
            let fareAmount = 8.40;
            if (fareSpan) {
                const parsed = parseFloat(fareSpan.textContent.replace(/[^0-9.]/g, ''));
                if (!isNaN(parsed) && parsed > 0) fareAmount = parsed;
            }

            const payMethod = document.getElementById('custPayMethod').value;

            if (payMethod === 'Prepaid Online' && typeof stripeInstance !== 'undefined' && stripeInstance && typeof stripeCard !== 'undefined' && stripeCard) {
                if (submitBtn) submitBtn.textContent = '🔒 Authorizing Card Payment...';
                try {
                    const piRes = await fetch('/api/create-payment-intent', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            amount: fareAmount,
                            passengerName: document.getElementById('custName').value.trim(),
                            pickup: document.getElementById('custPickup').value.trim(),
                            dropoff: document.getElementById('custDropoff').value.trim()
                        })
                    });
                    const piData = await piRes.json();
                    if (!piData.clientSecret) throw new Error(piData.error || 'Payment initialization failed');

                    if (!piData.simulation) {
                        const confirmResult = await stripeInstance.confirmCardPayment(piData.clientSecret, {
                            payment_method: { card: stripeCard }
                        });
                        if (confirmResult.error) {
                            document.getElementById('stripeCardErrors').textContent = confirmResult.error.message;
                            if (submitBtn) {
                                submitBtn.disabled = false;
                                submitBtn.textContent = '⚡ Confirm & Dispatch Booking';
                            }
                            return;
                        }
                    }
                } catch(stripeErr) {
                    alert('Card payment error: ' + stripeErr.message);
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = '⚡ Confirm & Dispatch Booking';
                    }
                    return;
                }
            }

            const pMain = document.getElementById('custPickup').value.trim();
            const pBldg = (document.getElementById('custPickupBuilding') ? document.getElementById('custPickupBuilding').value.trim() : '');
            const pickupFull = pBldg ? (pBldg + ', ' + pMain) : pMain;

            const dMain = document.getElementById('custDropoff').value.trim();
            const dBldg = (document.getElementById('custDropoffBuilding') ? document.getElementById('custDropoffBuilding').value.trim() : '');
            const dropoffFull = dBldg ? (dBldg + ', ' + dMain) : dMain;

            const jobPayload = {
                passenger: document.getElementById('custName').value.trim(),
                phone: document.getElementById('custPhone').value.trim(),
                pickup: pickupFull,
                vias: vias,
                dropoff: dropoffFull,
                fare: fareAmount,
                vehicleClass: vClass,
                passengers: pax,
                paymentMethod: payMethod,
                petType: petVal,
                luggage: 2,
                notes: 'Web Self-Booking'
            };

            socket.emit('create_job', jobPayload);

            document.getElementById('onlineBookingForm').style.display = 'none';
            document.getElementById('bookingConfirmationView').style.display = 'block';
            document.getElementById('confPassenger').textContent = jobPayload.passenger;
            document.getElementById('confRoute').textContent = pickupFull + ' ➔ ' + dropoffFull;
            document.getElementById('confFare').textContent = '£' + fareAmount.toFixed(2);
            document.getElementById('confVehicle').textContent = vClass + ' (' + pax + ' Passengers)';
        }
</script>`;

const matches = html.match(/<script[\s\S]*?>([\s\S]*?)<\/script>/gi);
if (matches && matches[2]) {
    html = html.replace(matches[2], verifiedBlock3);
    fs.writeFileSync('public/book.html', html);
    console.log('✅ Replaced Block 3 with verified clean JavaScript!');
} else {
    console.error('Could not locate script block #3');
}
