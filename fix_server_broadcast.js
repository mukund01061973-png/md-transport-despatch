const fs = require('fs');
let s = fs.readFileSync('index.js', 'utf8');

// 1. After Airport Update
if (s.includes("console.log(`✅ Airport ${airportId} updated in dispatch")) {
  s = s.replace(
    "console.log(`✅ Airport ${airportId} updated in dispatch",
    "if (typeof sendAdminState === 'function') sendAdminState();\n      console.log(`✅ Airport ${airportId} updated in dispatch"
  );
}

// 2. After Driver Update
if (s.includes("console.log(`✅ Driver ${dId} updated in fleet database`);")) {
  s = s.replace(
    "console.log(`✅ Driver ${dId} updated in fleet database`);",
    "if (typeof sendAdminState === 'function') sendAdminState();\n      console.log(`✅ Driver ${dId} updated in fleet database`);"
  );
}

// 3. After Master Tariff Save
if (s.includes("io.emit('update_tariff', tariffData);")) {
  s = s.replace(
    "io.emit('update_tariff', tariffData);",
    "io.emit('update_tariff', tariffData);\n        if (typeof sendAdminState === 'function') sendAdminState();"
  );
}

fs.writeFileSync('index.js', s);
console.log('✅ Server broadcast wired: edits will refresh live on screen without page reload!');
