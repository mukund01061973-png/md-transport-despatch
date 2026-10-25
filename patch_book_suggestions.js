const fs = require('fs');
let html = fs.readFileSync('public/book.html', 'utf8');

// Style for dropdown menu
const dropdownCss = `
<style id="liveAddressDropdownCss">
.addr-suggest-wrap { position: relative; width: 100%; }
.addr-suggest-box {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #0f172a;
  border: 1px solid #38bdf8;
  border-radius: 6px;
  max-height: 220px;
  overflow-y: auto;
  z-index: 999999;
  display: none;
  box-shadow: 0 10px 25px rgba(0,0,0,0.85);
  margin-top: 2px;
}
.addr-suggest-item {
  padding: 10px 14px;
  border-bottom: 1px solid #1e293b;
  cursor: pointer;
  color: #f8fafc;
  font-size: 0.88rem;
  line-height: 1.3;
}
.addr-suggest-item:hover {
  background: #0284c7;
  color: #ffffff;
}
.addr-suggest-item strong {
  color: #38bdf8;
  display: block;
}
.addr-suggest-item:hover strong {
  color: #ffffff;
}
.addr-suggest-item small {
  color: #94a3b8;
  font-size: 0.75rem;
  display: block;
}
.addr-suggest-item:hover small {
  color: #e2e8f0;
}
</style>
`;

if (!html.includes('id="liveAddressDropdownCss"')) {
  html = html.replace('</head>', dropdownCss + '\n</head>');
}

// Wrap custPickup in container with suggestions box
if (!html.includes('id="pickupSuggestBox"')) {
  html = html.replace(
    /<input[^>]*id=["']custPickup["'][^>]*>/i,
    `<div class="addr-suggest-wrap">
       <input type="text" id="custPickup" placeholder="e.g. BA1 1AA, Milsom St, or Bath Spa Station" oninput="handleAddressTypeAhead('custPickup', 'pickupSuggestBox')" autocomplete="off" required>
       <div id="pickupSuggestBox" class="addr-suggest-box"></div>
     </div>`
  );
}

// Wrap custDropoff in container with suggestions box
if (!html.includes('id="dropoffSuggestBox"')) {
  html = html.replace(
    /<input[^>]*id=["']custDropoff["'][^>]*>/i,
    `<div class="addr-suggest-wrap">
       <input type="text" id="custDropoff" placeholder="e.g. BA1 6BA, Bristol Airport or Heathrow" oninput="handleAddressTypeAhead('custDropoff', 'dropoffSuggestBox')" autocomplete="off" required>
       <div id="dropoffSuggestBox" class="addr-suggest-box"></div>
     </div>`
  );
}

// Client Lookup Logic
const suggestScript = `
<script id="typeaheadScript">
let _typeTimer = null;

async function handleAddressTypeAhead(inputId, boxId) {
  triggerAutoRouting();
  clearTimeout(_typeTimer);
  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);
  const val = (input.value || '').trim();

  if (val.length < 3) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  _typeTimer = setTimeout(async () => {
    try {
      const res = await fetch('/api/address-search?q=' + encodeURIComponent(val));
      const data = await res.json();
      const items = data.results || [];

      if (items.length === 0) {
        box.style.display = 'none';
        box.innerHTML = '';
        return;
      }

      box.innerHTML = items.map(it => \`
        <div class="addr-suggest-item" onclick="selectSuggestion('\${inputId}', '\${boxId}', '\${encodeURIComponent(it.full)}')">
          <strong>\${it.primary}</strong>
          <small>\${it.secondary}</small>
        </div>
      \`).join('');
      box.style.display = 'block';
    } catch(err) {
      box.style.display = 'none';
    }
  }, 220);
}

function selectSuggestion(inputId, boxId, encodedVal) {
  const val = decodeURIComponent(encodedVal);
  document.getElementById(inputId).value = val;
  const box = document.getElementById(boxId);
  box.style.display = 'none';
  box.innerHTML = '';
  triggerAutoRouting();
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.addr-suggest-wrap')) {
    document.querySelectorAll('.addr-suggest-box').forEach(b => b.style.display = 'none');
  }
});
</script>
`;

if (!html.includes('id="typeaheadScript"')) {
  html = html.replace('</body>', suggestScript + '\n</body>');
}

fs.writeFileSync('public/book.html', html);
console.log('🎯 public/book.html successfully upgraded with live address suggestions!');
