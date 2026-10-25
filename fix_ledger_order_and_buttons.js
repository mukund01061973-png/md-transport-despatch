const fs = require('fs');
let html = fs.readFileSync('public/admin.html', 'utf8');

// 1. Add newest-first sort to renderJobsTable
const oldRenderHead = 'function renderJobsTable() {';
const newRenderHead = `function renderJobsTable() {
            if (Array.isArray(allJobs)) {
                allJobs.sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
            }`;

if (html.includes(oldRenderHead) && !html.includes('allJobs.sort((a, b) => (Number(b.id) || 0)')) {
  html = html.replace(oldRenderHead, newRenderHead);
  console.log('✅ Added newest-first job sort to renderJobsTable');
}

// 2. Expose the ledger modal functions to window so inline onclick attributes can access them
const attachWindowCode = `
// Expose modal handlers to window for inline onclick access
if (typeof openAmendModal === 'function') window.openAmendModal = openAmendModal;
if (typeof openReassignModal === 'function') window.openReassignModal = openReassignModal;
if (typeof openCancelModal === 'function') window.openCancelModal = openCancelModal;
if (typeof saveAmend === 'function') window.saveAmend = saveAmend;
if (typeof cancelJob === 'function') window.cancelJob = cancelJob;
`;

if (!html.includes('window.openAmendModal = openAmendModal')) {
  const lastScriptClose = html.lastIndexOf('</script>');
  html = html.slice(0, lastScriptClose) + attachWindowCode + '\n</script>' + html.slice(lastScriptClose + 9);
  console.log('✅ Exposed Ledger action buttons to window scope');
}

fs.writeFileSync('public/admin.html', html);
console.log('✅ public/admin.html updated successfully without altering any forms or layouts!');
