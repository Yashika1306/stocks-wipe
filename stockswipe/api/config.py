from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://stockswipe:stockswipe@localhost:5432/stockswipe"
    timescale_url: str = "postgresql://stockswipe:stockswipe@localhost:5433/stockswipe_ts"
    redis_url: str = "redis://localhost:6379"
    kafka_bootstrap: str = "localhost:9092"
    jwt_secret: str = "change_me"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60 * 24 * 7  # 7 days
    feed_size: int = 20
    max_daily_swipes: int = 200

    class Config:
        env_file = ".env"


settings = Settings()
