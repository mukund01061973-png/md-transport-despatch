const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

const modalFunctionsCode = `
// === GLOBAL MODAL CONTROLLERS ===
window.openAppModal = function(id) {
    const el = document.getElementById(id);
    if (el) {
        el.style.display = 'flex';
    } else {
        console.error('Modal element not found:', id);
    }
};

window.closeAppModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
};

window.closeOverlayModal = function(event, id) {
    if (event.target && event.target.id === id) {
        window.closeAppModal(id);
    }
};
`;

if (!html.includes('window.openAppModal = function')) {
  // Inject right before the closing </head> or at top of primary script
  const scriptIdx = html.indexOf('<script>');
  if (scriptIdx !== -1) {
    html = html.slice(0, scriptIdx + 8) + '\n' + modalFunctionsCode + '\n' + html.slice(scriptIdx + 8);
    fs.writeFileSync('public/admin.html', html);
    console.log('✅ Successfully added openAppModal, closeAppModal, and closeOverlayModal to public/admin.html');
  } else {
    console.log('❌ Could not locate <script> tag');
  }
} else {
  console.log('ℹ️ openAppModal already present');
}
