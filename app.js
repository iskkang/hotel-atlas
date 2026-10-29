import { groups } from './data/brands.js';
import { edition } from './data/edition-ae.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const fmt = (n) => n.toLocaleString('en-US');
const CHAIN_COLOR = { marriott: 'var(--c-marriott)', hilton: 'var(--c-hilton)', hyatt: 'var(--c-hyatt)', ihg: 'var(--c-ihg)', accor: 'var(--c-accor)' };
const programName = (id) => (edition.programs.find((p) => p.id === id) || {}).program || (groups.find((g) => g.id === id) || {}).program || id;
const dot = (id) => { const d = el('span', 'chain-dot'); d.style.background = CHAIN_COLOR[id] || 'var(--muted)'; d.setAttribute('aria-hidden', 'true'); return d; };
const shortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};
const link = (href, text, cls) => { const a = el('a', cls, text); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; };

$('year').textContent = new Date().getFullYear();
$('checkedLine').replaceChildren('Benefits, cards and offers checked for UAE residents on ', el('b', null, shortDate(edition.checked)), '.');

/* ---------- overview tiles ---------- */
function renderHub() {
  const ladders = $('hubLadders');
  for (const p of edition.programs) {
    const li = el('li', 'ladder');
    const name = el('span', 'ladder-name');
    name.append(dot(p.id), p.short || p.program);
    const steps = el('span', 'ladder-steps');
    p.tiers.forEach((t, i) => {
      if (i) steps.append(el('span', 'sep', '›'));
      steps.append(el('span', t.name === p.breakfastFrom ? 'hit' : '', t.name));
    });
    li.append(name, steps);
    ladders.append(li);
  }

  const promos = edition.promos;
  $('hubPromoCount').textContent = promos.length;
  const pl = $('hubPromos');
  if (!promos.length) pl.append(el('li', null, 'No confirmed offers right now'));
  for (const pr of promos.slice(0, 3)) {
    const li = el('li');
    li.append(dot(pr.program), el('span', 't', pr.title));
    pl.append(li);
  }

  $('hubCardCount').textContent = edition.cards.length;
  const cl = $('hubCards');
  for (const c of edition.cards.slice(0, 3)) {
    const li = el('li');
    li.append(dot(c.program), el('span', 't', c.bank + ' · ' + c.card));
    cl.append(li);
  }

  const bars = $('hubBars');
  const withNights = edition.programs.filter((p) => Number.isFinite(p.breakfastNights));
  const max = Math.max(...withNights.map((p) => p.breakfastNights), 1);
  for (const p of withNights) {
    const row = el('div', 'bar-row');
    const track = el('div', 'bar-track');
    const fill = el('div', 'bar-fill');
    fill.style.width = (p.breakfastNights / max) * 100 + '%';
    track.append(fill);
    row.append(el('span', null, p.short || p.program), track, el('span', 'num', String(p.breakfastNights)));
    bars.append(row);
  }
  if (withNights.length) bars.prepend(el('p', 'tile-sub', 'Nights a year until breakfast is included'));

  const dots = $('hubChainDots');
  for (const g of groups) {
    const s = el('span');
    s.append(dot(g.id), (edition.programs.find((x) => x.id === g.id) || {}).short || g.name);
    dots.append(s);
  }
}

/* ---------- tier guide ---------- */
function renderTiers() {
  const body = $('compareBody');
  for (const p of edition.programs) {
    const tr = el('tr');
    const th = el('th', 'prog');
    th.scope = 'row';
    th.append(dot(p.id), ' ', p.program);
    const cell = (main, sub) => { const td = el('td'); td.append(main || '—'); if (sub) td.append(el('small', null, sub)); return td; };
    const top = p.tiers[p.tiers.length - 1];
    tr.append(th, cell(p.breakfastFrom, p.breakfastQualify), cell(p.loungeFrom, p.loungeQualify), cell(top.name, top.qualify));
    body.append(tr);
  }

  const wrap = $('programs');
  for (const p of edition.programs) {
    const card = el('article', 'program');
    card.id = 'tier-' + p.id;
    const h = el('h3');
    h.append(dot(p.id), p.program);
    card.append(h, el('p', 'meta', p.yearNote || '2026 qualification year'));
    for (const t of p.tiers) {
      const box = el('div', 'tier' + (t.name === p.breakfastFrom ? ' hit' : ''));
      const top = el('div', 'tier-top');
      top.append(el('span', 'tier-name', t.name), el('span', 'tier-qual', t.qualify));
      box.append(top);
      if (t.benefits && t.benefits.length) {
        const ul = el('ul');
        for (const b of t.benefits) ul.append(el('li', null, b));
        box.append(ul);
      }
      card.append(box);
    }
    if (p.uaeNote) card.append(el('div', 'flag', p.uaeNote));
    if (p.sources && p.sources.length) {
      const s = el('p', 'src', 'Checked: ');
      p.sources.forEach((src, i) => { if (i) s.append(' · '); s.append(link(src.url, src.label)); });
      card.append(s);
    }
    wrap.append(card);
  }
}

/* ---------- cards ---------- */
function renderCards() {
  const grid = $('cardGrid');
  for (const c of edition.cards) {
    const card = el('article', 'bank-card');
    const tag = el('span', 'prog-tag');
    tag.append(dot(c.program), c.programLabel || programName(c.program));
    card.append(el('span', 'bank', c.bank), el('h3', null, c.card), tag);
    const dl = el('dl');
    const row = (k, v) => { if (!v) return; dl.append(el('dt', null, k), el('dd', null, v)); };
    row('Annual fee', c.fee);
    row('Min. salary', c.salary);
    row('Status', c.status);
    row('Earn', c.earn);
    card.append(dl);
    if (c.offer) card.append(el('div', 'offer', c.offer + (c.offerEnds ? ' Ends ' + shortDate(c.offerEnds) + '.' : '')));
    if (c.url) card.append(link(c.url, 'See the bank’s page ↗', 'out'));
    grid.append(card);
  }
  if (edition.notes && edition.notes.cards) $('cardsNote').textContent = edition.notes.cards;
}

/* ---------- promotions ---------- */
function renderPromos() {
  const list = $('promoList');
  if (!edition.promos.length) list.append(el('p', 'note', 'No promotions open for UAE stays could be confirmed on the check date.'));
  for (const pr of edition.promos) {
    const item = el('article', 'promo');
    const left = el('div');
    const tag = el('span', 'prog-tag');
    tag.append(dot(pr.program), programName(pr.program));
    left.append(tag, el('h3', null, pr.title), el('p', null, pr.offer + (pr.limits ? ' ' + pr.limits : '')));
    const when = el('div', 'when');
    if (pr.stayTo) when.append(el('b', null, 'Stay by ' + shortDate(pr.stayTo)));
    if (pr.stayFrom) when.append('from ' + shortDate(pr.stayFrom));
    if (!pr.stayTo && !pr.stayFrom) when.append(el('b', null, 'Ongoing'));
    const links = el('div', 'links');
    links.append(el('span', 'pill' + (pr.register ? ' reg' : ''), pr.register ? 'Register first' + (pr.registerBy ? ' by ' + shortDate(pr.registerBy) : '') : 'No registration'));
    if (pr.region) links.append(el('span', 'pill', pr.region));
    if (pr.url) links.append(link(pr.url, 'Offer page ↗'));
    item.append(left, when, links);
    list.append(item);
  }
  if (edition.notes && edition.notes.promos) $('promosNote').textContent = edition.notes.promos;
}

/* ---------- sources + footer ---------- */
function renderSources() {
  const seen = new Map();
  const add = (s) => { if (s && s.url && !seen.has(s.url)) seen.set(s.url, s.label || s.url); };
  edition.programs.forEach((p) => (p.sources || []).forEach(add));
  edition.cards.forEach((c) => (c.sources || []).forEach(add));
  edition.promos.forEach((p) => (p.sources || []).forEach(add));
  const ul = $('sourceList');
  for (const [url, label] of seen) { const li = el('li'); li.append(link(url, label)); ul.append(li); }

  const loyalty = $('loyalty');
  for (const g of groups) loyalty.append(link(g.loyaltyUrl, g.program));
}

renderHub();
renderTiers();
renderCards();
renderPromos();
renderSources();

/* ---------- hotel map ---------- */
for (const g of groups) { const o = el('option', null, g.program); o.value = g.id; $('hotelGroup').append(o); }

let regionNames = null;
try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { /* older browsers */ }
const countryLabel = (c) => { if (!c) return ''; if (/^[A-Za-z]{2}$/.test(c)) { try { return (regionNames && regionNames.of(c.toUpperCase())) || c; } catch (e) { return c; } } return c; };
const details = (h) => [h.brand, h.city || h.address, countryLabel(h.country)].filter(Boolean).join(' · ');
const sourceLink = (h) => (h.url ? { href: h.url, text: 'Official page ↗' } : { href: h.osm_url, text: 'OpenStreetMap ↗' });
const isUAE = (h) => /^(ae|united arab emirates)$/i.test(h.country || '');
const UAE_BOUNDS = [[22.6, 51.6], [26.2, 56.4]];

// Drop an OSM record when All the Places has the same group's hotel within ~150 m.
function mergeSources(atp, osm) {
  const cell = (lat, lon) => Math.round(lat * 100) + ':' + Math.round(lon * 100);
  const grid = new Map();
  for (const h of atp) { const k = cell(h.lat, h.lon); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(h); }
  const near = (a, b) => { const dy = (a.lat - b.lat) * 111320, dx = (a.lon - b.lon) * 111320 * Math.cos(a.lat * Math.PI / 180); return dx * dx + dy * dy <= 150 * 150; };
  const keep = osm.filter((o) => {
    const la = Math.round(o.lat * 100), lo = Math.round(o.lon * 100);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const a of grid.get((la + i) + ':' + (lo + j)) || []) if (a.group === o.group && near(a, o)) return false;
    }
    return true;
  });
  return atp.concat(keep);
}

let map = null, markerLayer = null, hotels = [], filtered = [], page = 0, uaeOnly = false;
const PAGE_SIZE = 100;
try {
  if (!window.L) throw Error('Leaflet did not load');
  map = L.map('map', { scrollWheelZoom: false, worldCopyJump: true, preferCanvas: true }).setView([24, 30], 2);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 18 }).addTo(map);
  markerLayer = L.layerGroup().addTo(map);
  map.on('moveend zoomend', updateMarkers);
  setTimeout(() => map.invalidateSize(), 250);
} catch (e) { $('map').textContent = 'The map couldn’t load. Reload the page or check your connection.'; console.error(e); }

function updateMarkers() {
  if (!map || !markerLayer) return;
  markerLayer.clearLayers();
  const bounds = map.getBounds().pad(0.1), visible = filtered.filter((h) => bounds.contains([h.lat, h.lon]));
  const max = 600, step = Math.max(1, Math.ceil(visible.length / max));
  for (let i = 0; i < visible.length; i += step) {
    const h = visible[i];
    const color = getComputedStyle(document.documentElement).getPropertyValue('--c-' + h.group).trim() || '#8c1d40';
    const marker = L.circleMarker([h.lat, h.lon], { radius: 6, color: '#ffffff', weight: 1.5, fillColor: color, fillOpacity: 0.95 });
    const popup = el('div'), src = sourceLink(h);
    popup.append(el('strong', null, h.name), el('p', null, details(h)), link(src.href, src.text));
    marker.bindPopup(popup);
    marker.addTo(markerLayer);
  }
  $('mapHint').textContent = visible.length > max
    ? 'Showing a sample of ' + fmt(visible.length) + ' hotels in view. Zoom in to see them all.'
    : fmt(visible.length) + ' hotels in view.';
}

function renderPage() {
  const items = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  $('hotelResults').replaceChildren(...items.map((h) => {
    const card = el('article', 'hotel-item'), src = sourceLink(h);
    card.append(el('strong', null, h.name), el('span', null, details(h)), link(src.href, src.text));
    return card;
  }));
  if (!filtered.length) $('hotelResults').textContent = 'No hotels match these filters.';
  $('pageStatus').textContent = filtered.length
    ? fmt(page * PAGE_SIZE + 1) + '–' + fmt(Math.min((page + 1) * PAGE_SIZE, filtered.length)) + ' / ' + fmt(filtered.length)
    : '0 / 0';
  $('prevPage').disabled = page === 0;
  $('nextPage').disabled = (page + 1) * PAGE_SIZE >= filtered.length;
}

function renderHotels() {
  const q = $('hotelSearch').value.trim().toLowerCase(), group = $('hotelGroup').value;
  filtered = hotels.filter((h) => (!group || h.group === group) && (!uaeOnly || isUAE(h)) &&
    (!q || [h.name, h.city, h.address, h.country, countryLabel(h.country), h.brand].some((x) => String(x || '').toLowerCase().includes(q))));
  page = 0;
  $('hotelCount').textContent = fmt(filtered.length) + ' hotels';
  renderPage();
  updateMarkers();
}

$('prevPage').addEventListener('click', () => { if (page > 0) { page--; renderPage(); } });
$('nextPage').addEventListener('click', () => { if ((page + 1) * PAGE_SIZE < filtered.length) { page++; renderPage(); } });
$('hotelSearch').addEventListener('input', renderHotels);
$('hotelGroup').addEventListener('change', renderHotels);
$('uaeOnly').addEventListener('click', (e) => {
  uaeOnly = !uaeOnly;
  e.currentTarget.setAttribute('aria-pressed', String(uaeOnly));
  if (map) { if (uaeOnly) map.fitBounds(UAE_BOUNDS); else map.setView([24, 30], 2); }
  renderHotels();
});

async function loadCatalog(path) {
  const r = await fetch(path, { cache: 'no-store' });
  if (!r.ok) throw Error(path + ' HTTP ' + r.status);
  const d = await r.json();
  if (!Array.isArray(d.hotels)) throw Error(path + ' invalid data');
  return d;
}
const valid = (h) => Number.isFinite(h.lat) && Number.isFinite(h.lon) && h.name && groups.some((g) => g.id === h.group);
const [atpRes, osmRes] = await Promise.allSettled([loadCatalog('/data/hotels_atp.json'), loadCatalog('/data/hotels.json')]);
const atp = atpRes.status === 'fulfilled' ? atpRes.value.hotels.filter(valid) : [];
const osm = osmRes.status === 'fulfilled' ? osmRes.value.hotels.filter(valid) : [];
if (atpRes.status === 'rejected') console.error(atpRes.reason);
if (osmRes.status === 'rejected') console.error(osmRes.reason);
hotels = mergeSources(atp, osm);

if (atpRes.status === 'rejected' && osmRes.status === 'rejected') {
  $('dataStatus').textContent = 'Hotel data didn’t load. Reload the page to try again.';
} else {
  const parts = [];
  if (atp.length) parts.push('All the Places, updated ' + shortDate(atpRes.value.updated_at));
  if (hotels.length > atp.length) parts.push('OpenStreetMap, ' + fmt(hotels.length - atp.length) + ' more');
  $('dataStatus').textContent = parts.length ? 'Sources: ' + parts.join(' · ') : 'Waiting for data';
}
$('hubHotelCount').textContent = hotels.length ? fmt(hotels.length) : '–';
const uaeCount = hotels.filter(isUAE).length;
$('hubHotelSub').textContent = 'chain hotels worldwide' + (uaeCount ? ', ' + fmt(uaeCount) + ' in the UAE' : '');
renderHotels();
