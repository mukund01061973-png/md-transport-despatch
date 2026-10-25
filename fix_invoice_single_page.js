const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Tighten styles inside printDriverInvoiceDocument
html = html.replace(
    'body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #0f172a; margin: 40px; background: #fff; }',
    'body { font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif; color: #0f172a; margin: 24px 30px; background: #fff; }'
);
html = html.replace(
    '.inv-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 25px; }',
    '.inv-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }'
);
html = html.replace(
    '.parties { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; line-height: 1.5; }',
    '.parties { display: flex; justify-content: space-between; margin-bottom: 18px; font-size: 12px; line-height: 1.4; }'
);
html = html.replace(
    'table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }',
    'table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }'
);

fs.writeFileSync('public/admin.html', html);
console.log("✅ Compacted Driver Tax Invoice margins for 1-page fit!");
