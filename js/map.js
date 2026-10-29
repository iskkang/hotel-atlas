import { $, el, fmt, dot, link, shortDate, shortName, countryLabel, groups, renderChrome, loadHotels } from './common.js';
import { REGIONS, COUNTRY_REGION } from '../data/regions.js';

renderChrome('map');

const PAGE = 100;
const state = { on: new Set(groups.map((g) => g.id)), view: { type: 'regions' }, q: '', page: 0 };
let hotels = [], markers = [], visible = [];

/* ---------- map ---------- */
const map = L.map('map', { worldCopyJump: true, zoomControl: false, preferCanvas: true }).setView([25, 20], 2);
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
  attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · Hotels: <a href="https://www.alltheplaces.xyz/">All the Places</a>',
}).addTo(map);
const icons = {};
for (const g of groups) icons[g.id] = L.divIcon({ className: 'hm hm-' + g.id, html: '<span></span>', iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -6] });
const cluster = L.markerClusterGroup({
  showCoverageOnHover: false,
  chunkedLoading: true,
  maxClusterRadius: (z) => (z >= 10 ? 36 : 60),
  iconCreateFunction: (c) => {
    const n = c.getChildCount();
    const size = n >= 1000 ? 52 : n >= 100 ? 44 : 36;
    return L.divIcon({ className: 'hc', html: '<span>' + (n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n) + '</span>', iconSize: [size, size] });
  },
});
map.addLayer(cluster);

const details = (h) => [h.brand, h.city || h.address, countryLabel(h.country)].filter(Boolean).join(' · ');
const sourceLink = (h) => (h.url ? { href: h.url, text: 'Official page ↗' } : { href: h.osm_url, text: 'OpenStreetMap ↗' });
function popup(h) {
  const box = el('div', 'pop');
  const tag = el('span', 'prog-tag');
  tag.append(dot(h.group), shortName(h.group));
  const s = sourceLink(h);
  box.append(tag, el('strong', null, h.name), el('p', null, details(h)), link(s.href, s.text));
  return box;
}

/* ---------- helpers ---------- */
const regionOf = (h) => COUNTRY_REGION[h.country] || null;
const regionName = (id) => (REGIONS.find((r) => r.id === id) || {}).name || id;
const inView = (h) => {
  const v = state.view;
  if (v.type === 'region') return regionOf(h) === v.id;
  if (v.type === 'country') return h.country === v.cc;
  return true;
};
const matchesQ = (h, q) => [h.name, h.city, h.address, h.brand].some((x) => String(x || '').toLowerCase().includes(q));

function countBy(list, key) {
  const m = new Map();
  for (const h of list) { const k = key(h); if (k) m.set(k, (m.get(k) || 0) + 1); }
  return m;
}

function fitTo(list) {
  if (!list.length) return;
  const b = L.latLngBounds(list.map((h) => [h.lat, h.lon]));
  map.fitBounds(b.pad(0.08), { maxZoom: 12 });
}

/* ---------- chips ---------- */
function renderChips() {
  const box = $('mapChips');
  box.replaceChildren();
  const allOn = state.on.size === groups.length;
  const all = el('button', 'chip');
  all.type = 'button';
  all.setAttribute('aria-pressed', String(allOn));
  all.append('All ', el('span', 'num', fmt(hotels.length)));
  all.addEventListener('click', () => { state.on = new Set(groups.map((g) => g.id)); update(); });
  box.append(all);
  const byGroup = countBy(hotels, (h) => h.group);
  for (const g of groups) {
    const b = el('button', 'chip');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(!allOn && state.on.has(g.id)));
    b.append(dot(g.id), shortName(g.id) + ' ', el('span', 'num', fmt(byGroup.get(g.id) || 0)));
    b.addEventListener('click', () => {
      if (allOn) state.on = new Set([g.id]);
      else if (state.on.has(g.id)) { state.on.delete(g.id); if (!state.on.size) state.on = new Set(groups.map((x) => x.id)); }
      else state.on.add(g.id);
      update();
    });
    box.append(b);
  }
  box.append(el('span', 'chips-hint', 'Pick one or more programs'));
}

/* ---------- panel ---------- */
function row(title, sub, onClick, extraClass) {
  const b = el('button', 'panel-row' + (extraClass ? ' ' + extraClass : ''));
  b.type = 'button';
  b.append(el('span', 'pr-title', title), el('span', 'pr-sub', sub));
  b.addEventListener('click', onClick);
  return b;
}

function hotelRow(h) {
  const b = el('button', 'hotel-row');
  b.type = 'button';
  const t = el('span', 'pr-title');
  t.append(dot(h.group), h.name);
  b.append(t, el('span', 'pr-sub', [h.brand, h.city || h.address].filter(Boolean).join(' · ')));
  b.addEventListener('click', () => {
    const m = markers[hotels.indexOf(h)];
    cluster.zoomToShowLayer(m, () => m.openPopup());
  });
  return b;
}

function hotelList(list, body) {
  const sorted = list.slice().sort((a, b) => a.name.localeCompare(b.name));
  const pageItems = sorted.slice(state.page * PAGE, (state.page + 1) * PAGE);
  const wrap = el('div', 'hotel-rows');
  for (const h of pageItems) wrap.append(hotelRow(h));
  body.append(wrap);
  if (sorted.length > PAGE) {
    const nav = el('div', 'pager');
    const prev = el('button', null, 'Previous');
    const next = el('button', null, 'Next');
    prev.type = next.type = 'button';
    prev.disabled = state.page === 0;
    next.disabled = (state.page + 1) * PAGE >= sorted.length;
    prev.addEventListener('click', () => { state.page--; renderPanel(); });
    next.addEventListener('click', () => { state.page++; renderPanel(); });
    nav.append(prev, el('span', 'num', fmt(state.page * PAGE + 1) + '–' + fmt(Math.min((state.page + 1) * PAGE, sorted.length)) + ' of ' + fmt(sorted.length)), next);
    body.append(nav);
  }
}

function renderPanel() {
  const body = $('panelBody');
  body.replaceChildren();
  const v = state.view, q = state.q;
  $('panelBack').hidden = v.type === 'regions';

  if (v.type === 'regions') {
    $('panelTitle').textContent = 'Where are you going?';
    if (q) {
      const countries = [...countBy(visible, (h) => h.country)].filter(([cc]) => countryLabel(cc).toLowerCase().includes(q) || cc.toLowerCase() === q);
      if (countries.length) {
        body.append(el('p', 'panel-label', 'Countries'));
        const g = el('div', 'panel-grid');
        for (const [cc, n] of countries.sort((a, b) => b[1] - a[1])) g.append(row(countryLabel(cc), fmt(n) + ' hotels', () => go({ type: 'country', cc })));
        body.append(g);
      }
      const hits = visible.filter((h) => matchesQ(h, q));
      body.append(el('p', 'panel-label', fmt(hits.length) + ' hotels match'));
      hotelList(hits, body);
      return;
    }
    const uae = visible.filter((h) => h.country === 'AE').length;
    body.append(row('United Arab Emirates', fmt(uae) + ' hotels · this edition’s home', () => go({ type: 'country', cc: 'AE' }), 'feature'));
    const byRegion = countBy(visible, regionOf);
    const countriesByRegion = new Map();
    for (const h of visible) { const r = regionOf(h); if (!r) continue; if (!countriesByRegion.has(r)) countriesByRegion.set(r, new Set()); countriesByRegion.get(r).add(h.country); }
    const g = el('div', 'panel-grid');
    for (const r of REGIONS) {
      const n = byRegion.get(r.id) || 0;
      const c = countriesByRegion.get(r.id);
      g.append(row(r.name, fmt(n) + ' hotels · ' + (c ? c.size : 0) + ' countries', () => go({ type: 'region', id: r.id })));
    }
    body.append(g);
    body.append(row('All countries', 'A to Z list', () => go({ type: 'region', id: 'all' }), 'wide'));
    return;
  }

  if (v.type === 'region') {
    $('panelTitle').textContent = v.id === 'all' ? 'All countries' : regionName(v.id);
    const list = v.id === 'all' ? visible : visible.filter((h) => regionOf(h) === v.id);
    let countries = [...countBy(list, (h) => h.country)];
    if (q) countries = countries.filter(([cc]) => countryLabel(cc).toLowerCase().includes(q));
    countries.sort((a, b) => (v.id === 'all' ? countryLabel(a[0]).localeCompare(countryLabel(b[0])) : b[1] - a[1]));
    body.append(el('p', 'panel-label', countries.length + ' countries'));
    const g = el('div', 'panel-grid');
    for (const [cc, n] of countries) g.append(row(countryLabel(cc), fmt(n) + ' hotels', () => go({ type: 'country', cc })));
    body.append(g);
    return;
  }

  if (v.type === 'country') {
    $('panelTitle').textContent = countryLabel(v.cc);
    let list = visible.filter((h) => h.country === v.cc);
    const byGroup = countBy(list, (h) => h.group);
    const mix = el('p', 'panel-mix');
    for (const g of groups) if (byGroup.get(g.id)) { const s = el('span'); s.append(dot(g.id), shortName(g.id) + ' ' + fmt(byGroup.get(g.id))); mix.append(s); }
    body.append(mix);
    if (q) list = list.filter((h) => matchesQ(h, q));
    body.append(el('p', 'panel-label', fmt(list.length) + ' hotels' + (q ? ' match' : '')));
    hotelList(list, body);
  }
}

/* ---------- navigation ---------- */
function hashFor(v) { return v.type === 'country' ? '#' + v.cc : v.type === 'region' ? '#r-' + v.id : ''; }
function go(v, fromHash) {
  state.view = v;
  state.page = 0;
  state.q = '';
  $('panelSearch').value = '';
  if (!fromHash) history.replaceState(null, '', location.pathname + hashFor(v));
  renderPanel();
  if (v.type === 'regions') map.setView([25, 20], 2);
  else if (v.type === 'region' && v.id !== 'all') fitTo(visible.filter((h) => regionOf(h) === v.id));
  else if (v.type === 'country') fitTo(visible.filter((h) => h.country === v.cc));
}
function fromHash() {
  const h = location.hash.slice(1);
  if (/^[A-Z]{2}$/.test(h)) return { type: 'country', cc: h };
  if (/^r-[a-z]+$/.test(h)) return { type: 'region', id: h.slice(2) };
  return { type: 'regions' };
}
$('panelBack').addEventListener('click', () => {
  const v = state.view;
  if (v.type === 'country') { const r = COUNTRY_REGION[v.cc]; go(r ? { type: 'region', id: r } : { type: 'regions' }); }
  else go({ type: 'regions' });
});
let t = null;
$('panelSearch').addEventListener('input', (e) => {
  clearTimeout(t);
  t = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); state.page = 0; renderPanel(); }, 200);
});
window.addEventListener('hashchange', () => go(fromHash(), true));

function update() {
  visible = hotels.filter((h) => state.on.has(h.group));
  cluster.clearLayers();
  cluster.addLayers(markers.filter((m, i) => state.on.has(hotels[i].group)));
  renderChips();
  renderPanel();
}

/* ---------- load ---------- */
try {
  const data = await loadHotels();
  hotels = data.hotels;
  markers = hotels.map((h) => {
    const m = L.marker([h.lat, h.lon], { icon: icons[h.group], keyboard: false, title: h.name });
    m.bindPopup(() => popup(h));
    return m;
  });
  $('dataStatus').textContent = 'All the Places data updated ' + shortDate(data.atpUpdated) + (data.osmExtra ? '; ' + fmt(data.osmExtra) + ' more from OpenStreetMap.' : '.');
  update();
  const start = fromHash();
  if (start.type !== 'regions') go(start, true);
} catch (e) {
  console.error(e);
  $('panelBody').replaceChildren(el('p', 'note', 'Hotel data didn’t load. Reload the page to try again.'));
}
