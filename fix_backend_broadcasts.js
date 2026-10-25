const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

function injectSendAdminState(eventName) {
  const handlerIdx = code.indexOf(`'${eventName}'`);
  if (handlerIdx === -1) return;

  // Find next try/catch block closing in this handler
  const endTryIdx = code.indexOf('} catch', handlerIdx);
  if (endTryIdx === -1) return;

  const slice = code.slice(handlerIdx, endTryIdx);
  if (!slice.includes('sendAdminState()')) {
    code = code.slice(0, endTryIdx) + '      if (typeof sendAdminState === "function") sendAdminState();\n    ' + code.slice(endTryIdx);
    console.log(`✅ Wired auto-broadcast to ${eventName}`);
  }
}

injectSendAdminState('admin_update_driver');
injectSendAdminState('admin_update_plot');
injectSendAdminState('admin_update_account');

fs.writeFileSync('index.js', code);
console.log('✅ index.js updated.');
