const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// 1. Inject Stripe.js script tag if absent
if (!html.includes('https://js.stripe.com/v3/')) {
  html = html.replace('<head>', '<head>\n    <script src="https://js.stripe.com/v3/"></script>');
}

// 2. Add Stripe Card Container right after Payment Method select
const stripeCardBoxHtml = `
            <!-- STRIPE CARD ELEMENTS CONTAINER -->
            <div id="stripeCardSection" style="display:none; margin: 12px 0 16px; padding: 14px; background: #0f172a; border: 1px solid #38bdf8; border-radius: 8px;">
                <label style="color: #38bdf8; font-weight: 600; font-size: 0.85rem; margin-bottom: 8px; display: block;">
                    🔒 Secure Card Details (Pre-pay Online)
                </label>
                <div id="stripeCardElement" style="padding: 10px; background: #1e293b; border-radius: 6px; border: 1px solid #334155; margin-bottom: 8px;"></div>
                <div id="stripeCardErrors" role="alert" style="color: #f87171; font-size: 0.8rem;"></div>
                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 4px;">
                    💳 256-bit encrypted via Stripe. Driver will see <b>PREPAID</b>.
                </div>
            </div>
`;

if (!html.includes('id="stripeCardSection"')) {
  const payMethodMarker = '</select>';
  const payMethodIdx = html.indexOf('id="custPayMethod"');
  if (payMethodIdx !== -1) {
    const insertIdx = html.indexOf(payMethodMarker, payMethodIdx) + payMethodMarker.length;
    html = html.substring(0, insertIdx) + '\n' + stripeCardBoxHtml + html.substring(insertIdx);
  }
}

// 3. Inject Stripe UI listener and handler
const stripeFrontendScript = `
<script id="stripeClientIntegration">
let stripeInstance = null;
let stripeElements = null;
let stripeCard = null;
let stripeConfigLoaded = false;

async function initStripeIfPrepaid() {
  const method = document.getElementById('custPayMethod').value;
  const section = document.getElementById('stripeCardSection');
  if (!section) return;

  if (method === 'Prepaid Online') {
    section.style.display = 'block';
    if (!stripeConfigLoaded) {
      try {
        const res = await fetch('/api/stripe-config');
        const data = await res.json();
        if (data && data.enabled && data.publishableKey) {
          stripeInstance = Stripe(data.publishableKey);
          stripeElements = stripeInstance.elements();
          stripeCard = stripeElements.create('card', {
            style: {
              base: {
                color: '#f8fafc',
                fontFamily: 'system-ui, sans-serif',
                fontSize: '15px',
                '::placeholder': { color: '#64748b' }
              },
              invalid: { color: '#f87171' }
            }
          });
          stripeCard.mount('#stripeCardElement');
          stripeCard.on('change', (e) => {
            const errDiv = document.getElementById('stripeCardErrors');
            errDiv.textContent = e.error ? e.error.message : '';
          });
        } else {
          // Simulation / Dev sandbox mode notice
          document.getElementById('stripeCardElement').innerHTML =
            '<div style="color:#38bdf8; font-size:0.85rem; padding:4px;">⚡ Stripe Simulation Active: Card will be pre-authorized automatically on confirm.</div>';
        }
        stripeConfigLoaded = true;
      } catch(e) {
        console.warn('Stripe init fallback:', e);
      }
    }
  } else {
    section.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const paySelect = document.getElementById('custPayMethod');
  if (paySelect) {
    paySelect.addEventListener('change', initStripeIfPrepaid);
  }
});
</script>
`;

if (!html.includes('id="stripeClientIntegration"')) {
  html = html.replace('</body>', stripeFrontendScript + '\n</body>');
}

// 4. Update the submit button handler to authorize the payment intent if Prepaid Online
const submitHook = `
            const payMethod = document.getElementById('custPayMethod').value;
            const btn = document.getElementById('btnSubmitBooking');

            if (payMethod === 'Prepaid Online' && stripeInstance && stripeCard) {
                btn.disabled = true;
                btn.textContent = '🔒 Authorizing Card Payment...';
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
                            btn.disabled = false;
                            btn.textContent = '⚡ Confirm & Dispatch Booking';
                            return;
                        }
                    }
                } catch(stripeErr) {
                    alert('Card payment error: ' + stripeErr.message);
                    btn.disabled = false;
                    btn.textContent = '⚡ Confirm & Dispatch Booking';
                    return;
                }
            }
`;

if (!html.includes('Authorizing Card Payment...') && html.includes("socket.emit('create_job', {")) {
  html = html.replace("socket.emit('create_job', {", submitHook + "\n            socket.emit('create_job', {");
}

fs.writeFileSync('public/book.html', html);
console.log('🎯 Stripe Elements and checkout flow injected into public/book.html!');
