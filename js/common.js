// Shared helpers, site header and footer for every page.
import { groups } from '../data/brands.js';
import { edition } from '../data/edition-ae.js';

export { groups, edition };

export const $ = (id) => document.getElementById(id);
export const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
export const fmt = (n) => Number(n).toLocaleString('en-US');
export const link = (href, text, cls) => {
  const a = el('a', cls, text);
  a.href = href;
  if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
  return a;
};
export const shortDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

export const CHAIN_COLOR = { marriott: 'var(--c-marriott)', hilton: 'var(--c-hilton)', hyatt: 'var(--c-hyatt)', ihg: 'var(--c-ihg)', accor: 'var(--c-accor)' };
export const program = (id) => edition.programs.find((p) => p.id === id);
export const programName = (id) => (program(id) || {}).program || (groups.find((g) => g.id === id) || {}).program || id;
export const shortName = (id) => (program(id) || {}).short || (groups.find((g) => g.id === id) || {}).name || id;
export const dot = (id) => {
  const d = el('span', 'chain-dot');
  d.style.background = CHAIN_COLOR[id] || 'var(--muted)';
  d.setAttribute('aria-hidden', 'true');
  return d;
};

let regionNames = null;
try { regionNames = new Intl.DisplayNames(['en'], { type: 'region' }); } catch (e) { /* older browsers */ }
export const countryLabel = (c) => {
  if (!c) return '';
  if (/^[A-Za-z]{2}$/.test(c)) { try { return (regionNames && regionNames.of(c.toUpperCase())) || c; } catch (e) { return c; } }
  return c;
};

const NAV = [
  { href: '/tiers/', label: 'Tier guide', key: 'tiers' },
  { href: '/promotions/', label: 'Promotions', key: 'promotions' },
  { href: '/cards/', label: 'UAE cards', key: 'cards' },
  { href: '/map/', label: 'Hotel map', key: 'map' },
];

export function renderChrome(active) {
  const header = $('siteHeader');
  if (header) {
    header.className = 'top';
    const inner = el('div', 'top-inner');
    const logo = link('/', null, 'logo');
    logo.append('Hotel', el('span', null, 'Atlas'));
    logo.setAttribute('aria-label', 'Hotel Atlas home');
    const chip = el('span', 'edition-chip', 'UAE edition');
    chip.title = 'Benefits, cards and offers are checked for UAE residents';
    const nav = el('nav', 'main-nav');
    nav.setAttribute('aria-label', 'Main');
    for (const item of NAV) {
      const a = link(item.href, item.label);
      if (item.key === active) { a.className = 'on'; a.setAttribute('aria-current', 'page'); }
      nav.append(a);
    }
    inner.append(logo, chip, nav);
    header.append(inner);
  }
  const footer = $('siteFooter');
  if (footer) {
    footer.className = 'site-footer';
    const inner = el('div', 'wrap');
    const nav = el('p', 'foot-links');
    nav.append(link('/', 'Home'));
    for (const item of NAV) nav.append(link(item.href, item.label));
    const prog = el('p', 'foot-links');
    for (const g of groups) prog.append(link(g.loyaltyUrl, g.program));
    inner.append(
      nav,
      el('p', null, 'Hotel Atlas is independent and not affiliated with or endorsed by any hotel group or bank. Programs change terms during the year; the official page always wins.'),
      prog,
      el('p', 'muted', '© ' + new Date().getFullYear() + ' Hotel Atlas · Content checked ' + shortDate(edition.checked)),
    );
    footer.append(inner);
  }
}

// Sources list for a set of items with `sources: [{url, label}]`.
export function renderSources(target, items) {
  const seen = new Map();
  for (const it of items) for (const s of it.sources || []) if (s.url && !seen.has(s.url)) seen.set(s.url, s.label || s.url);
  for (const [url, label] of seen) { const li = el('li'); li.append(link(url, label)); target.append(li); }
}

/* ---------- hotel data ---------- */
export const isUAE = (h) => /^(ae|united arab emirates)$/i.test(h.country || '');

async function loadCatalog(path) {
  const r = await fetch(path, { cache: 'no-store' });
  if (!r.ok) throw Error(path + ' HTTP ' + r.status);
  const d = await r.json();
  if (!Array.isArray(d.hotels)) throw Error(path + ' invalid data');
  return d;
}

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

const validHotel = (h) => Number.isFinite(h.lat) && Number.isFinite(h.lon) && h.name && groups.some((g) => g.id === h.group);

export async function loadHotels() {
  const [atpRes, osmRes] = await Promise.allSettled([loadCatalog('/data/hotels_atp.json'), loadCatalog('/data/hotels.json')]);
  if (atpRes.status === 'rejected' && osmRes.status === 'rejected') throw atpRes.reason;
  const atp = atpRes.status === 'fulfilled' ? atpRes.value.hotels.filter(validHotel) : [];
  const osm = osmRes.status === 'fulfilled' ? osmRes.value.hotels.filter(validHotel) : [];
  const hotels = mergeSources(atp, osm);
  for (const h of hotels) if (/^[a-z]{2}$/i.test(h.country || '')) h.country = h.country.toUpperCase();
  return { hotels, atpUpdated: atpRes.status === 'fulfilled' ? atpRes.value.updated_at : null, osmExtra: hotels.length - atp.length };
}

// Reads only the header of hotels_atp.json (counts per spider and per country).
export async function loadHotelSummary() {
  const r = await fetch('/data/hotels_atp.json', { headers: { Range: 'bytes=0-16383' }, cache: 'no-store' });
  if (!r.ok) throw Error('HTTP ' + r.status);
  const text = await r.text();
  const cut = text.indexOf(',"hotels":[');
  if (cut < 0) throw Error('No header');
  return JSON.parse(text.slice(0, cut) + '}');
}
