/**
 * map-picker.js
 * Google-Maps-style location picker using Leaflet + OpenStreetMap + Nominatim
 * No API key required.
 */

(function () {
  // ---------- Modal HTML ----------
  const modalHtml = `
  <div id="mapPickerModal" class="mp-overlay" role="dialog" aria-modal="true" aria-label="Pick a location">
    <div class="mp-dialog">
      <div class="mp-header">
        <span class="mp-title"><i class="bi bi-geo-alt-fill me-2" style="color:var(--gold-accent)"></i>Pick Location on Map</span>
        <button class="mp-close" id="mpClose" aria-label="Close">&times;</button>
      </div>
      <div class="mp-search-wrap">
        <div class="mp-search-box">
          <i class="bi bi-search mp-search-icon"></i>
          <input type="text" id="mpSearchInput" class="mp-search-input" placeholder="Search for a place…" autocomplete="off">
          <button class="mp-search-btn" id="mpSearchBtn">Search</button>
        </div>
        <ul id="mpSuggestions" class="mp-suggestions"></ul>
      </div>
      <div id="mpMap" class="mp-map"></div>
      <div class="mp-footer">
        <div class="mp-chosen" id="mpChosen">
          <i class="bi bi-pin-map me-1" style="color:var(--gold-accent)"></i>
          <span id="mpChosenText">Click on the map or search to set location</span>
        </div>
        <button class="mp-confirm-btn" id="mpConfirm" disabled>Confirm Location</button>
      </div>
    </div>
  </div>`;

  // ---------- Styles ----------
  const style = document.createElement('style');
  style.textContent = `
    .mp-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
    }
    .mp-overlay.active { display: flex; }
    .mp-dialog {
      width: min(680px, 96vw);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: #141418;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 24px 80px rgba(0,0,0,0.8);
      animation: mpSlideIn 0.25s ease;
    }
    @keyframes mpSlideIn {
      from { transform: translateY(24px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    .mp-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .mp-title { color: #fff; font-weight: 700; font-size: 1rem; font-family: 'Outfit', sans-serif; }
    .mp-close {
      background: none; border: none; color: #aaa; font-size: 1.5rem;
      cursor: pointer; line-height: 1; padding: 0 4px; transition: color 0.2s;
    }
    .mp-close:hover { color: #fff; }
    .mp-search-wrap { padding: 10px 14px 0; position: relative; }
    .mp-search-box {
      display: flex; align-items: center; gap: 0;
      background: #1e1e24; border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px; overflow: hidden;
    }
    .mp-search-icon { color: #888; padding: 0 12px; font-size: 0.9rem; }
    .mp-search-input {
      flex: 1; background: none; border: none; outline: none;
      color: #fff; font-size: 0.9rem; padding: 10px 8px;
    }
    .mp-search-input::placeholder { color: #555; }
    .mp-search-btn {
      background: var(--gold-accent, #c9a227); border: none;
      color: #000; font-weight: 700; font-size: 0.8rem;
      padding: 10px 16px; cursor: pointer; transition: opacity 0.2s;
    }
    .mp-search-btn:hover { opacity: 0.85; }
    .mp-suggestions {
      list-style: none; margin: 0; padding: 0;
      background: #1e1e24; border: 1px solid rgba(255,255,255,0.1);
      border-top: none; border-radius: 0 0 10px 10px;
      max-height: 180px; overflow-y: auto; position: absolute;
      left: 14px; right: 14px; z-index: 10;
    }
    .mp-suggestions li {
      padding: 10px 14px; color: #ddd; font-size: 0.85rem;
      cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05);
      transition: background 0.15s;
    }
    .mp-suggestions li:hover { background: rgba(201,162,39,0.12); color: #fff; }
    .mp-suggestions li:last-child { border-bottom: none; }
    .mp-map { flex: 1; min-height: 320px; z-index: 1; }
    .mp-footer {
      padding: 12px 16px;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      flex-wrap: wrap;
    }
    .mp-chosen {
      color: #bbb; font-size: 0.82rem; flex: 1; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .mp-confirm-btn {
      background: var(--gold-accent, #c9a227); border: none; color: #000;
      font-weight: 700; border-radius: 8px; padding: 10px 22px;
      cursor: pointer; font-size: 0.9rem; transition: opacity 0.2s, transform 0.15s;
      white-space: nowrap;
    }
    .mp-confirm-btn:disabled { opacity: 0.35; cursor: default; }
    .mp-confirm-btn:not(:disabled):hover { opacity: 0.85; transform: scale(1.03); }

    /* Trigger button styling */
    .mp-trigger-btn {
      background: none;
      border: 1px solid rgba(201,162,39,0.4);
      color: var(--gold-accent, #c9a227);
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 6px;
    }
    .mp-trigger-btn:hover {
      background: rgba(201,162,39,0.12);
      border-color: var(--gold-accent, #c9a227);
    }
    .mp-location-display {
      margin-top: 8px;
      padding: 8px 12px;
      background: rgba(201,162,39,0.07);
      border: 1px solid rgba(201,162,39,0.2);
      border-radius: 8px;
      font-size: 0.8rem;
      color: #ccc;
      display: none;
      align-items: center;
      gap: 8px;
    }
    .mp-location-display.visible { display: flex; }
    .mp-location-display i { color: var(--gold-accent, #c9a227); flex-shrink: 0; }
    .mp-loc-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .mp-loc-clear {
      background: none; border: none; color: #888;
      cursor: pointer; font-size: 1rem; padding: 0; line-height: 1;
      flex-shrink: 0;
    }
    .mp-loc-clear:hover { color: #fff; }
  `;
  document.head.appendChild(style);

  // ---------- Inject modal into page ----------
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // ---------- Load Leaflet if not already loaded ----------
  function loadLeaflet(cb) {
    if (window.L) return cb();
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = cb;
    document.head.appendChild(js);
  }

  // ---------- State ----------
  let mapInstance = null;
  let marker = null;
  let chosenLat = null;
  let chosenLng = null;
  let chosenAddress = '';
  let currentCallback = null;
  let searchTimeout = null;

  // ---------- DOM refs ----------
  const overlay    = document.getElementById('mapPickerModal');
  const closeBtn   = document.getElementById('mpClose');
  const confirmBtn = document.getElementById('mpConfirm');
  const chosenText = document.getElementById('mpChosenText');
  const searchInput = document.getElementById('mpSearchInput');
  const searchBtn  = document.getElementById('mpSearchBtn');
  const suggestions = document.getElementById('mpSuggestions');

  // ---------- Open / Close ----------
  function openPicker(callback) {
    currentCallback = callback;
    chosenLat = null; chosenLng = null; chosenAddress = '';
    chosenText.textContent = 'Click on the map or search to set location';
    confirmBtn.disabled = true;
    suggestions.innerHTML = '';
    searchInput.value = '';
    overlay.classList.add('active');

    loadLeaflet(() => {
      if (!mapInstance) {
        mapInstance = L.map('mpMap', { zoomControl: true }).setView([25.2048, 55.2708], 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapInstance);
        mapInstance.on('click', onMapClick);
      }
      setTimeout(() => mapInstance.invalidateSize(), 150);
    });
  }

  function closePicker() {
    overlay.classList.remove('active');
    suggestions.innerHTML = '';
  }

  closeBtn.addEventListener('click', closePicker);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePicker(); });

  // ---------- Map click ----------
  function onMapClick(e) {
    placeMarker(e.latlng.lat, e.latlng.lng);
    reverseGeocode(e.latlng.lat, e.latlng.lng);
  }

  function placeMarker(lat, lng, label) {
    if (!mapInstance) return;
    if (marker) mapInstance.removeLayer(marker);
    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width:32px;height:42px;
        background:var(--gold-accent,#c9a227);
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid #fff;
        box-shadow:0 4px 12px rgba(0,0,0,0.5);
      "></div>`,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
    });
    marker = L.marker([lat, lng], { icon }).addTo(mapInstance);
    mapInstance.setView([lat, lng], 16);
    chosenLat = lat; chosenLng = lng;
    if (label) {
      chosenAddress = label;
      chosenText.textContent = label;
      confirmBtn.disabled = false;
    }
  }

  // ---------- Reverse Geocode ----------
  function reverseGeocode(lat, lng) {
    chosenText.textContent = 'Fetching address…';
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
      .then(r => r.json())
      .then(data => {
        const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        chosenAddress = addr;
        chosenText.textContent = addr;
        confirmBtn.disabled = false;
      })
      .catch(() => {
        chosenAddress = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        chosenText.textContent = chosenAddress;
        confirmBtn.disabled = false;
      });
  }

  // ---------- Search ----------
  function doSearch() {
    const q = searchInput.value.trim();
    if (!q) return;
    suggestions.innerHTML = '<li style="color:#888">Searching…</li>';
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&countrycodes=ae`)
      .then(r => r.json())
      .then(results => {
        suggestions.innerHTML = '';
        if (!results.length) {
          suggestions.innerHTML = '<li style="color:#888">No results found</li>';
          return;
        }
        results.forEach(item => {
          const li = document.createElement('li');
          li.textContent = item.display_name;
          li.addEventListener('click', () => {
            suggestions.innerHTML = '';
            searchInput.value = item.display_name;
            placeMarker(parseFloat(item.lat), parseFloat(item.lon), item.display_name);
          });
          suggestions.appendChild(li);
        });
      })
      .catch(() => { suggestions.innerHTML = '<li style="color:#888">Search failed</li>'; });
  }

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const q = searchInput.value.trim();
    if (q.length < 3) { suggestions.innerHTML = ''; return; }
    searchTimeout = setTimeout(doSearch, 500);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mp-search-wrap')) suggestions.innerHTML = '';
  });

  // ---------- Confirm ----------
  confirmBtn.addEventListener('click', () => {
    if (!chosenLat || !chosenLng) return;
    if (currentCallback) currentCallback(chosenLat, chosenLng, chosenAddress);
    closePicker();
  });

  // ---------- Public API ----------
  window.MapPicker = { open: openPicker };
})();
