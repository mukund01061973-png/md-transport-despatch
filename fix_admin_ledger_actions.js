const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Replace lines 1555-1562 cleanly
const brokenBlockRegex = /\$\{isActive\s*\?\s*`<button type="button" class="btn-purple"[\s\S]*?recallJob\('\$\{job\.id\}'\)[^`]*`\s*:\s*''\}/;

const solidActionButtons = `\${(isActive && job.assignedDriverId) ? \`<button type="button" class="btn-yellow" style="width:auto; padding:2px 8px; font-size:0.75rem; margin:1px; background:#d97706; color:#fff;" onclick="recallJob('\${job.id}')" title="Recall Job to Base">↩️ Recall</button>\` : ''}`;

if (brokenBlockRegex.test(html)) {
  html = html.replace(brokenBlockRegex, solidActionButtons);
  console.log("✅ Replaced broken action button block!");
} else {
  // Line-by-line fallback
  const lines = html.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("Reassign Driver") || lines[i].includes("Recall / Reactivate")) {
      lines[i] = "";
    }
    if (lines[i].includes("recallJob('${job.id}')") && lines[i].includes("title=")) {
      lines[i] = `                \${(isActive && job.assignedDriverId) ? \`<button type="button" class="btn-yellow" style="width:auto; padding:2px 8px; font-size:0.75rem; margin:1px; background:#d97706; color:#fff;" onclick="recallJob('\${job.id}')" title="Recall to Base">↩️ Recall</button>\` : ''}`;
    }
  }
  html = lines.join('\n');
  console.log("✅ Cleaned action lines via fallback!");
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ Admin ledger buttons sanitized!');
