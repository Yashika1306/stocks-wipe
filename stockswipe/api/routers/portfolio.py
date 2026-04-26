"""GET /portfolio/{user_id} → paper portfolio performance."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.middleware.auth import get_current_user
from api.models.user import User
from api.services.paper_trade import compute_portfolio

router = APIRouter()


class PositionOut(BaseModel):
    ticker: str
    entry_price: float
    current_price: float
    return_pct: float
    entry_date: str


class PortfolioResponse(BaseModel):
    positions: list[PositionOut]
    total_return: float
    hit_rate: float
    best_call: PositionOut | None = None
    worst_call: PositionOut | None = None
    disclaimer: str = "This is not investment advice. All portfolios are simulated."


@router.get("/{user_id}", response_model=PortfolioResponse)
async def get_portfolio(
    user_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    if str(current_user.id) != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await compute_portfolio(user_id, db)
    return PortfolioResponse(**result)
