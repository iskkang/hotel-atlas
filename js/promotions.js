import { $, el, dot, link, shortDate, programName, shortName, edition, renderChrome, renderSources } from './common.js';

renderChrome('promotions');
renderSources($('sourceList'), edition.promos);
$('checkedLine').replaceChildren('Checked ', el('b', null, shortDate(edition.checked)), '. Offers past their end date drop off at the next update.');
if (edition.notes && edition.notes.promos) $('promosNote').textContent = edition.notes.promos;

const daysLeft = (iso) => Math.ceil((Date.parse(iso + 'T23:59:59Z') - Date.now()) / 864e5);
const live = edition.promos.filter((p) => !p.stayTo || daysLeft(p.stayTo) >= 0);
let filter = '';

function card(pr) {
  const c = el('article', 'promo-card');
  const top = el('div', 'promo-top');
  const tag = el('span', 'prog-tag');
  tag.append(dot(pr.program), programName(pr.program));
  top.append(tag, el('span', 'pill', pr.region === 'Status offer' ? 'Status' : 'Bonus points'));
  c.append(top, el('h3', null, pr.title), el('p', null, pr.offer));
  if (pr.limits) c.append(el('p', 'limits', pr.limits));
  const dates = el('div', 'promo-dates');
  if (pr.register) dates.append(el('span', 'pill reg', 'Register first' + (pr.registerBy ? ' · by ' + shortDate(pr.registerBy) : '')));
  if (pr.stayTo) {
    const left = daysLeft(pr.stayTo);
    dates.append(el('span', 'pill' + (left <= 14 ? ' soon' : ''), 'Stay ' + (pr.stayFrom ? shortDate(pr.stayFrom) + ' – ' : 'by ') + shortDate(pr.stayTo)));
  } else {
    dates.append(el('span', 'pill', 'No end date'));
  }
  c.append(dates);
  if (pr.url) c.append(link(pr.url, 'Offer page ↗', 'out'));
  return c;
}

function render() {
  const pick = (list) => list.filter((p) => !filter || p.program === filter);
  const open = pick(live.filter((p) => p.region !== 'Status offer')).sort((a, b) => (a.stayTo || '9').localeCompare(b.stayTo || '9'));
  const status = pick(live.filter((p) => p.region === 'Status offer'));
  $('openGrid').replaceChildren(...(open.length ? open.map(card) : [el('p', 'note', 'No open bonus-points offer for this program.')]));
  $('statusGrid').replaceChildren(...(status.length ? status.map(card) : [el('p', 'note', 'No public status offer for this program right now.')]));
  $('openHead').textContent = 'Bonus points open now · ' + open.length;
  $('statusHead').textContent = 'Status matches and challenges · ' + status.length;
  document.querySelectorAll('#promoChips button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === filter)));
}

const programs = [...new Set(edition.programs.map((p) => p.id))];
const all = el('button', 'chip', 'All ' + live.length);
all.type = 'button';
all.dataset.id = '';
all.addEventListener('click', () => { filter = ''; render(); });
$('promoChips').append(all);
for (const id of programs) {
  const n = live.filter((p) => p.program === id).length;
  const b = el('button', 'chip');
  b.type = 'button';
  b.dataset.id = id;
  b.append(dot(id), shortName(id) + ' ', el('span', 'num', String(n)));
  b.disabled = n === 0;
  b.addEventListener('click', () => { filter = id; render(); });
  $('promoChips').append(b);
}
render();
