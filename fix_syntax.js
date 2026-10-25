const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Fix function definition parameter
code = code.replace("function getMergedDrivers('MD-BATH')", "function getMergedDrivers(tenant = 'MD-BATH')");

// Also check if any other definition was caught
code = code.replace(/function\s+getMergedDrivers\s*\(\s*['"]MD-BATH['"]\s*\)/g, "function getMergedDrivers(tenant = 'MD-BATH')");

fs.writeFileSync('index.js', code);
console.log('✅ Corrected getMergedDrivers parameter syntax!');
