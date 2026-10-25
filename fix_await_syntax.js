const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// 1. Ensure submitCustomerBooking is explicitly async
html = html.replace(/function\s+submitCustomerBooking\s*\(/g, 'async function submitCustomerBooking(');

// 2. Ensure syncLiveTariff is explicitly async
html = html.replace(/function\s+syncLiveTariff\s*\(/g, 'async function syncLiveTariff(');

// 3. Ensure triggerAutoRouting is explicitly async
html = html.replace(/function\s+triggerAutoRouting\s*\(/g, 'async function triggerAutoRouting(');

// 4. Ensure handleAddressTypeAhead is explicitly async
html = html.replace(/function\s+handleAddressTypeAhead\s*\(/g, 'async function handleAddressTypeAhead(');

// 5. Check if any inner callback has await without async
html = html.replace(/debounceTimer\s*=\s*setTimeout\s*\(\s*function\s*\(\)\s*\{/g, 'debounceTimer = setTimeout(async function() {');
html = html.replace(/debounceTimer\s*=\s*setTimeout\s*\(\s*\(\)\s*=>\s*\{/g, 'debounceTimer = setTimeout(async () => {');

fs.writeFileSync('public/book.html', html);
console.log('✅ Applied async decorators across all awaiting functions in public/book.html');
