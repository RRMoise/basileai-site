// /api/revenue.js — Vercel serverless function
// Returns Stripe revenue metrics in EUR

const https = require('https');

function stripeGet(path, secretKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.stripe.com',
      path,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function startOfDayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

function startOfMonthUTC() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

async function fetchCharges(secretKey, params) {
  const qs = new URLSearchParams(params).toString();
  let all = [];
  let hasMore = true;
  let startingAfter = null;

  while (hasMore) {
    let url = `/v1/charges?${qs}&limit=100`;
    if (startingAfter) url += `&starting_after=${startingAfter}`;

    const page = await stripeGet(url, secretKey);
    if (page.error) throw new Error(page.error.message);

    const succeeded = (page.data || []).filter(c => c.status === 'succeeded' && !c.refunded);
    all = all.concat(succeeded);
    hasMore = page.has_more;
    if (hasMore && page.data.length > 0) {
      startingAfter = page.data[page.data.length - 1].id;
    }
  }

  return all;
}

function sumEur(charges) {
  return charges.reduce((sum, c) => {
    const eur = c.currency.toLowerCase() === 'eur'
      ? c.amount / 100
      : (c.amount / 100) * (c.eur_rate || 1); // fallback, ideally convert
    return sum + eur;
  }, 0);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({ error: 'STRIPE_SECRET_KEY not configured' });
  }

  try {
    const todayStart  = startOfDayUTC();
    const monthStart  = startOfMonthUTC();

    // Fetch in parallel
    const [todayCharges, monthCharges, lifetimeCharges] = await Promise.all([
      fetchCharges(secretKey, { 'created[gte]': todayStart }),
      fetchCharges(secretKey, { 'created[gte]': monthStart }),
      fetchCharges(secretKey, {}),
    ]);

    return res.status(200).json({
      today_eur:    sumEur(todayCharges),
      month_eur:    sumEur(monthCharges),
      lifetime_eur: sumEur(lifetimeCharges),
      today_count:    todayCharges.length,
      month_count:    monthCharges.length,
      lifetime_count: lifetimeCharges.length,
      updated_at: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[revenue api]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
