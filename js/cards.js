import { $, el, dot, link, shortDate, programName, edition, renderChrome, renderSources } from './common.js';

renderChrome('cards');
renderSources($('sourceList'), edition.cards);

const banks = [...new Set(edition.cards.map((c) => c.bank))];
$('headNote').textContent = 'Annual fees, salary minimums, status and current offers for ' + edition.cards.length + ' cards from ' + banks.join(', ') + '. Checked on each bank’s own page on ' + shortDate(edition.checked) + '.';
$('glanceHead').textContent = 'All ' + edition.cards.length + ' cards at a glance';
if (edition.notes && edition.notes.cards) $('cardsNote').textContent = edition.notes.cards;

const anchor = (c) => 'card-' + (c.bank + '-' + c.card).toLowerCase().replace(/[^a-z0-9]+/g, '-');

for (const c of edition.cards) {
  const tr = el('tr');
  const th = el('th', 'prog');
  th.scope = 'row';
  const a = el('a', null, c.card);
  a.href = '#' + anchor(c);
  th.append(el('small', null, c.bank), a);
  tr.append(th, el('td', null, c.fee), el('td', null, c.salary || '—'), el('td', null, c.status), el('td', null, c.earn));
  $('glanceBody').append(tr);
}

const order = [...new Set(edition.cards.map((c) => c.program))];
for (const pid of order) {
  const cards = edition.cards.filter((c) => c.program === pid);
  const head = el('h2', 'sub group-head');
  if (pid !== 'multi') head.append(dot(pid));
  head.append((cards[0].programLabel || programName(pid)) + ' ', el('span', 'num muted', String(cards.length)));
  const grid = el('div', 'card-grid');
  for (const c of cards) {
    const card = el('article', 'bank-card');
    card.id = anchor(c);
    card.append(el('span', 'bank', c.bank), el('h3', null, c.card));
    const dl = el('dl');
    const row = (k, v) => { if (!v) return; dl.append(el('dt', null, k), el('dd', null, v)); };
    row('Annual fee', c.fee);
    row('Min. salary', c.salary);
    row('Status', c.status);
    row('Earn', c.earn);
    card.append(dl);
    if (c.offer) {
      const offer = el('div', 'offer');
      offer.append(el('b', null, 'Current offer'), c.offer + (c.offerEnds ? ' Apply by ' + shortDate(c.offerEnds) + '.' : ''));
      card.append(offer);
    }
    if (c.url) card.append(link(c.url, 'See the bank’s page ↗', 'out'));
    grid.append(card);
  }
  $('byProgram').append(head, grid);
}
