from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from api.config import settings

_pg_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(_pg_url, pool_size=10, max_overflow=20)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
