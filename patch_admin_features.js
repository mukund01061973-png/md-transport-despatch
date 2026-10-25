const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Postcode Sector unrestricted placeholder
html = html.replace(
  'placeholder="BA1 or BS1"',
  'placeholder="e.g. BA, BS, SN, GL, W1, SW..."'
);

// 2. Add Dispatcher Chat Button & Floating Panel in admin.html
const adminBodyEnd = '</body>';

const adminChatWidget = `
<!-- ================= DISPATCHER ⇄ DRIVER LIVE CHAT ================= -->
<div id="adminChatToggle" onclick="toggleAdminChat()" style="position:fixed; bottom:20px; right:20px; z-index:9999; background:#2563eb; color:#fff; width:52px; height:52px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.4); font-size:1.5rem; border:2px solid #60a5fa;">
    💬
    <span id="adminChatBadge" style="display:none; position:absolute; top:-3px; right:-3px; background:#ef4444; color:#fff; font-size:10px; font-weight:bold; border-radius:10px; padding:2px 6px;">0</span>
</div>

<div id="adminChatPanel" style="display:none; position:fixed; bottom:80px; right:20px; width:340px; height:450px; background:#0f172a; border:1px solid #334155; border-radius:12px; z-index:9999; flex-direction:column; box-shadow:0 10px 30px rgba(0,0,0,0.6); overflow:hidden;">
    <div style="background:#1e293b; padding:10px 14px; border-bottom:1px solid #334155; display:flex; justify-content:space-between; align-items:center;">
        <span style="font-weight:700; color:#38bdf8; font-size:0.95rem;">💬 Driver Comms</span>
        <select id="chatTargetDriver" style="background:#0f172a; color:#fff; border:1px solid #475569; padding:3px 6px; border-radius:6px; font-size:0.75rem;">
            <option value="ALL">Broadcast to All</option>
        </select>
        <button onclick="toggleAdminChat()" style="background:none; border:none; color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</button>
    </div>

    <div id="adminChatMessages" style="flex:1; overflow-y:auto; padding:12px; display:flex; flex-direction:column; gap:8px; background:#0b1120;">
        <div style="font-size:0.75rem; color:#64748b; text-align:center;">Channel ready. Send message to fleet.</div>
    </div>

    <form onsubmit="submitAdminChat(event)" style="padding:10px; background:#1e293b; display:flex; gap:6px; border-top:1px solid #334155;">
        <input type="text" id="adminChatInput" placeholder="Message to driver..." style="flex:1; background:#0f172a; border:1px solid #475569; color:#fff; padding:8px 10px; border-radius:6px; font-size:0.85rem;" autocomplete="off">
        <button type="submit" style="background:#2563eb; color:#fff; border:none; padding:8px 12px; border-radius:6px; cursor:pointer; font-weight:700;">Send</button>
    </form>
</div>

<script>
let isAdminChatOpen = false;
let adminUnreadCount = 0;

function toggleAdminChat() {
    isAdminChatOpen = !isAdminChatOpen;
    const panel = document.getElementById('adminChatPanel');
    panel.style.display = isAdminChatOpen ? 'flex' : 'none';
    if (isAdminChatOpen) {
        adminUnreadCount = 0;
        document.getElementById('adminChatBadge').style.display = 'none';
    }
}

function submitAdminChat(e) {
    e.preventDefault();
    const inp = document.getElementById('adminChatInput');
    const target = document.getElementById('chatTargetDriver').value;
    const txt = inp.value.trim();
    if (!txt) return;

    socket.emit('send_admin_message', { driverId: target, message: txt });
    inp.value = '';
}

if (typeof socket !== 'undefined') {
    socket.on('driver_message_received', (msg) => {
        const box = document.getElementById('adminChatMessages');
        if (!box) return;

        const isMe = msg.sender === 'dispatcher';
        const msgDiv = document.createElement('div');
        msgDiv.style.alignSelf = isMe ? 'flex-end' : 'flex-start';
        msgDiv.style.maxWidth = '80%';
        msgDiv.style.padding = '6px 10px';
        msgDiv.style.borderRadius = '8px';
        msgDiv.style.fontSize = '0.8rem';
        msgDiv.style.background = isMe ? '#2563eb' : '#334155';
        msgDiv.style.color = '#fff';

        const senderLabel = isMe ? 'Dispatcher' : (msg.driverName || msg.driverId || 'Driver');
        msgDiv.innerHTML = '<strong style="font-size:0.7rem; color:' + (isMe ? '#93c5fd' : '#fde047') + ';">' + senderLabel + ' (' + msg.time + ')</strong><br>' + msg.text;
        box.appendChild(msgDiv);
        box.scrollTop = box.scrollHeight;

        if (!isAdminChatOpen && !isMe) {
            adminUnreadCount++;
            const badge = document.getElementById('adminChatBadge');
            badge.textContent = adminUnreadCount;
            badge.style.display = 'block';
        }
    });
}
</script>
</body>`;

if (!html.includes('id="adminChatToggle"')) {
  html = html.replace(adminBodyEnd, adminChatWidget);
  fs.writeFileSync('public/admin.html', html);
  console.log('✅ public/admin.html updated with Postcode Freedom & Dispatcher Chat!');
} else {
  console.log('ℹ️ Admin chat already exists in admin.html');
}
