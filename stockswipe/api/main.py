from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import feed, swipe, portfolio, leaderboard, auth, coins, ai
from api.middleware.disclaimer import DisclaimerMiddleware
from api.database import engine
from api.models.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="StockSwipe API",
    version="1.0.0",
    description="Tinder for investing — ML-ranked stock cards with gamified swiping.",
    lifespan=lifespan,
)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.add_middleware(DisclaimerMiddleware)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(feed.router, prefix="/feed", tags=["feed"])
app.include_router(swipe.router, prefix="/swipe", tags=["swipe"])
app.include_router(portfolio.router, prefix="/portfolio", tags=["portfolio"])
app.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
app.include_router(coins.router, prefix="/coins", tags=["coins"])
app.include_router(ai.router, prefix="/ai", tags=["ai"])


@app.get("/health")
async def health():
    return {"status": "ok"}
