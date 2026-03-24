// ===== BASILE AI — app.js =====

const LAUNCH_DATE = new Date('2026-03-23T00:00:00Z');

const MONEY_LADDER = [
  { amount: 1,       label: '1€',       reward: '"It works."' },
  { amount: 100,     label: '100€',     reward: 'Premier vrai resto' },
  { amount: 500,     label: '500€',     reward: 'Premier weekend payé par Basile' },
  { amount: 1000,    label: '1 000€',   reward: 'Premier vol' },
  { amount: 2500,    label: '2 500€',   reward: 'Setup bureau premium' },
  { amount: 5000,    label: '5 000€',   reward: 'Premier luxe réel' },
  { amount: 10000,   label: '10 000€',  reward: 'Montre de luxe' },
  { amount: 20000,   label: '20 000€',  reward: 'Business Class mindset' },
  { amount: 50000,   label: '50 000€',  reward: 'Tour du monde' },
  { amount: 100000,  label: '100 000€', reward: 'Mois de vie CEO nomade' },
  { amount: 1000000, label: '1 000 000€', reward: 'Zero Human Empire 🦖' },
];

function fmt(euros) {
  if (euros >= 1000) return (euros / 1000).toFixed(1).replace('.', ',') + ' k€';
  return euros.toFixed(2).replace('.', ',') + ' €';
}

function getDayCount() {
  const now = new Date();
  const diff = Math.floor((now - LAUNCH_DATE) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff + 1);
}

function renderLadder(lifetimeEuros) {
  const container = document.getElementById('ladder-items');
  if (!container) return;

  let currentIdx = MONEY_LADDER.findIndex(r => lifetimeEuros < r.amount);
  if (currentIdx === -1) currentIdx = MONEY_LADDER.length; // all done

  const showFrom = Math.max(0, currentIdx - 1);
  const showTo   = Math.min(MONEY_LADDER.length, currentIdx + 4);
  const visible  = MONEY_LADDER.slice(showFrom, showTo);

  container.innerHTML = visible.map((rung, i) => {
    const absoluteIdx = showFrom + i;
    const isDone    = lifetimeEuros >= rung.amount;
    const isCurrent = absoluteIdx === currentIdx;

    const cls = isDone ? 'done' : isCurrent ? 'current' : '';
    const prefix = isDone ? '✓' : isCurrent ? '▶' : '○';

    return `
      <div class="ladder-item ${cls}">
        <div class="ladder-dot"></div>
        <span class="ladder-amount">${rung.label}</span>
        <span class="ladder-reward">${prefix} ${rung.reward}</span>
      </div>
    `;
  }).join('');
}

async function loadRevenue() {
  const els = {
    today:    document.getElementById('revenue-today'),
    lifetime: document.getElementById('revenue-lifetime'),
    month:    document.getElementById('revenue-month'),
  };

  // Set loading state
  Object.values(els).forEach(el => { if (el) el.classList.add('loading'); });

  try {
    const res = await fetch('/api/revenue');
    if (!res.ok) throw new Error('API error');
    const data = await res.json();

    const today    = (data.today_eur    ?? 0);
    const lifetime = (data.lifetime_eur ?? 0);
    const month    = (data.month_eur    ?? 0);

    if (els.today)    { els.today.textContent    = fmt(today);    els.today.classList.remove('loading'); }
    if (els.lifetime) { els.lifetime.textContent = fmt(lifetime); els.lifetime.classList.remove('loading'); }
    if (els.month)    { els.month.textContent    = fmt(month);    els.month.classList.remove('loading'); }

    renderLadder(lifetime);

  } catch (e) {
    // Fallback: show 0€ (API not reachable / dev mode)
    if (els.today)    { els.today.textContent    = '0,00 €'; els.today.classList.remove('loading'); }
    if (els.lifetime) { els.lifetime.textContent = '0,00 €'; els.lifetime.classList.remove('loading'); }
    if (els.month)    { els.month.textContent    = '0,00 €'; els.month.classList.remove('loading'); }
    renderLadder(0);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Day counter
  const dayEl = document.getElementById('day-count');
  if (dayEl) dayEl.textContent = getDayCount();

  // Month label
  const monthLabel = document.getElementById('revenue-month-label');
  if (monthLabel) {
    const months = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
    const now = new Date();
    monthLabel.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
  }

  // Revenue
  loadRevenue();
});
