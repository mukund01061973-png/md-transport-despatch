const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');

const modals = [
  'modalTariff', 'modalAirports', 'modalEditAirport',
  'modalFleet', 'modalEditDriver',
  'modalPlots', 'modalCorporate', 'modalEditAccount',
  'modalAmendJob', 'modalReassignJob', 'modalCancelJob', 'modalTripHistory'
];

modals.forEach(m => {
  console.log(`Modal ID "${m}": ${html.includes(`id="${m}"`) || html.includes(`id='${m}'`) ? '✅ Present' : '❌ Missing'}`);
});
