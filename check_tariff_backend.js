const fs = require('fs');
const s = fs.readFileSync('index.js', 'utf8');

const matches = s.match(/socket\.on\(['"][^'"]*tariff[^'"]*['"]/gi) || [];
console.log("Tariff socket listeners in index.js:", matches);

const plotMatches = s.match(/socket\.on\(['"][^'"]*plot[^'"]*['"]/gi) || [];
console.log("Plot socket listeners in index.js:", plotMatches);
