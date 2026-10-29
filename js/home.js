import { $, el, fmt, dot, shortDate, shortName, edition, groups, renderChrome, loadHotelSummary } from './common.js';

renderChrome('home');
$('checkedLine').replaceChildren('Benefits, cards and offers checked for UAE residents on ', el('b', null, shortDate(edition.checked)), '.');

const ladders = $('hubLadders');
for (const p of edition.programs) {
  const li = el('li', 'ladder');
  const name = el('span', 'ladder-name');
  name.append(dot(p.id), p.short);
  const steps = el('span', 'ladder-steps');
  p.tiers.forEach((t, i) => {
    if (i) steps.append(el('span', 'sep', '›'));
    steps.append(el('span', t.name === p.breakfastFrom ? 'hit' : '', t.name));
  });
  li.append(name, steps);
  ladders.append(li);
}

const open = edition.promos.filter((p) => p.stayTo);
$('hubPromoCount').textContent = edition.promos.length;
for (const pr of open.slice(0, 3)) {
  const li = el('li');
  li.append(dot(pr.program), el('span', 't', pr.title));
  $('hubPromos').append(li);
}

$('hubCardCount').textContent = edition.cards.length;
for (const c of edition.cards.slice(0, 3)) {
  const li = el('li');
  li.append(dot(c.program), el('span', 't', c.bank + ' · ' + c.card));
  $('hubCards').append(li);
}

const withNights = edition.programs.filter((p) => Number.isFinite(p.breakfastNights));
const max = Math.max(...withNights.map((p) => p.breakfastNights), 1);
for (const p of withNights) {
  const row = el('div', 'bar-row');
  const track = el('div', 'bar-track');
  const fill = el('div', 'bar-fill');
  fill.style.width = (p.breakfastNights / max) * 100 + '%';
  track.append(fill);
  row.append(el('span', null, p.short), track, el('span', 'num', String(p.breakfastNights)));
  $('hubBars').append(row);
}

for (const g of groups) {
  const s = el('span');
  s.append(dot(g.id), shortName(g.id));
  $('hubChainDots').append(s);
}

try {
  const sum = await loadHotelSummary();
  const total = Object.values(sum.groups || {}).reduce((a, b) => a + b, 0);
  const countries = Object.keys(sum.countries || {}).filter((c) => c !== '??').length;
  const uae = (sum.countries || {}).AE || 0;
  if (total) {
    $('hubHotelCount').textContent = fmt(total);
    $('hubHotelSub').textContent = 'hotels in ' + countries + ' countries' + (uae ? ', ' + fmt(uae) + ' in the UAE' : '');
  }
} catch (e) {
  console.error(e);
}
