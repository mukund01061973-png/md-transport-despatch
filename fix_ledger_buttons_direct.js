const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// Replace renderJobsTable with rock-solid event binding and descending sort
const targetStart = html.indexOf('function renderJobsTable()');
const targetEnd = html.indexOf('function escapeHtml', targetStart);

if (targetStart !== -1 && targetEnd !== -1) {
  const newRenderFunc = `function renderJobsTable() {
            if (Array.isArray(allJobs)) {
                // Strictly enforce newest-first (descending by job ID)
                allJobs.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
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

                tr.innerHTML = \`
                    <td><strong>#\${job.id}</strong><br><span style="font-size:0.75rem; color:#94a3b8;">\${escapeHtml(job.createdAt || '-')}</span></td>
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
                    <td style="white-space:nowrap;" class="job-actions-cell"></td>
                \`;

                const tdActions = tr.querySelector('.job-actions-cell');

                // 1. Amend Button (Always available)
                const btnAmend = document.createElement('button');
                btnAmend.type = 'button';
                btnAmend.className = 'btn-blue';
                btnAmend.style.cssText = 'width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; cursor:pointer;';
                btnAmend.textContent = '✏️ Amend';
                btnAmend.onclick = () => window.openAmendModal(job.id);
                tdActions.appendChild(btnAmend);

                if (isActive) {
                    // 2. Reassign Button
                    const btnReassign = document.createElement('button');
                    btnReassign.type = 'button';
                    btnReassign.className = 'btn-purple';
                    btnReassign.style.cssText = 'width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; cursor:pointer;';
                    btnReassign.textContent = '🔄 Reassign';
                    btnReassign.onclick = () => window.openReassignModal(job.id);
                    tdActions.appendChild(btnReassign);

                    // 3. Cancel Button
                    const btnCancel = document.createElement('button');
                    btnCancel.type = 'button';
                    btnCancel.className = 'btn-red';
                    btnCancel.style.cssText = 'width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; cursor:pointer;';
                    btnCancel.textContent = '✕ Cancel';
                    btnCancel.onclick = () => window.openCancelModal(job.id);
                    tdActions.appendChild(btnCancel);
                } else {
                    // 4. Recall Button (For Cancelled or Completed)
                    const btnRecall = document.createElement('button');
                    btnRecall.type = 'button';
                    btnRecall.className = 'btn-green';
                    btnRecall.style.cssText = 'width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; background:#10b981; cursor:pointer;';
                    btnRecall.textContent = '↩️ Recall';
                    btnRecall.onclick = () => window.recallJob(job.id);
                    tdActions.appendChild(btnRecall);
                }

                // 5. Trip History Button (Always available)
                const btnHist = document.createElement('button');
                btnHist.type = 'button';
                btnHist.className = 'btn-gray';
                btnHist.style.cssText = 'width:auto; padding:2px 6px; font-size:0.75rem; margin:1px; background:#475569; cursor:pointer;';
                btnHist.textContent = '📜 History';
                btnHist.onclick = () => window.openTripHistoryModal(job.id);
                tdActions.appendChild(btnHist);

                tbody.appendChild(tr);
            });
        }

        `;

  html = html.slice(0, targetStart) + newRenderFunc + html.slice(targetEnd);
  fs.writeFileSync('public/admin.html', html);
  console.log('✅ renderJobsTable successfully replaced with direct event listeners and strict descending order!');
} else {
  console.log('❌ Could not find function boundaries');
}
