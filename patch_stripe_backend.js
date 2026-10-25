const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

const stripeBackendCode = `
// ================= STRIPE PAYMENT GATEWAY =================
const Stripe = require('stripe');
const stripeSecret = process.env.STRIPE_SECRET_KEY || '';
const stripeClient = stripeSecret && !stripeSecret.includes('placeholder') ? Stripe(stripeSecret) : null;

app.get('/api/stripe-config', (req, res) => {
  const pubKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
  const isLiveOrTestReady = pubKey && !pubKey.includes('placeholder');
  res.json({
    enabled: !!isLiveOrTestReady,
    publishableKey: isLiveOrTestReady ? pubKey : null
  });
});

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'gbp', passengerName, pickup, dropoff } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ error: 'Invalid fare amount' });
    }

    if (!stripeClient) {
      // In simulation mode if keys are placeholders
      return res.json({
        simulation: true,
        clientSecret: 'simulated_secret_' + Date.now(),
        amount: parsedAmount
      });
    }

    // Stripe expects amounts in pence for GBP (£15.30 -> 1530)
    const amountInPence = Math.round(parsedAmount * 100);

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: amountInPence,
      currency: currency.toLowerCase(),
      description: \`MD Taxi Bath - Booking for \${passengerName || 'Passenger'} (\${pickup} to \${dropoff})\`,
      metadata: {
        passengerName: passengerName || 'Customer',
        pickup: pickup || '',
        dropoff: dropoff || ''
      },
      automatic_payment_methods: { enabled: true }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (err) {
    console.error('❌ Stripe PaymentIntent error:', err.message);
    res.status(500).json({ error: err.message });
  }
});
`;

if (!code.includes('/api/create-payment-intent')) {
  const marker = 'app.use(express.json());';
  if (code.includes(marker)) {
    code = code.replace(marker, marker + '\n' + stripeBackendCode);
    fs.writeFileSync('index.js', code);
    console.log('✅ Injected Stripe endpoints into index.js!');
  } else {
    console.warn('⚠️ Could not locate app.use(express.json()) in index.js');
  }
} else {
  console.log('ℹ️ Stripe endpoints already exist in index.js');
}
