const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const targetSnippet = `    let rows = "";
    s.jobs.forEach(j => {
        const dt = j.createdAt ? new Date(j.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
        rows += \`
            <tr style="border-bottom:1px solid #e2e8f0; font-size:12px;">
                <td style="padding:6px 8px;">#\${j.id}</td>
                <td style="padding:6px 8px; color:#475569;">\${dt}</td>
                <td style="padding:6px 8px;">\${escapeHtml(j.pickup)} ➔ \${escapeHtml(j.dropoff)}</td>
                <td style="padding:6px 8px;">\${escapeHtml(j.paymentMethod || "Cash")}</td>
                <td style="padding:6px 8px; text-align:right; font-weight:bold;">£\${parseFloat(j.fare || 0).toFixed(2)}</td>
            </tr>
        \`;
    });`;

const updatedSnippet = `    let rows = "";
    s.jobs.forEach(j => {
        let dt = j.dateTime || "";
        if (!dt && j.completedAt) {
            try {
                const d = new Date(j.completedAt);
                dt = !isNaN(d) ? d.toLocaleDateString("en-GB") + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : j.completedAt;
            } catch(e) { dt = j.completedAt; }
        }
        if (!dt) dt = j.createdAt || "-";

        rows += \`
            <tr style="border-bottom:1px solid #e2e8f0; font-size:12px;">
                <td style="padding:6px 8px; font-weight:600;">#\${j.id}</td>
                <td style="padding:6px 8px; color:#475569;">\${dt}</td>
                <td style="padding:6px 8px;">\${escapeHtml(j.pickup || "")} ➔ \${escapeHtml(j.dropoff || "Local Drop")}</td>
                <td style="padding:6px 8px;">\${escapeHtml(j.paymentMethod || "Cash")}</td>
                <td style="padding:6px 8px; text-align:right; font-weight:bold;">£\${parseFloat(j.fare || 0).toFixed(2)}</td>
            </tr>
        \`;
    });

    const driverDisplayName = s.driverName || (s.driver && s.driver.name) || s.driverId || "Driver";
    const periodDisplay = s.period || (typeof getSelectedPeriodLabel === "function" ? getSelectedPeriodLabel() : "Selected Period");`;

if (html.includes(targetSnippet)) {
    html = html.replace(targetSnippet, updatedSnippet);
    // Also patch title and header meta-box to use driverDisplayName and periodDisplay
    html = html.replace('<title>Driver Settlement - ${s.driverName} (${s.driverId})</title>', '<title>Driver Settlement - ${driverDisplayName} (${s.driverId})</title>');
    html = html.replace('<div><strong>Driver:</strong> ${s.driverName} (${s.driverId})</div>', '<div><strong>Driver:</strong> ${driverDisplayName} (${s.driverId})</div>');
    html = html.replace('<div><strong>Period:</strong> ${s.period}</div>', '<div><strong>Period:</strong>${periodDisplay}</div>');

    fs.writeFileSync('public/admin.html', html);
    console.log("✅ Successfully patched printDriverStatementDocument in admin.html!");
} else {
    console.log("⚠️ Target snippet in admin.html differed slightly, running regex replacement...");
    html = html.replace(
        /let rows = "";[\s\S]*?s\.jobs\.forEach\(j => \{[\s\S]*?const dt = j\.createdAt[\s\S]*?\}\);\s*\}\);/,
        updatedSnippet + "\n    });"
    );
    html = html.replace('<div><strong>Driver:</strong> ${s.driverName} (${s.driverId})</div>', '<div><strong>Driver:</strong> ${s.driverName \vert{}\vert{} (s.driver && s.driver.name) \vert{}\vert{} s.driverId} (${s.driverId})</div>');
    html = html.replace('<div><strong>Period:</strong> ${s.period}</div>', '<div><strong>Period:</strong>${s.period || "Selected Period"}</div>');
    fs.writeFileSync('public/admin.html', html);
    console.log("✅ Replaced via regex.");
}

// Validate syntax
const scriptBlocks = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
let valid = true;
scriptBlocks.forEach((block, idx) => {
    try {
        new Function(block[1]);
    } catch (e) {
        valid = false;
        console.error(`Syntax error in block ${idx + 1}:`, e.message);
    }
});
if (valid) console.log("🚀 admin.html syntax is 100% CLEAN!");
