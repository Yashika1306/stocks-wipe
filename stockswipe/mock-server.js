/**
 * StockSwipe mock API — pure Node.js, no dependencies.
 * Run: node mock-server.js
 */
const http = require('http');
const PORT = process.env.PORT || 8000;
const DISCLAIMER = 'This is not investment advice. All portfolios are simulated.';

// ── JWT ───────────────────────────────────────────────────────────────────────
function makeToken(userId) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const p = Buffer.from(JSON.stringify({ sub: userId, exp: 9999999999 })).toString('base64');
  return `${h}.${p}.mock_sig`;
}

// ── Missions templates ────────────────────────────────────────────────────────
const MISSION_TEMPLATES = [
  { id: 'swipe_energy',    title: 'Energy Explorer',    desc: 'Swipe 10 Energy stocks this week',     sector: 'Energy',    target: 10, reward: 50  },
  { id: 'swipe_tech',      title: 'Tech Enthusiast',    desc: 'Swipe 15 Technology stocks this week', sector: 'Technology',target: 15, reward: 60  },
  { id: 'add_portfolio_3', title: 'Portfolio Builder',  desc: 'Add 3 stocks to your portfolio',       sector: null,        target: 3,  reward: 75  },
  { id: 'beat_spy',        title: 'Market Beater',      desc: 'Portfolio return beats SPY by 2%',     sector: null,        target: 1,  reward: 150 },
  { id: 'streak_7',        title: '7-Day Streak',       desc: 'Swipe every day for 7 days',           sector: null,        target: 7,  reward: 100 },
  { id: 'sectors_5',       title: 'Sector Explorer',    desc: 'Swipe stocks from 5+ sectors',         sector: null,        target: 5,  reward: 80  },
];

function getMissions() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return MISSION_TEMPLATES.slice(0, 4).map((m, i) => ({
    ...m,
    progress: [3, 7, 1, 0][i],
    completed: [false, false, false, false][i],
    deadline: sunday.toISOString().split('T')[0],
  }));
}

// ── Cards ─────────────────────────────────────────────────────────────────────
const FRIEND_NAMES = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley'];
function friendConsensus() {
  const total   = Math.floor(Math.random() * 6) + 1;
  const bullish = Math.floor(Math.random() * (total + 1));
  const names   = FRIEND_NAMES.slice(0, Math.min(2, bullish));
  return { bullish, total, names };
}

function makeSparkline(start, n = 30, trend = 0.001) {
  const p = [start];
  for (let i = 1; i < n; i++) p.push(+(p[i-1] * (1 + (Math.random()-0.5+trend)*0.025)).toFixed(2));
  return p;
}

const BASE_CARDS = [
  { ticker:'NVDA', name:'NVIDIA Corporation',          sector:'Technology',             composite_score:87.3, price:134.22, change_pct: 2.14, tags:['Strong momentum','AI tailwind','Analyst upgrades'] },
  { ticker:'AAPL', name:'Apple Inc.',                  sector:'Technology',             composite_score:72.1, price:213.49, change_pct: 0.83, tags:['Cheap vs peers','Strong buybacks'] },
  { ticker:'MSFT', name:'Microsoft Corporation',       sector:'Technology',             composite_score:79.5, price:418.34, change_pct: 1.22, tags:['Strong momentum','Cloud growth'] },
  { ticker:'TSLA', name:'Tesla Inc.',                  sector:'Consumer Discretionary', composite_score:55.2, price:172.80, change_pct:-1.45, tags:['High volatility','Weak value'] },
  { ticker:'JPM',  name:'JPMorgan Chase & Co.',        sector:'Financials',             composite_score:68.7, price:241.50, change_pct: 0.57, tags:['Cheap vs peers','Rising rates'] },
  { ticker:'XOM',  name:'Exxon Mobil Corporation',     sector:'Energy',                 composite_score:63.4, price:114.20, change_pct:-0.32, tags:['Cheap vs peers','High yield'] },
  { ticker:'CVX',  name:'Chevron Corporation',         sector:'Energy',                 composite_score:61.1, price:152.30, change_pct:-0.18, tags:['Strong dividend','Energy demand'] },
  { ticker:'META', name:'Meta Platforms Inc.',          sector:'Technology',             composite_score:81.0, price:533.80, change_pct: 3.11, tags:['Strong momentum','Positive buzz'] },
  { ticker:'GOOGL',name:'Alphabet Inc.',               sector:'Technology',             composite_score:76.2, price:175.40, change_pct: 1.05, tags:['Cheap vs peers','Strong momentum'] },
  { ticker:'AMZN', name:'Amazon.com Inc.',              sector:'Consumer Discretionary', composite_score:74.8, price:198.70, change_pct: 1.78, tags:['Cloud leader','Strong momentum'] },
  { ticker:'LLY',  name:'Eli Lilly and Company',       sector:'Healthcare',             composite_score:83.9, price:882.10, change_pct: 2.66, tags:['Strong momentum','GLP-1 growth'] },
  { ticker:'V',    name:'Visa Inc.',                   sector:'Financials',             composite_score:70.3, price:295.60, change_pct: 0.42, tags:['Consistent compounder','Cheap vs peers'] },
  { ticker:'UNH',  name:'UnitedHealth Group',          sector:'Healthcare',             composite_score:61.7, price:490.30, change_pct:-2.10, tags:['Negative sentiment','Cheap vs peers'] },
  { ticker:'HD',   name:'Home Depot Inc.',             sector:'Consumer Discretionary', composite_score:58.4, price:378.90, change_pct:-0.65, tags:['Weak momentum','Cheap vs peers'] },
  { ticker:'AVGO', name:'Broadcom Inc.',               sector:'Technology',             composite_score:84.7, price:221.40, change_pct: 1.93, tags:['Strong momentum','AI chips'] },
  { ticker:'COST', name:'Costco Wholesale',            sector:'Consumer Staples',       composite_score:69.2, price:918.30, change_pct: 0.34, tags:['Consistent compounder','Expensive vs peers'] },
  { ticker:'AMD',  name:'Advanced Micro Devices',      sector:'Technology',             composite_score:78.8, price:162.70, change_pct: 2.45, tags:['Strong momentum','Data center'] },
  { ticker:'NEE',  name:'NextEra Energy',              sector:'Utilities',              composite_score:52.3, price: 73.60, change_pct:-0.88, tags:['Cheap vs peers','Rate sensitive'] },
  { ticker:'BA',   name:'Boeing Company',              sector:'Industrials',            composite_score:38.1, price:162.40, change_pct:-1.22, tags:['Weak momentum','Negative sentiment'] },
  { ticker:'PFE',  name:'Pfizer Inc.',                 sector:'Healthcare',             composite_score:34.5, price: 25.80, change_pct:-0.77, tags:['Weak momentum','Pipeline concerns'] },
];

const CARDS = BASE_CARDS.map(c => ({
  ticker: c.ticker, name: c.name, sector: c.sector,
  composite_score: c.composite_score,
  factor_tags: c.tags,
  sparkline: makeSparkline(c.price * 0.92),
  price: c.price, change_pct: c.change_pct,
  friend_consensus: friendConsensus(),
}));

// ── Portfolio ─────────────────────────────────────────────────────────────────
const MOCK_PORTFOLIO = {
  positions: [
    { ticker:'NVDA', entry_price:118.4,  current_price:134.22, return_pct: 13.36, entry_date:'2026-03-10' },
    { ticker:'META', entry_price:498.2,  current_price:533.80, return_pct:  7.15, entry_date:'2026-03-14' },
    { ticker:'TSLA', entry_price:195.3,  current_price:172.80, return_pct:-11.52, entry_date:'2026-03-20' },
    { ticker:'LLY',  entry_price:820.0,  current_price:882.10, return_pct:  7.57, entry_date:'2026-04-01' },
  ],
  total_return: 4.14, hit_rate: 0.75,
  best_call:  { ticker:'NVDA', entry_price:118.4, current_price:134.22, return_pct:13.36, entry_date:'2026-03-10' },
  worst_call: { ticker:'TSLA', entry_price:195.3, current_price:172.80, return_pct:-11.52, entry_date:'2026-03-20' },
  disclaimer: DISCLAIMER,
};

// ── Leaderboard ───────────────────────────────────────────────────────────────
const MOCK_LEADERBOARD = {
  entries: [
    { rank:1,  display_name:'BullishBull',   total_return:24.3, swipe_count:342, badge:'👑' },
    { rank:2,  display_name:'AlphaSeeker',   total_return:18.7, swipe_count:289, badge:'🥈' },
    { rank:3,  display_name:'QuietHedge',    total_return:15.2, swipe_count:201, badge:'🥉' },
    { rank:4,  display_name:'MomentumKing',  total_return:12.8, swipe_count:188, badge:'' },
    { rank:5,  display_name:'ValueHunter',   total_return: 9.4, swipe_count:156, badge:'' },
    { rank:6,  display_name:'You',           total_return: 4.1, swipe_count: 47, badge:'' },
    { rank:7,  display_name:'TechBro2026',   total_return: 2.9, swipe_count:134, badge:'' },
    { rank:8,  display_name:'DividentDave',  total_return: 1.2, swipe_count: 98, badge:'' },
    { rank:9,  display_name:'ContrarianCal', total_return:-1.5, swipe_count: 77, badge:'' },
    { rank:10, display_name:'NewbieNick',    total_return:-3.8, swipe_count: 23, badge:'' },
  ],
  your_rank: 6,
  week_reset: '2026-04-28',
};

// ── Friends ───────────────────────────────────────────────────────────────────
// In-memory store so joins persist during a server session
const friendStore = {
  // invite-code → userId
  codes: { 'JHANVI7': 'user-jhanvi', 'YASHIKA8': 'mock-user-001' },
  // userId → array of friend objects
  friends: {
    'mock-user-001': [
      { id:'user-jhanvi',  display_name:'Jhanvi',   avatar_color:'#a855f7', streak_days:12, mutual_streak:9,  total_return:11.4, swipe_count:134, last_active:'2026-04-25', is_online:true  },
      { id:'user-alex',    display_name:'Alex',     avatar_color:'#3d8ef0', streak_days:5,  mutual_streak:4,  total_return: 6.8, swipe_count: 89, last_active:'2026-04-24', is_online:false },
      { id:'user-sam',     display_name:'Sam',      avatar_color:'#00c9a7', streak_days:21, mutual_streak:14, total_return: 8.2, swipe_count:201, last_active:'2026-04-25', is_online:true  },
      { id:'user-morgan',  display_name:'Morgan',   avatar_color:'#f39c12', streak_days:3,  mutual_streak:2,  total_return:-2.1, swipe_count: 45, last_active:'2026-04-23', is_online:false },
    ],
  },
};

function getFriends(userId) {
  return friendStore.friends[userId] || [];
}

function joinByCode(code, joiningUserId) {
  const ownerId = friendStore.codes[code.toUpperCase()];
  if (!ownerId || ownerId === joiningUserId) return { ok: false, error: 'Invalid code' };
  // Add each other as friends (simplified)
  const newFriend = { id: joiningUserId, display_name:'New Friend', avatar_color:'#e74c3c', streak_days:1, mutual_streak:1, total_return:0, swipe_count:0, last_active: new Date().toISOString().split('T')[0], is_online:true };
  if (!friendStore.friends[ownerId]) friendStore.friends[ownerId] = [];
  if (!friendStore.friends[ownerId].find(f => f.id === joiningUserId)) {
    friendStore.friends[ownerId].push(newFriend);
  }
  console.log(`[friends] ${joiningUserId} joined ${ownerId} via code ${code}`);
  return { ok: true, owner_name: 'your friend' };
}

function getInviteCode(userId) {
  const existing = Object.entries(friendStore.codes).find(([, uid]) => uid === userId);
  if (existing) return existing[0];
  const code = Math.random().toString(36).slice(2,8).toUpperCase();
  friendStore.codes[code] = userId;
  return code;
}

// ── Active bounties ───────────────────────────────────────────────────────────
const MOCK_BOUNTIES = [
  { id:'b1', ticker:'NVDA', bet_coins:50, direction:'right', entry_price:128.4, bet_date:'2026-04-15', settled:false, current_return: 4.5 },
  { id:'b2', ticker:'META', bet_coins:25, direction:'right', entry_price:510.2, bet_date:'2026-04-18', settled:false, current_return: 4.6 },
  { id:'b3', ticker:'TSLA', bet_coins:30, direction:'left',  entry_price:182.1, bet_date:'2026-04-10', settled:true,  won:true,  coins_won:60 },
];

// ── Router ────────────────────────────────────────────────────────────────────
function respond(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'X-Disclaimer': DISCLAIMER,
  });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise(resolve => {
    let d = '';
    req.on('data', c => d += c);
    req.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  if (method === 'OPTIONS') { respond(res, 204, {}); return; }

  if (url === '/health'          && method === 'GET')  { respond(res, 200, { status:'ok' }); return; }

  if (url === '/auth/login'      && method === 'POST') {
    const b = await readBody(req);
    console.log(`[auth] login: ${b.email}`);
    respond(res, 200, { access_token: makeToken('mock-user-001'), token_type:'bearer' }); return;
  }
  if (url === '/auth/register'   && method === 'POST') {
    const b = await readBody(req);
    console.log(`[auth] register: ${b.email}`);
    respond(res, 201, { access_token: makeToken('mock-user-001'), token_type:'bearer' }); return;
  }

  if (url?.startsWith('/feed/')  && method === 'GET') {
    const shuffled = [...CARDS].sort(() => Math.random() - 0.5);
    respond(res, 200, { cards: shuffled.slice(0, 20), disclaimer: DISCLAIMER }); return;
  }

  if (url === '/swipe'           && method === 'POST') {
    const b = await readBody(req);
    console.log(`[swipe] ${b.ticker} → ${b.direction}  hesitation:${b.hesitation_ms}ms`);
    respond(res, 200, { ok:true }); return;
  }

  if (url?.startsWith('/portfolio/') && method === 'GET') {
    respond(res, 200, MOCK_PORTFOLIO); return;
  }

  if (url === '/leaderboard'     && method === 'GET')  {
    respond(res, 200, MOCK_LEADERBOARD); return;
  }

  if (url?.startsWith('/missions') && method === 'GET') {
    respond(res, 200, { missions: getMissions() }); return;
  }

  if (url?.startsWith('/coins')  && method === 'GET')  {
    respond(res, 200, { balance: 340, lifetime_earned: 520 }); return;
  }

  if (url === '/bounties'        && method === 'GET')  {
    respond(res, 200, { bounties: MOCK_BOUNTIES }); return;
  }

  if (url === '/bounties'        && method === 'POST') {
    const b = await readBody(req);
    console.log(`[bounty] ${b.ticker} bet ${b.coins} coins`);
    respond(res, 201, { ok:true, bounty_id: `b${Date.now()}` }); return;
  }

  // ── Friends routes ───────────────────────────────────────────────────────
  if (url === '/friends'         && method === 'GET') {
    respond(res, 200, { friends: getFriends('mock-user-001') }); return;
  }
  if (url === '/friends/invite-code' && method === 'GET') {
    const code = getInviteCode('mock-user-001');
    const origin = process.env.FRONTEND_URL || 'http://localhost:5173';
    respond(res, 200, { code, share_url: `${origin}/join/${code}` }); return;
  }
  if (url?.startsWith('/friends/join/') && method === 'POST') {
    const code = url.split('/').pop();
    const result = joinByCode(code, 'mock-user-001');
    respond(res, result.ok ? 200 : 400, result); return;
  }
  // Preview invite (GET) — who owns this code?
  if (url?.startsWith('/friends/preview/') && method === 'GET') {
    const code = url.split('/').pop().toUpperCase();
    const ownerId = friendStore.codes[code];
    if (!ownerId) { respond(res, 404, { error: 'Invalid invite code' }); return; }
    const ownerName = getFriends('mock-user-001').find(f => f.id === ownerId)?.display_name
      ?? (ownerId === 'user-jhanvi' ? 'Jhanvi' : ownerId === 'mock-user-001' ? 'You' : 'A friend');
    respond(res, 200, { owner_name: ownerName, code, member_count: (friendStore.friends[ownerId]?.length ?? 0) + 1 }); return;
  }

  respond(res, 404, { detail:'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n🚀  StockSwipe mock API  →  http://localhost:${PORT}\n`);
});
