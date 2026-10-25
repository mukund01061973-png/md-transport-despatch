const fs = require('fs');
const html = fs.readFileSync('public/admin.html', 'utf8');

console.log("File length:", html.length);
console.log("Includes leaflet.js in <head>:", html.includes('leaflet.js'));
console.log("Includes socket.io.js in <head>:", html.includes('/socket.io/socket.io.js'));

// Find script tags
const matches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
console.log("Total script tags found:", matches.length);
matches.forEach((m, idx) => {
  const isSrc = m[0].match(/src=["']([^"']+)["']/);
  if (isSrc) {
    console.log(`Script ${idx + 1}: External -> ${isSrc[1]}`);
  } else {
    console.log(`Script ${idx + 1}: Inline (length: ${m[1].length})`);
  }
});
