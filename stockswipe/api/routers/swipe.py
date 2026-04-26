"""POST /swipe → record action + emit Kafka event."""
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from api.database import get_db
from api.middleware.auth import get_current_user
from api.middleware.rate_limit import check_swipe_rate_limit
from api.models.user import User, SwipeEvent, PaperPosition
from api.services.paper_trade import open_paper_position

router = APIRouter()


class SwipeRequest(BaseModel):
    user_id: str
    ticker: str
    direction: str  # right | left | up
    hesitation_ms: int | None = None
    card_score: float | None = None


class SwipeResponse(BaseModel):
    ok: bool


@router.post("", response_model=SwipeResponse)
async def record_swipe(
    body: SwipeRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await check_swipe_rate_limit(str(current_user.id))

    event = SwipeEvent(
        user_id=current_user.id,
        ticker=body.ticker,
        direction=body.direction,
        hesitation_ms=body.hesitation_ms,
        card_score=str(body.card_score) if body.card_score is not None else None,
    )
    db.add(event)

    await db.execute(
        text("UPDATE users SET swipe_count = swipe_count + 1 WHERE id = :uid"),
        {"uid": current_user.id},
    )

    # Update streak
    today = date.today()
    last_active = current_user.last_active_date
    if last_active:
        last_date = last_active.date() if hasattr(last_active, "date") else last_active
        if last_date == today:
            pass  # same day, streak unchanged
        elif (today - last_date).days == 1:
            await db.execute(
                text("UPDATE users SET streak_days = streak_days + 1, last_active_date = NOW() WHERE id = :uid"),
                {"uid": current_user.id},
            )
        else:
            await db.execute(
                text("UPDATE users SET streak_days = 1, last_active_date = NOW() WHERE id = :uid"),
                {"uid": current_user.id},
            )
    else:
        await db.execute(
            text("UPDATE users SET streak_days = 1, last_active_date = NOW() WHERE id = :uid"),
            {"uid": current_user.id},
        )

    if body.direction == "up":
        await open_paper_position(db, str(current_user.id), body.ticker)

    await db.commit()

    # Emit to Kafka (fire-and-forget, don't block response)
    try:
        from api.services.kafka_producer import emit_swipe_event
        await emit_swipe_event(body.dict())
    except Exception:
        pass

    return SwipeResponse(ok=True)
