const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// Ensure renderBidBoard() is called when login completes
const targetSnippet = `myDriver = res.driver;`;

const replacementSnippet = `myDriver = res.driver;
            // Clear and re-render bid board freshly for this logged-in driver session
            activeBids = [];
            renderBidBoard();`;

if (html.includes(targetSnippet) && !html.includes('activeBids = [];\n            renderBidBoard();')) {
  html = html.replace(targetSnippet, replacementSnippet);
  console.log("✅ Patched driver.html login_result to clear and render bid board!");
}

// Ensure the bid board container refreshes whenever the appContainer is displayed
const showAppSnippet = `document.getElementById("appContainer").style.display = "block";`;
if (html.includes(showAppSnippet)) {
  html = html.replace(showAppSnippet, `document.getElementById("appContainer").style.display = "block";\n            renderBidBoard();`);
  console.log("✅ Added renderBidBoard() trigger when appContainer displays!");
}

fs.writeFileSync('public/driver.html', html);
console.log("🚀 public/driver.html updated cleanly!");
