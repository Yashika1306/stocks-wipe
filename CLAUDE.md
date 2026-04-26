          # CLAUDE.md — Swipe Right for Stocks

> **Project codename:** `stockswipe`
> **Tagline:** Tinder for investing — ML-ranked stock cards, gamified swiping, reinforcement feedback loop.
> **Stack snapshot:** Python (ML/API) · React Native/Expo (mobile) · FastAPI · PostgreSQL · TimescaleDB · Redis · Kafka · FinBERT

---

## What this project is

A mobile-first investing app that presents users with a Tinder-style stack of stock cards. Users swipe right (bullish/watchlist) or left (pass) on each stock. Every swipe is a data point that feeds back into a personalized ML recommendation engine. The core loop: better swipe data → better model → better cards → more swipes.

**This is not a trading platform.** V1 is paper trading only. No real money moves. All portfolio tracking is simulated. Regulatory framing: entertainment + financial education, not investment advice. Every screen carries a disclaimer.

---

## Repository structure

```
stockswipe/
├── CLAUDE.md                  ← you are here
├── data/
│   ├── ingestion/             ← data pipeline scripts
│   │   ├── price_feed.py      ← Polygon.io OHLCV ingestion
│   │   ├── fundamentals.py    ← Simfin / Compustat pull
│   │   ├── sentiment_feed.py  ← Reddit/StockTwits/news scraper
│   │   └── options_flow.py    ← unusual options activity feed
│   ├── quality/
│   │   ├── stale_check.py     ← staleness + gap detection
│   │   ├── corp_actions.py    ← split/dividend adjustment
│   │   └── survivorship.py    ← delisted ticker handling
│   └── schemas/
│       └── timescale_init.sql ← TimescaleDB hypertable setup
│
├── ml/
│   ├── factors/
│   │   ├── momentum.py        ← 12-1 momentum, RSI(14), MACD signal
│   │   ├── value.py           ← P/E, P/B, EV/EBITDA sector-normalized
│   │   └── sentiment.py       ← FinBERT inference → [-1,1] per ticker/day
│   ├── scoring/
│   │   ├── composite.py       ← z-score cross-sectionally, linear blend
│   │   ├── weights.py         ← per-user learned factor weights
│   │   └── batch_score.py     ← daily scoring job (runs 6am ET)
│   ├── retraining/
│   │   ├── reward.py          ← 30-day forward return vs SPY benchmark
│   │   ├── bandit_update.py   ← Thompson sampling weight update
│   │   └── retrain_job.py     ← weekly retraining pipeline
│   ├── monitoring/
│   │   ├── drift_detection.py ← PSI on feature distributions
│   │   └── regime_alert.py    ← factor correlation regime change
│   └── backtest/
│       └── harness.py         ← evaluate model changes before deploy
│
├── api/
│   ├── main.py                ← FastAPI app entrypoint
│   ├── routers/
│   │   ├── feed.py            ← GET /feed/{user_id} → ranked card queue
│   │   ├── swipe.py           ← POST /swipe → record action + emit event
│   │   ├── portfolio.py       ← GET /portfolio/{user_id} → paper returns
│   │   └── leaderboard.py     ← GET /leaderboard → opt-in rankings
│   ├── services/
│   │   ├── recommendation.py  ← ML score + collab filter blend
│   │   ├── user_profile.py    ← sector/factor preference model
│   │   └── paper_trade.py     ← simulated portfolio tracking
│   ├── models/
│   │   ├── user.py            ← SQLAlchemy user + swipe history models
│   │   └── stock.py           ← stock metadata + daily score models
│   └── middleware/
│       ├── auth.py            ← JWT validation
│       ├── rate_limit.py      ← feed anti-gaming limiter
│       └── disclaimer.py      ← injects "not financial advice" metadata
│
├── mobile/
│   ├── app/
│   │   ├── (tabs)/
│   │   │   ├── swipe.tsx      ← main card stack screen
│   │   │   ├── portfolio.tsx  ← paper performance vs SPY
│   │   │   └── leaderboard.tsx
│   │   └── _layout.tsx
│   ├── components/
│   │   ├── StockCard.tsx      ← card UI: ticker, sparkline, score badge, factors
│   │   ├── CardStack.tsx      ← swipe gesture stack (Reanimated 2)
│   │   ├── Sparkline.tsx      ← 30-day mini chart (Victory Native)
│   │   ├── ScoreBadge.tsx     ← composite score pill (0–100)
│   │   ├── FactorTag.tsx      ← "Strong momentum", "Cheap vs peers" etc
│   │   └── StreakBanner.tsx   ← daily streak gamification
│   ├── hooks/
│   │   ├── useFeed.ts         ← fetch + cache card queue
│   │   ├── useSwipe.ts        ← gesture handler + API emit
│   │   └── usePortfolio.ts    ← paper portfolio polling
│   └── constants/
│       ├── api.ts             ← base URL, endpoints
│       └── theme.ts           ← colors, typography
│
├── infra/
│   ├── docker-compose.yml     ← local dev: postgres, timescale, redis, kafka
│   ├── k8s/                   ← production manifests
│   └── terraform/             ← cloud infra (AWS EKS + RDS + ElastiCache)
│
└── tests/
    ├── ml/                    ← factor + scoring unit tests
    ├── api/                   ← endpoint integration tests
    └── mobile/                ← component snapshot tests
```

---

## Core data model

### Stock scores (TimescaleDB hypertable)
```sql
CREATE TABLE stock_scores (
  time          TIMESTAMPTZ NOT NULL,
  ticker        TEXT        NOT NULL,
  momentum_z    FLOAT,         -- cross-sectional z-score
  value_z       FLOAT,
  sentiment_z   FLOAT,
  composite     FLOAT,         -- blended 0–100 score
  factor_weights JSONB         -- {momentum: 0.4, value: 0.3, sentiment: 0.3}
);
SELECT create_hypertable('stock_scores', 'time');
```

### User profile (PostgreSQL)
```sql
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  sector_weights JSONB,        -- learned sector affinities
  factor_weights JSONB,        -- personalized factor blend (overrides global)
  swipe_count   INT DEFAULT 0,
  streak_days   INT DEFAULT 0
);

CREATE TABLE swipe_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  ticker        TEXT,
  direction     TEXT CHECK (direction IN ('right','left','up')),
  hesitation_ms INT,           -- time from card show to swipe decision
  card_score    FLOAT,         -- composite score at time of swipe
  swiped_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### Paper portfolio (PostgreSQL)
```sql
CREATE TABLE paper_positions (
  user_id       UUID REFERENCES users(id),
  ticker        TEXT,
  entry_price   FLOAT,
  entry_date    DATE,
  shares        FLOAT DEFAULT 1.0,  -- normalized units
  PRIMARY KEY (user_id, ticker, entry_date)
);
```

---

## ML architecture

### Factor computation (`ml/factors/`)

**Momentum** (`momentum.py`):
- Signal 1: 12-1 month cross-sectional momentum (skip last month to avoid reversal)
- Signal 2: RSI(14) — values below 30 or above 70 get a penalty/bonus
- Signal 3: MACD signal line crossover recency (days since last bullish cross)
- Output: `momentum_raw` per ticker, z-scored cross-sectionally each day

**Value** (`value.py`):
- Metrics: trailing P/E, P/B, EV/EBITDA
- All normalized within GICS sector (comparing vs peers, not universe)
- Composite: equal-weight average of individual metric z-scores within sector
- Output: `value_raw` per ticker

**Sentiment** (`sentiment.py`):
- Model: `ProsusAI/finbert` fine-tuned on financial text
- Inputs: last 7 days of news headlines (NewsAPI), earnings call transcript (when available), Reddit WSB mention count + sentiment delta
- Output: rolling 7-day EWM sentiment score in [-1, 1] per ticker

### Composite scoring (`ml/scoring/composite.py`)
```python
def composite_score(momentum_z, value_z, sentiment_z, weights):
    raw = (weights['momentum'] * momentum_z
         + weights['value']    * value_z
         + weights['sentiment']* sentiment_z)
    # rescale to [0, 100]
    return 50 + 25 * np.tanh(raw)
```
Default global weights: `{momentum: 0.40, value: 0.30, sentiment: 0.30}`.
Per-user weights diverge after 50+ swipes via bandit update.

### Reinforcement loop (`ml/retraining/`)

- **Reward signal**: 30-day forward return of right-swiped stock minus SPY return over same window. Positive = reward, negative = penalty.
- **Hesitation signal**: `hesitation_ms` < 500ms on a low-score right-swipe = strong positive anomaly. `hesitation_ms` > 4000ms = uncertain signal, down-weight.
- **Update rule**: Thompson sampling over factor weights. Weekly batch job; no real-time updates in v1.
- **Cold start**: new users inherit global weights. Personalization activates at 50 swipes.

---

## API reference

### `GET /feed/{user_id}`
Returns 20 stock cards ranked by personalized composite score. Filters out: already-swiped tickers (last 30 days), stocks with market cap < $500M, any ticker with stale data (>1 trading day old).

Response shape:
```json
{
  "cards": [
    {
      "ticker": "NVDA",
      "name": "NVIDIA Corporation",
      "sector": "Technology",
      "composite_score": 82.4,
      "factor_tags": ["Strong momentum", "Analyst upgrades"],
      "sparkline": [/* 30 float prices */],
      "price": 134.22,
      "change_pct": 2.14
    }
  ]
}
```

### `POST /swipe`
```json
{
  "user_id": "uuid",
  "ticker": "NVDA",
  "direction": "right",
  "hesitation_ms": 320,
  "card_score": 82.4
}
```
Emits to Kafka topic `swipe-events`. Returns `{"ok": true}`. Fire-and-forget from client — no blocking on Kafka ack.

### `GET /portfolio/{user_id}`
Returns paper portfolio performance: positions, total return, return vs SPY since account creation, best call, worst call, hit rate.

---

## Mobile card design

Each `StockCard` renders in this order (top → bottom):
1. Sector color band (thin strip, maps sector → color)
2. Ticker + company name (large, bold)
3. 30-day sparkline (Victory Native `VictoryLine`, green/red based on direction)
4. Price + % change (right-aligned)
5. Composite score badge (pill, color: green ≥70, amber 40–70, red <40)
6. Factor tags (max 3, e.g. "Strong momentum · Cheap vs peers")
7. Disclaimer micro-text at bottom: "Not financial advice. Paper trading only."

Swipe mechanics:
- Right → green overlay + "BULLISH" stamp (Reanimated 2 interpolation)
- Left → red overlay + "PASS" stamp
- Up → blue overlay + "PORTFOLIO" stamp (adds to paper portfolio)
- Card rotation: `rotate(swipeX * 0.08)deg` during drag

---

## Gamification mechanics

| Mechanic | Trigger | Display |
|---|---|---|
| Daily streak | Swipe at least 5 cards/day | Flame icon + count on home tab |
| Sector explorer | Swipe stocks from 5+ sectors | Badge unlock |
| Bull's eye | Right-swipe beats market by >10% | Trophy on portfolio screen |
| Contrarian | Left-swipe on high-score stock that then drops | "You called it" badge |
| Leaderboard | Opt-in, sorted by portfolio return % | Weekly reset |

---

## Performance metrics (product KPIs)

| Metric | Definition | Target (6mo) |
|---|---|---|
| DAU/MAU | Daily active / monthly active users | > 0.35 |
| Swipes per session | Cards swiped per app open | > 8 |
| Swipe hit rate | % of right-swipes that beat SPY (30d) | > 52% (beat random) |
| Retention D7 | Users still active 7 days after signup | > 40% |
| Model lift | Composite score rank correlation with 30d return | Spearman ρ > 0.15 |

---

## Compliance + legal guardrails

- **Disclaimer required** on every screen that shows stock data: *"This is not investment advice. All portfolios are simulated. Past performance does not guarantee future results."*
- No real money. No brokerage integration in v1. No real trades.
- No personalized buy/sell recommendations framed as advice — frame as "your swipe history shows you like momentum stocks."
- User data: swipe history is personal financial behavior data. GDPR/CCPA compliance required. Anonymize before any analytics export.
- Rate limiting: max 200 swipes/day per user to prevent gaming the leaderboard.
- Model outputs are never presented as price targets or analyst ratings.

---

## Local dev setup

```bash
# Start all backing services
docker-compose up -d

# Run data ingestion (requires Polygon.io API key in .env)
cd data/ingestion && python price_feed.py --mode backfill --days 365

# Run daily scoring job manually
cd ml/scoring && python batch_score.py --date today

# Start API
cd api && uvicorn main:app --reload --port 8000

# Start mobile app (requires Expo CLI)
cd mobile && npx expo start
```

Environment variables (`.env`):
```
POLYGON_API_KEY=
SIMFIN_API_KEY=
NEWSAPI_KEY=
DATABASE_URL=postgresql://localhost:5432/stockswipe
TIMESCALE_URL=postgresql://localhost:5433/stockswipe_ts
REDIS_URL=redis://localhost:6379
KAFKA_BOOTSTRAP=localhost:9092
JWT_SECRET=
```

---

## Key technical decisions + rationale

| Decision | Choice | Why |
|---|---|---|
| Time-series store | TimescaleDB | SQL-compatible, hypertables compress historical price data well, easy joins with Postgres user data |
| ML serving | Daily batch, not real-time | Score staleness is acceptable (stocks don't change meaning intraday for this use case); avoids low-latency ML infra complexity in v1 |
| Personalization | Bandit (Thompson sampling) | Simpler than deep RL, interpretable weights, works with sparse early data |
| Mobile framework | React Native + Expo | Fastest path to iOS + Android; Reanimated 2 handles the gesture physics needed for card swipe feel |
| Sentiment model | FinBERT | Domain-specific BERT fine-tuned on financial text; outperforms generic sentiment on earnings/news |
| Feed cache | Redis | Pre-compute ranked queues per user at score time; sub-10ms feed response without hitting Postgres on every open |

---

## What to build next (v2 ideas)

- Real brokerage integration (Alpaca paper trading API as a bridge)
- Options chain mini-view on swipe-up
- Social layer: see what friends are swiping (with privacy controls)
- Sector/theme "decks" (e.g. "AI stocks this week", "Dividend payers")
- Voice mode: "Hey, tell me about this stock" on card hold
- Earnings calendar alerts: notify user when a right-swiped stock has earnings coming

---

*Last updated: April 2026 | Maintained by the stockswipe engineering team*
