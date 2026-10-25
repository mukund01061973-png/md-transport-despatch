const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Refactor renderJobsTable to sort properly by timestamp/sequence and handle the 'cancelled' filter
const targetFuncStart = "function renderJobsTable() {";
const startIdx = html.indexOf(targetFuncStart);
const endIdx = html.indexOf("function escapeHtml(", startIdx);

if (startIdx !== -1 && endIdx !== -1) {
  const newRenderFunc = `function renderJobsTable() {
            if (Array.isArray(allJobs)) {
                allJobs.sort((a, b) => {
                    // Try parsing full ISO/standard date strings first
                    const tA = a.createdAt ? Date.parse(a.createdAt) : NaN;
                    const tB = b.createdAt ? Date.parse(b.createdAt) : NaN;
                    if (!isNaN(tA) && !isNaN(tB) && tA !== tB) {
                        return tB - tA; // Newest date first
                    }

                    // Numeric ID extraction fallback if rowids or numeric sequences exist
                    const numA = parseInt(String(a.rowid || a.id || '').replace(/\\D/g, ''), 10);
                    const numB = parseInt(String(b.rowid || b.id || '').replace(/\\D/g, ''), 10);
                    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
                        return numB - numA;
                    }
                    return 0;
                });
            }

            const tbody = document.getElementById('jobsTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            const filtered = (allJobs || []).filter(j => {
                const s = String(j.status || '').toUpperCase();
                if (currentFilter === 'active') return ['ACCEPTED', 'ARRIVED', 'POB', 'PENDING'].includes(s);
                if (currentFilter === 'completed') return s === 'COMPLETED';
                if (currentFilter === 'cancelled') return s === 'CANCELLED';
                return true;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#64748b; padding:16px;">No bookings found.</td></tr>';
                return;
            }

            filtered.forEach(job => {
                const tr = document.createElement('tr');
                const st = String(job.status || 'Pending').toUpperCase();
                const isActive = (st !== 'COMPLETED' && st !== 'CANCELLED');
                const statusColor = st === 'COMPLETED' ? '#4ade80' : 
                                    st === 'CANCELLED' ? '#ef4444' : 
                                    st === 'POB' ? '#f59e0b' : '#38bdf8';

                let driverBadge = '<span style="color:#64748b;">Unassigned</span>';
                if (job.assignedDriverId) {
                    driverBadge = \`<span style="color:#38bdf8; font-weight:bold;">\${escapeHtml(job.assignedDriverId)}</span>\`;
                }

                // Format display date: show date + time if available, otherwise show clean time
                let displayTime = job.createdAt || '-';
                if (job.createdAt && job.createdAt.includes('T')) {
                    const d = new Date(job.createdAt);
                    if (!isNaN(d.getTime())) {
                        const day = String(d.getDate()).padStart(2, '0');
                        const mon = String(d.getMonth() + 1).padStart(2, '0');
                        const yr = d.getFullYear();
                        const hr = String(d.getHours()).padStart(2, '0');
                        const min = String(d.getMinutes()).padStart(2, '0');
                        displayTime = \`\${day}/\${mon}/\${yr} \${hr}:\${min}\`;
                    }
                }

                tr.innerHTML = \`
                    <td>
                        <strong>#\${job.id}</strong><br>
                        <span style="font-size:0.75rem; color:#94a3b8; white-space:nowrap;">📅 \${escapeHtml(displayTime)}</span>
                    </td>
                    <td>
                        <strong>\${escapeHtml(job.passenger || 'Guest')}</strong><br>
                        <span style="font-size:0.75rem; color:#cbd5e1;">\${escapeHtml(job.phone || '-')}</span>
                        \${job.paymentMethod ? \`<span style="display:inline-block; margin-left:4px; font-size:0.7rem; background:#334155; padding:1px 5px; border-radius:3px;">\${escapeHtml(job.paymentMethod)}</span>\` : ''}
                    </td>
                    <td style="font-size:0.85rem;">
                        <div>📍 \${escapeHtml(job.pickup || '-')}</div>
                        <div style="color:#94a3b8;">🏁 \${escapeHtml(job.dropoff || '-')}</div>
                    </td>
                    <td>\${driverBadge}</td>
                    <td><strong style="color:#34d399;">£\${(parseFloat(job.fare) || 0).toFixed(2)}</strong></td>
                    <td><span style="display:inline-block; padding:2px 8px; border-radius:12px; font-size:0.75rem; font-weight:bold; background:#1e293b; color:\${statusColor}; border:1px solid \${statusColor};">\${escapeHtml(job.status || 'Pending')}</span></td>
                    <td style="white-space:nowrap;">
                        <button type="button" class="btn-blue" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px;" onclick="openAmendModal('\${job.id}')" title="Amend details">✏️ Amend</button>
                        \${isActive ? \`<button type="button" class="btn-purple" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px;" onclick="openReassignModal('\${job.id}')" title="Reassign Driver">🔄 Reassign</button>\` : ''}
                        \${isActive ? \`<button type="button" class="btn-red" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px;" onclick="openCancelModal('\${job.id}')" title="Cancel Booking">✕ Cancel</button>\` : ''}
                        \${!isActive ? \`<button type="button" class="btn-green" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; background:#10b981;" onclick="recallJob('\${job.id}')" title="Recall / Reactivate Booking">↩️ Recall</button>\` : ''}
                        <button type="button" class="btn-gray" style="width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; background:#475569;" onclick="openTripHistoryModal('\${job.id}')" title="Audit Trail">📜 History</button>
                    </td>
                \`;
                tbody.appendChild(tr);
            });
        }

        `;

  html = html.slice(0, startIdx) + newRenderFunc + html.slice(endIdx);
  fs.writeFileSync('public/admin.html', html);
  console.log('✅ renderJobsTable successfully updated with proper date rendering, strict descending order, and dedicated Cancelled filter!');
} else {
  console.log('❌ Could not locate function bounds for renderJobsTable');
}
