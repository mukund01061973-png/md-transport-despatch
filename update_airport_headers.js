const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const oldHeader = /<thead[^>]*>[\s\S]*?airportsTableBody[\s\S]*?<\/tbody>/gi;
// Find airports table specifically
const aptIdx = html.indexOf('airportsTableBody');
if (aptIdx !== -1) {
  const tableStart = html.lastIndexOf('<table', aptIdx);
  const theadEnd = html.indexOf('<tbody', aptIdx);
  const newThead = `<table class="data-table">
    <thead>
      <tr>
        <th>Destination Airport</th>
        <th>Saloon (Base)</th>
        <th>Estate (+20%)</th>
        <th>MPV 6-Seat (+50%)</th>
        <th>Minibus 8-Seat (+85%)</th>
        <th>Executive (+100%)</th>
        <th style="text-align:center;">Actions</th>
      </tr>
    </thead>
    <tbody id="airportsTableBody"></tbody>`;
  
  html = html.slice(0, tableStart) + newThead + html.slice(theadEnd + '<tbody id="airportsTableBody"></tbody>'.length);
  fs.writeFileSync('public/admin.html', html);
  console.log('✅ Airport Table headers upgraded with all vehicle classes!');
} else {
  console.log('airportsTableBody not found');
}
