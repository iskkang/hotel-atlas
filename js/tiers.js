import { $, el, dot, link, edition, renderChrome, renderSources } from './common.js';

renderChrome('tiers');
renderSources($('sourceList'), edition.programs);

/* ---------- tabs ---------- */
const TABS = ['basics', 'guides', 'compare'];
function showTab() {
  const raw = location.hash.replace('#', '');
  const tab = TABS.includes(raw) ? raw : 'basics';
  document.querySelectorAll('.tab-panel').forEach((p) => { p.hidden = p.dataset.panel !== tab; });
  document.querySelectorAll('.tabs a').forEach((a) => {
    const on = a.dataset.tab === tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
window.addEventListener('hashchange', showTab);
showTab();

/* ---------- basics: ladder chart ---------- */
const SCALE = 120; // nights shown on the axis; room past 100 for top tiers
const pct = (n) => (n / SCALE) * 100 + '%';
const chart = $('ladderChart');
const axis = el('div', 'lc-row lc-axis');
axis.append(el('span', 'lc-name'));
const axisTrack = el('div', 'lc-track');
for (let n = 0; n <= 100; n += 10) {
  const t = el('span', 'lc-tick num', n === 100 ? '100 nights' : String(n));
  t.style.left = pct(n);
  axisTrack.append(t);
}
axis.append(axisTrack, el('span', 'lc-extra lc-extra-head', 'Points only'));
chart.append(axis);

for (const p of edition.programs) {
  const row = el('div', 'lc-row');
  row.setAttribute('role', 'row');
  const name = el('span', 'lc-name');
  name.append(dot(p.id), p.program);
  const track = el('div', 'lc-track');
  const ranked = p.tiers.map((t, i) => ({ t, i, n: p.tierNights[i] })).filter((x) => x.n > 0);
  ranked.forEach((x, k) => {
    const start = Math.min(x.n, SCALE);
    const nextN = ranked[k + 1] ? ranked[k + 1].n : SCALE;
    const end = Math.min(Math.max(nextN, start + 8), SCALE);
    const seg = el('div', 'lc-seg step-' + Math.min(k + 1, 5) + (x.t.name === p.breakfastFrom ? ' hit' : ''));
    seg.style.left = pct(start);
    seg.style.width = pct(end - start);
    seg.title = x.t.name + ': ' + x.t.qualify;
    seg.append(el('b', null, x.t.name), el('small', null, x.n + ' nights'));
    track.append(seg);
  });
  const extra = el('div', 'lc-extra');
  p.tiers.forEach((t, i) => {
    if (p.tierNights[i] === null && i > 0) {
      const box = el('div', 'lc-seg-x' + (t.name === p.breakfastFrom ? ' hit' : ''));
      box.append(el('b', null, t.name), el('small', null, t.qualify));
      extra.append(box);
    }
  });
  row.append(name, track, extra);
  chart.append(row);
}

/* ---------- basics: benefits ---------- */
const BENEFITS = [
  { name: 'Bonus points', text: 'A percentage on top of the base points from each stay.', from: 'First tier', level: 1 },
  { name: 'Late checkout', text: 'Leave later than the standard time; top tiers get a guaranteed hour.', from: 'First tier', level: 1 },
  { name: 'Room upgrades', text: 'A better room than the one you booked, if one is free that day.', from: 'Middle tiers', level: 2 },
  { name: 'Breakfast and lounges', text: 'Club lounge entry or free breakfast. The starting tier varies most between chains.', from: 'Upper tiers', level: 3 },
  { name: 'Suites and yearly picks', text: 'Suite upgrades and annual choices such as free-night or lounge passes.', from: 'Top tiers', level: 3 },
];
for (const b of BENEFITS) {
  const card = el('article', 'benefit');
  const meter = el('div', 'meter');
  meter.setAttribute('aria-hidden', 'true');
  // Three steps = lower, middle and top tiers; filled where the benefit is usually given.
  for (let i = 1; i <= 3; i++) meter.append(el('span', i >= b.level ? 'on' : ''));
  const foot = el('p', 'benefit-from');
  foot.append('Usually from ', el('b', null, b.from));
  card.append(el('h3', null, b.name), el('p', null, b.text), meter, foot);
  $('benefitGrid').append(card);
}

/* ---------- detailed guides ---------- */
let current = edition.programs[0].id;
function renderDetail() {
  const p = edition.programs.find((x) => x.id === current);
  const card = el('article', 'program');
  const h = el('h2');
  h.append(dot(p.id), p.program);
  card.append(h, el('p', 'meta', p.yearNote || '2026 qualification year'));
  const list = el('div', 'tier-list');
  for (const t of p.tiers) {
    const box = el('div', 'tier' + (t.name === p.breakfastFrom ? ' hit' : ''));
    const top = el('div', 'tier-top');
    const nm = el('span', 'tier-name', t.name);
    if (t.name === p.breakfastFrom) nm.append(el('span', 'pill reg', 'Breakfast in the UAE'));
    top.append(nm, el('span', 'tier-qual', t.qualify));
    box.append(top);
    if (t.benefits && t.benefits.length) {
      const ul = el('ul');
      for (const b of t.benefits) ul.append(el('li', null, b));
      box.append(ul);
    }
    list.append(box);
  }
  card.append(list);
  if (p.uaeNote) { const f = el('div', 'flag'); f.append(el('b', null, 'In the UAE: '), p.uaeNote); card.append(f); }
  if (p.sources && p.sources.length) {
    const s = el('p', 'src', 'Checked: ');
    p.sources.forEach((src, i) => { if (i) s.append(' · '); s.append(link(src.url, src.label)); });
    card.append(s);
  }
  $('programDetail').replaceChildren(card);
  document.querySelectorAll('#programChips button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.id === current)));
}
for (const p of edition.programs) {
  const b = el('button', 'chip');
  b.type = 'button';
  b.dataset.id = p.id;
  b.setAttribute('role', 'tab');
  b.append(dot(p.id), p.short);
  b.addEventListener('click', () => { current = p.id; renderDetail(); });
  $('programChips').append(b);
}
renderDetail();

/* ---------- compare ---------- */
for (const p of edition.programs) {
  const tr = el('tr');
  const th = el('th', 'prog');
  th.scope = 'row';
  th.append(dot(p.id), ' ', p.program);
  const cell = (main, sub) => { const td = el('td'); td.append(main || '—'); if (sub) td.append(el('small', null, sub)); return td; };
  const top = p.tiers[p.tiers.length - 1];
  tr.append(th, cell(p.breakfastFrom, p.breakfastQualify), cell(p.loungeFrom, p.loungeQualify), cell(top.name, top.qualify));
  $('compareBody').append(tr);
}
const withNights = edition.programs.filter((p) => Number.isFinite(p.breakfastNights));
const max = Math.max(...withNights.map((p) => p.breakfastNights), 1);
for (const p of withNights) {
  const row = el('div', 'bar-row');
  const track = el('div', 'bar-track');
  const fill = el('div', 'bar-fill');
  fill.style.width = (p.breakfastNights / max) * 100 + '%';
  track.append(fill);
  const label = el('span');
  label.append(p.short + ' · ' + p.breakfastFrom);
  row.append(label, track, el('span', 'num', String(p.breakfastNights)));
  $('compareBars').append(row);
}
