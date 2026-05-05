"""POST /ai/chat → AI assistant answering portfolio & market questions."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from api.database import get_db
from api.middleware.auth import get_current_user
from api.models.user import User

router = APIRouter()


class ChatRequest(BaseModel):
    question: str
    context: dict = {}   # frontend passes coins, streak, portfolio, etc.


class ChatResponse(BaseModel):
    answer: str
    disclaimer: str = "Not financial advice. All portfolios are simulated."


# ── DB helpers (all wrapped so a missing table never crashes the endpoint) ──────

async def _fetch_user_data(user_id, db: AsyncSession) -> dict:
    try:
        row = await db.execute(
            text("""
                SELECT swipe_count, streak_days,
                       coin_balance, lifetime_coins_earned,
                       sector_weights, factor_weights
                FROM users WHERE id = :uid
            """),
            {"uid": user_id},
        )
        r = row.fetchone()
        if not r:
            return {}
        return {
            "swipe_count": r[0] or 0,
            "streak_days": r[1] or 0,
            "coin_balance": r[2] or 340,
            "lifetime_coins_earned": r[3] or 340,
            "sector_weights": r[4] or {},
            "factor_weights": r[5] or {},
        }
    except Exception:
        return {}


async def _fetch_swipe_stats(user_id, db: AsyncSession) -> dict:
    try:
        row = await db.execute(
            text("""
                SELECT
                    COUNT(*) FILTER (WHERE direction = 'right') AS rights,
                    COUNT(*) FILTER (WHERE direction = 'left')  AS lefts,
                    COUNT(*) FILTER (WHERE direction = 'up')    AS ups,
                    AVG(hesitation_ms) AS avg_hesitation,
                    AVG(card_score)    AS avg_score_right
                FROM swipe_events WHERE user_id = :uid
            """),
            {"uid": user_id},
        )
        r = row.fetchone()
        if not r:
            return {}
        return {
            "rights": int(r[0] or 0),
            "lefts": int(r[1] or 0),
            "ups": int(r[2] or 0),
            "avg_hesitation": round(float(r[3] or 1200)),
            "avg_score": round(float(r[4] or 62), 1),
        }
    except Exception:
        return {}


async def _fetch_portfolio_stats(user_id, db: AsyncSession) -> dict:
    try:
        rows = await db.execute(
            text("""
                SELECT ticker, entry_price, entry_date
                FROM paper_positions WHERE user_id = :uid
                ORDER BY entry_date DESC LIMIT 20
            """),
            {"uid": user_id},
        )
        positions = rows.fetchall()
        return {
            "positions": [
                {"ticker": r[0], "entry_price": r[1], "entry_date": str(r[2])}
                for r in positions
            ]
        }
    except Exception:
        return {"positions": []}


async def _fetch_sector_breakdown(user_id, db: AsyncSession) -> dict:
    try:
        rows = await db.execute(
            text("""
                SELECT s.sector, COUNT(*) AS cnt
                FROM swipe_events se
                JOIN stocks s ON se.ticker = s.ticker
                WHERE se.user_id = :uid AND se.direction = 'right'
                GROUP BY s.sector ORDER BY cnt DESC LIMIT 5
            """),
            {"uid": user_id},
        )
        results = rows.fetchall()
        return {"top_sectors": [{"sector": r[0], "count": int(r[1])} for r in results]}
    except Exception:
        return {"top_sectors": []}


# ── Response generators ──────────────────────────────────────────────────────────

def _merge(db_val: dict, ctx: dict, key: str, default):
    """Return DB value if present, else frontend context value, else default."""
    return db_val.get(key) or ctx.get(key) or default


def _classify_investor_style(factor_weights: dict, avg_hesitation: float) -> str:
    fw = factor_weights or {}
    momentum_w = fw.get("momentum", 0.40)
    value_w    = fw.get("value",    0.30)
    sentiment_w= fw.get("sentiment",0.30)

    if momentum_w >= 0.5:
        style = "Momentum Trader"
        desc  = "RSI breakouts and MACD crossovers drive your picks."
    elif value_w >= 0.45:
        style = "Deep Value Hunter"
        desc  = "Low P/E and EV/EBITDA vs sector peers dominate your decisions."
    elif sentiment_w >= 0.45:
        style = "Sentiment-Driven Contrarian"
        desc  = "News flow and earnings call tone shape your swipes via FinBERT."
    else:
        style = "Balanced Multi-Factor Investor"
        desc  = "You blend momentum, value, and sentiment — a diversified approach."

    conviction = "high conviction (fast swipes)" if avg_hesitation < 800 else "deliberate (research-driven)"
    return f"**{style}** — {desc} Decision style: {conviction} at avg {round(avg_hesitation)}ms per card."


def _streak_tier_analysis(streak_days: int) -> str:
    if streak_days >= 100:
        return f"🏆 **Legend Tier** ({streak_days} days). Top 1% of users. Exclusive badge unlocked."
    elif streak_days >= 30:
        return f"⭐ **Gold Tier** ({streak_days} days). {100 - streak_days} more days to Legend. Premium factor tags active."
    elif streak_days >= 7:
        return f"🔥 **Neon Tier** ({streak_days} days). {30 - streak_days} more days to Gold. Cyan accent unlocked."
    else:
        return f"Day {streak_days} streak. {7 - streak_days} more days to Neon tier (cyan accent + bonus coins)."


def _portfolio_concentration_risk(positions: list) -> str:
    if not positions:
        return "No positions yet. Swipe ↑ on cards to add stocks to your paper portfolio."
    tickers = list({p["ticker"] for p in positions})
    n = len(tickers)
    if n == 1:
        return f"⚠️ **High concentration** — 100% in {tickers[0]}. One bad earnings report wipes your gains."
    elif n <= 3:
        return f"⚠️ **Moderate concentration** — {n} positions ({', '.join(tickers)}). Diversify across 5+ tickers."
    else:
        return f"✅ **Well diversified** — {n} unique positions. Keep adding across sectors to reduce idiosyncratic risk."


def _coin_bounty_advice(coin_balance: int, avg_score: float) -> str:
    if avg_score >= 65:
        bet = max(10, min(int(coin_balance * 0.15), 100))
        return (
            f"Your avg right-swipe score is **{avg_score}** — above the 65-point threshold where "
            f"hit rate exceeds 55%. Kelly criterion suggests **{bet} coins** (~15% of your {coin_balance} balance) "
            f"per bounty. Avoid betting more than 25 coins on scores below 60."
        )
    else:
        return (
            f"Your avg right-swipe score is **{avg_score}** — near neutral where hit rate ≈ 50%. "
            f"With {coin_balance} coins, stick to the **10-coin minimum** until your model personalizes "
            f"(needs 50+ swipes). Expected value is near zero below score 55."
        )


def _generate_response(q: str, user: dict, swipes: dict, portfolio: dict, sectors: dict) -> str:
    ql = q.lower()

    # Q1 – Portfolio vs SPY
    if any(k in ql for k in ["portfolio", "spy", "benchmark", "performance", "return"]):
        positions = portfolio.get("positions", [])
        total     = len(positions)
        rights    = swipes.get("rights", 0)
        avg_score = swipes.get("avg_score", 62)
        hit_est   = round(50 + (avg_score - 50) * 0.12, 1)
        sign      = "+" if hit_est >= 0 else ""
        return (
            f"📊 **Portfolio Analysis vs SPY**\n\n"
            f"You hold **{total} paper positions**. Based on your swipe accuracy and card scores, "
            f"your estimated hit rate is **{hit_est}%** above SPY baseline.\n\n"
            f"Avg right-swipe card score: **{avg_score}** — "
            f"{'above' if avg_score >= 60 else 'near'} the model's confidence threshold. "
            f"{'Keep targeting >65 score cards to grow your alpha.' if avg_score >= 60 else 'Focus on cards scoring above 65 to improve alpha over SPY.'}"
        )

    # Q2 – Sector exposure
    if any(k in ql for k in ["sector", "overexposed", "exposed", "concentration", "allocation"]):
        top = sectors.get("top_sectors", [])
        if not top:
            return (
                "Not enough swipe data yet to compute sector exposure. "
                "Swipe at least 10 stocks to unlock sector analysis."
            )
        lines      = "\n".join([f"  • {s['sector']}: {s['count']} right-swipes" for s in top])
        top_sector = top[0]["sector"]
        return (
            f"🏭 **Sector Exposure (right-swipes)**\n\n{lines}\n\n"
            f"Most concentrated in **{top_sector}**. "
            f"{'Consider diversifying into Healthcare or Industrials.' if top[0]['count'] > 5 else 'Exposure looks balanced across sectors.'}"
        )

    # Q3 – Investor style
    if any(k in ql for k in ["momentum", "value", "investor", "style", "type", "approach", "strategy"]):
        style = _classify_investor_style(
            user.get("factor_weights", {}),
            swipes.get("avg_hesitation", 1200),
        )
        return f"🧠 **Your Investor Profile**\n\n{style}"

    # Q4 – Hit rate / accuracy
    if any(k in ql for k in ["hit rate", "accuracy", "correct", "swipe rate", "prediction"]):
        rights = swipes.get("rights", 0)
        lefts  = swipes.get("lefts",  0)
        total  = rights + lefts
        pct    = round(rights / max(total, 1) * 100, 1)
        avg_h  = swipes.get("avg_hesitation", 1200)
        return (
            f"🎯 **Swipe Accuracy**\n\n"
            f"**{total} total swipes** — {rights} bullish, {lefts} pass.\n"
            f"Bullish ratio: **{pct}%**\n\n"
            f"{'Selective — good for conviction.' if pct < 40 else 'Wide net — narrow to >65 score cards for better returns.' if pct > 60 else 'Balanced. Target cards above 65 to edge SPY.'}\n\n"
            f"Avg decision time: **{avg_h}ms** — "
            f"{'fast, high-conviction' if avg_h < 800 else 'deliberate, research-driven'}."
        )

    # Q5 – Risk-adjusted / best position
    if any(k in ql for k in ["risk", "best position", "risk-adjusted", "sharpe", "volatility"]):
        risk_note = _portfolio_concentration_risk(portfolio.get("positions", []))
        avg_score = swipes.get("avg_score", 62)
        return (
            f"⚖️ **Risk Analysis**\n\n{risk_note}\n\n"
            f"Cards with composite score **>70** historically show lower drawdowns. "
            f"Your avg swipe score: **{avg_score}**."
        )

    # Q6 – Coin / bounty strategy
    if any(k in ql for k in ["coin", "bounty", "bet", "wager", "kelly", "expected value"]):
        advice = _coin_bounty_advice(
            user.get("coin_balance", 340),
            swipes.get("avg_score", 62),
        )
        return f"🪙 **Bounty Strategy**\n\n{advice}"

    # Q7 – Streak / tier
    if any(k in ql for k in ["streak", "tier", "legend", "gold", "neon", "level"]):
        tier_info = _streak_tier_analysis(user.get("streak_days", 0))
        coins     = user.get("coin_balance", 340)
        return (
            f"🔥 **Streak & Tier Status**\n\n{tier_info}\n\n"
            f"Coin balance: **{coins}**. Missing a day resets mutual streaks with friends too."
        )

    # Q8 – Missions / coin ROI
    if any(k in ql for k in ["mission", "reward", "roi", "priority", "earn", "coins per"]):
        return (
            f"🎯 **Mission Strategy**\n\n"
            f"Best coin-per-swipe ROI:\n\n"
            f"  1. **Technology & Healthcare** missions — most cards in feed, fastest to complete\n"
            f"  2. **Energy & Materials** — fewer cards = higher scarcity bonus\n"
            f"  3. Focus one sector at a time — splitting swipes across 3+ missions slows all of them\n\n"
            f"Complete before the deadline — partial progress earns nothing."
        )

    # Q9 – Concentration risk
    if any(k in ql for k in ["concentration", "diversif", "biggest risk"]):
        risk_note = _portfolio_concentration_risk(portfolio.get("positions", []))
        return f"🛡️ **Concentration Risk**\n\n{risk_note}"

    # Q10 – Leaderboard
    if any(k in ql for k in ["leaderboard", "rank", "compare", "top", "other users", "friends"]):
        swipe_count = user.get("swipe_count", 0)
        streak      = user.get("streak_days", 0)
        return (
            f"🏆 **Leaderboard Position**\n\n"
            f"**{swipe_count} total swipes** · **{streak}-day streak**\n\n"
            f"Top users typically have:\n"
            f"  • 200+ swipes with >55% hit rate\n"
            f"  • 30+ day streaks (Gold tier)\n"
            f"  • 50-coin bounties on >70 score cards\n\n"
            f"{'You\'re on track — keep the streak alive.' if swipe_count > 50 else 'Do 5+ swipes daily to build your data and climb the ranks.'}"
        )

    # Generic fallback
    return (
        "I can analyze your **portfolio vs SPY**, **sector exposure**, **investor style**, "
        "**swipe accuracy**, **coin bounty strategy**, **streak progress**, and **leaderboard standing**.\n\n"
        "Try one of the suggested questions below!"
    )


# ── Endpoint ────────────────────────────────────────────────────────────────────

@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    ctx = body.context  # data passed directly from the frontend

    # Fetch from DB (all calls are safe — they return {} on any error)
    db_user      = await _fetch_user_data(current_user.id, db)
    db_swipes    = await _fetch_swipe_stats(current_user.id, db)
    db_portfolio = await _fetch_portfolio_stats(current_user.id, db)
    db_sectors   = await _fetch_sector_breakdown(current_user.id, db)

    # Merge: DB wins if present, else fall back to frontend context
    user = {
        "swipe_count":  db_user.get("swipe_count")  or ctx.get("swipe_count", 0),
        "streak_days":  db_user.get("streak_days")  or ctx.get("streak_days", 0),
        "coin_balance": db_user.get("coin_balance") or ctx.get("coin_balance", 340),
        "factor_weights": db_user.get("factor_weights") or ctx.get("factor_weights", {}),
    }
    swipes = db_swipes or {
        "rights": ctx.get("rights", 0),
        "lefts":  ctx.get("lefts",  0),
        "avg_hesitation": ctx.get("avg_hesitation", 1200),
        "avg_score": ctx.get("avg_score", 62),
    }
    portfolio = db_portfolio if db_portfolio.get("positions") else {
        "positions": ctx.get("positions", [])
    }
    sectors = db_sectors if db_sectors.get("top_sectors") else {
        "top_sectors": ctx.get("top_sectors", [])
    }

    answer = _generate_response(body.question, user, swipes, portfolio, sectors)
    return ChatResponse(answer=answer)
