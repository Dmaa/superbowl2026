-- Limit Orders table
CREATE TABLE limit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  market_id VARCHAR NOT NULL,
  market_name VARCHAR NOT NULL,
  order_type VARCHAR NOT NULL CHECK (order_type IN ('BUY', 'SELL')),
  shares NUMERIC NOT NULL CHECK (shares > 0),
  limit_price NUMERIC NOT NULL CHECK (limit_price > 0 AND limit_price < 1),
  escrowed_amount NUMERIC NOT NULL DEFAULT 0,
  status VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'FILLED', 'CANCELLED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  filled_at TIMESTAMPTZ
);

-- Price history snapshots (5-min buckets, 24h retention)
CREATE TABLE price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id VARCHAR NOT NULL,
  price NUMERIC NOT NULL,
  time_bucket TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_snapshots_market_bucket ON price_snapshots(market_id, time_bucket);
