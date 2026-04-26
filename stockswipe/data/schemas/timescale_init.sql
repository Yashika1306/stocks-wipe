CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Stock scores hypertable
CREATE TABLE IF NOT EXISTS stock_scores (
  time           TIMESTAMPTZ   NOT NULL,
  ticker         TEXT          NOT NULL,
  momentum_z     FLOAT,
  value_z        FLOAT,
  sentiment_z    FLOAT,
  composite      FLOAT,
  factor_weights JSONB
);

SELECT create_hypertable('stock_scores', 'time', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_stock_scores_ticker ON stock_scores (ticker, time DESC);

-- Raw OHLCV prices
CREATE TABLE IF NOT EXISTS ohlcv (
  time   TIMESTAMPTZ NOT NULL,
  ticker TEXT        NOT NULL,
  open   FLOAT       NOT NULL,
  high   FLOAT       NOT NULL,
  low    FLOAT       NOT NULL,
  close  FLOAT       NOT NULL,
  volume BIGINT      NOT NULL,
  vwap   FLOAT
);

SELECT create_hypertable('ohlcv', 'time', if_not_exists => TRUE);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ohlcv_ticker_time ON ohlcv (ticker, time DESC);

-- Sentiment scores time series
CREATE TABLE IF NOT EXISTS sentiment_scores (
  time          TIMESTAMPTZ NOT NULL,
  ticker        TEXT        NOT NULL,
  score         FLOAT       NOT NULL,  -- [-1, 1]
  source        TEXT,
  mention_count INT         DEFAULT 0
);

SELECT create_hypertable('sentiment_scores', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS idx_sentiment_ticker ON sentiment_scores (ticker, time DESC);
