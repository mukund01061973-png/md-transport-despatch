const fs = require('fs');
const s = fs.readFileSync('index.js', 'utf8');

const events = [
  'admin_update_airport', 'admin_delete_airport',
  'admin_update_driver', 'admin_delete_driver', 'admin_toggle_driver_block',
  'admin_update_account', 'admin_delete_account',
  'admin_delete_plot', 'archive_booking'
];

events.forEach(evt => {
  console.log(`Event "${evt}": ${s.includes(evt) ? '✅ Exists' : '❌ Not Found'}`);
});
