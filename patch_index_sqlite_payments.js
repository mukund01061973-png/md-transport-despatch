const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const dbPaymentBlock = `
// ================= SQLITE PAYMENT GATEWAY SETTINGS =================
const Stripe = require('stripe');

function getActiveStripeConfig() {
  try {
    const row = db.prepare("SELECT * FROM payment_settings WHERE id = 1").get();
    if (row) return row;
  } catch(e) {}
  return { activeMode: 'simulation', publishableKey: '', secretKey: '', currency: 'gbp' };
}

app.get('/api/payment-settings', (req, res) => {
  try {
    const cfg = getActiveStripeConfig();
    res.json({ success: true, settings: cfg });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/payment-settings', (req, res) => {
  try {
    const { activeMode, publishableKey, secretKey, currency } = req.body;
    db.prepare(\`
      UPDATE payment_settings 
      SET activeMode = COALESCE(?, activeMode),
          publishableKey = COALESCE(?, publishableKey),
          secretKey = COALESCE(?, secretKey),
          currency = COALESCE(?, currency),
          updatedAt = CURRENT_TIMESTAMP
      WHERE id = 1
    \`).run(activeMode, publishableKey, secretKey, currency || 'gbp');

    console.log("💳 [PAYMENT SETTINGS UPDATED] Mode ->", activeMode);
    res.json({ success: true, message: "Payment settings saved successfully!" });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/stripe-config', (req, res) => {
  const cfg = getActiveStripeConfig();
  const isStripeActive = cfg.activeMode !== 'simulation' && cfg.publishableKey && cfg.secretKey;
  res.json({
    enabled: !!isStripeActive,
    mode: cfg.activeMode,
    publishableKey: isStripeActive ? cfg.publishableKey : null
  });
});

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, passengerName, pickup, dropoff } = req.body;
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid fare amount' });
    }

    const cfg = getActiveStripeConfig();
    const isLiveOrTest = cfg.activeMode !== 'simulation' && cfg.publishableKey && cfg.secretKey;

    if (!isLiveOrTest) {
      console.log(\`💳 [STRIPE SIMULATION] Pre-authorized £\${parsedAmount.toFixed(2)} for \${passengerName || 'Passenger'}\`);
      return res.json({
        simulation: true,
        clientSecret: 'sim_sec_' + Date.now(),
        amount: parsedAmount
      });
    }

    const stripeInstance = Stripe(cfg.secretKey.trim());
    const amountInPence = Math.round(parsedAmount * 100);

    const paymentIntent = await stripeInstance.paymentIntents.create({
      amount: amountInPence,
      currency: (cfg.currency || 'gbp').toLowerCase(),
      description: \`MD Taxi Bath - Booking for \${passengerName || 'Passenger'} (\${pickup} to \${dropoff})\`,
      metadata: {
        passengerName: passengerName || 'Customer',
        pickup: pickup || '',
        dropoff: dropoff || ''
      },
      automatic_payment_methods: { enabled: true }
    });

    res.json({
      simulation: false,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('❌ Stripe Payment Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
`;

if (!code.includes('// ================= SQLITE PAYMENT GATEWAY SETTINGS =================')) {
  const marker = 'app.use(express.json());';
  if (code.includes(marker)) {
    code = code.replace(marker, marker + '\n' + dbPaymentBlock);
    fs.writeFileSync('index.js', code);
    console.log('✅ SQLite payment engine injected into index.js!');
  }
} else {
  console.log('ℹ️ SQLite payment engine already registered in index.js');
}
