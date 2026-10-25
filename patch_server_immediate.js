const fs = require('fs');
let s = fs.readFileSync('index.js', 'utf8');

// Ensure that right after io.on('connection', (socket) => {
// the server executes sendAdminState(socket) immediately.
const target = "io.on('connection', (socket) => {";
const targetDouble = 'io.on("connection", (socket) => {';

const replacement = `io.on('connection', (socket) => {
  console.log('⚡ Client connected to socket:', socket.id);
  
  // Immediately send initial state to this client
  try {
    const jobs = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
    const drivers = db.prepare('SELECT * FROM drivers').all();
    const airports = db.prepare('SELECT * FROM airport_matrix').all();
    const plots = db.prepare('SELECT * FROM plots').all();
    let accounts = [];
    try { accounts = db.prepare('SELECT * FROM corporate_accounts').all(); } catch(e) {
      try { accounts = db.prepare('SELECT * FROM accounts').all(); } catch(e2) {}
    }
    const tariff = typeof getTariff === 'function' ? getTariff('MD-BATH') : {};

    socket.emit('update_jobs_list', jobs);
    socket.emit('update_driver_list', drivers);
    socket.emit('update_airports', airports);
    socket.emit('update_plots', plots);
    socket.emit('update_accounts', accounts);
    socket.emit('update_tariff', tariff);

    console.log(\`📡 Auto-delivered to client: \${jobs.length} jobs, \${drivers.length} drivers, \${airports.length} airports, \${plots.length} plots, \${accounts.length} accounts\`);
  } catch (err) {
    console.error('Error auto-delivering admin state:', err.message);
  }
`;

if (s.includes(target)) {
  s = s.replace(target, replacement);
  fs.writeFileSync('index.js', s);
  console.log('✅ Server patched to auto-deliver state on connection!');
} else if (s.includes(targetDouble)) {
  s = s.replace(targetDouble, replacement);
  fs.writeFileSync('index.js', s);
  console.log('✅ Server patched to auto-deliver state on connection!');
} else {
  console.log('Could not find io.on connection pattern directly; see Step 1 output.');
}
