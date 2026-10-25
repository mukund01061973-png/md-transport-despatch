const fs = require('fs');
let html = fs.readFileSync('public/driver.html', 'utf8');

// 1. Give lifecycleActionBtnContainer explicit styling and min-height so Leaflet map cannot hide/collapse it
html = html.replace(
  '<div id="lifecycleActionBtnContainer"></div>',
  '<div id="lifecycleActionBtnContainer" style="display:block; min-height:55px; margin:10px 0 12px 0; width:100%; position:relative; z-index:100;"></div>'
);

// 2. Ensure renderActiveTrip explicitly forces the button to render immediately
const oldRenderCall = "updateSequentialUI(job.status || 'ACCEPTED');";
const solidRenderCall = `const initialStatus = String(job.status || 'ACCEPTED').toUpperCase();
            updateSequentialUI(initialStatus);`;
html = html.replace(oldRenderCall, solidRenderCall);

// 3. Make sure transitionTrip properly calls updateSequentialUI
const oldTransition = `if (nextStatus === 'Arrived') {
                speakAlert("Arrival marked. Waiting clock started.");
                updateSequentialUI('ARRIVED');
            } else if (nextStatus === 'POB') {
                speakAlert("Passenger on board. Safe journey.");
                updateSequentialUI('POB');
            }`;

const solidTransition = `if (nextStatus.toLowerCase() === 'arrived') {
                speakAlert("Arrival marked. Free waiting grace window active.");
                updateSequentialUI('ARRIVED');
            } else if (nextStatus.toLowerCase() === 'pob') {
                speakAlert("Passenger on board. Safe journey.");
                updateSequentialUI('POB');
            }`;
html = html.replace(oldTransition, solidTransition);

fs.writeFileSync('public/driver.html', html);
console.log('✅ Driver action button container styled and transition calls reinforced!');
