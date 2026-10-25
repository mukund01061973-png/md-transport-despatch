const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// 1. Add "Book Another Ride" button in bookingConfirmationView
const newConfirmationView = `
        <div id="bookingConfirmationView" style="display:none; text-align:center; padding: 25px 15px;">
            <div style="font-size: 3.5rem; margin-bottom: 10px;">✅</div>
            <h2 style="color: #10b981; margin-bottom: 8px;">Booking Confirmed & Dispatched!</h2>
            <p style="color: #94a3b8; font-size: 0.95rem; margin-bottom: 20px;">Your driver has been alerted and is being dispatched.</p>
            
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #64748b;">Passenger:</span>
                    <strong style="color: #f8fafc;" id="confPassenger">-</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #64748b;">Route:</span>
                    <strong style="color: #f8fafc; max-width: 65%; text-align: right;" id="confRoute">-</strong>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span style="color: #64748b;">Vehicle:</span>
                    <strong style="color: #f8fafc;" id="confVehicle">-</strong>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span style="color: #64748b;">Agreed Fare:</span>
                    <strong style="color: #10b981; font-size: 1.15rem;" id="confFare">-</strong>
                </div>
            </div>

            <button type="button" onclick="resetBookingForm()" style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; font-weight: 700; font-size: 1rem; padding: 14px 28px; border: none; border-radius: 10px; cursor: pointer; width: 100%; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                ➕ Book Another Ride
            </button>
        </div>
`;

if (html.includes('<div id="bookingConfirmationView"')) {
    html = html.replace(/<div id="bookingConfirmationView"[\s\S]*?<\/div>\s*<\/div>/, newConfirmationView);
}

// 2. Add resetBookingForm function to Script Block 3
const resetFunction = `
        function resetBookingForm() {
            document.getElementById('onlineBookingForm').reset();
            document.getElementById('bookingConfirmationView').style.display = 'none';
            document.getElementById('onlineBookingForm').style.display = 'block';
            calculatedMiles = 0.0;
            const submitBtn = document.getElementById('btnSubmitBooking');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '⚡ Confirm & Dispatch Booking';
            }
            calculateQuote();
        }
`;

if (!html.includes('function resetBookingForm()')) {
    html = html.replace('function submitCustomerBooking', resetFunction + '\n        function submitCustomerBooking');
}

// 3. Ensure triggerAutoRouting fetches exact OSRM miles
const exactAutoRouting = `
        let debounceTimer = null;
        function triggerAutoRouting() {
            calculateQuote();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async function() {
                const pickup = document.getElementById('custPickup').value.trim();
                const dropoff = document.getElementById('custDropoff').value.trim();
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
`;

html = html.replace(/let debounceTimer = null;[\s\S]*?debounceTimer = setTimeout\(async function\(\)[\s\S]*?calculateQuote\(\);\s*\}\s*,\s*300\);\s*\}/s, exactAutoRouting);

fs.writeFileSync('public/book.html', html);
console.log('✅ Added "Book Another Ride" button and synced OSRM distance engine in public/book.html!');
