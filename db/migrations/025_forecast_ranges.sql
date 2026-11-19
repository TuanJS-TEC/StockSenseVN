-- Price-range forecasts pushed by AI_Core (ai_core.fusion.stocksense.push_ranges, model rangecast): per (batch, symbol,
-- horizon) the 80% band as returns on the close of the batch's data_date, a volatility level against the symbol's own
-- last 250 sessions, and the news snapshot of that session (context only, not an input of the band).
-- Rows are immutable like forecasts (SDD 6.3). The up/hold/down columns of `forecasts` keep their meaning and are
-- simply not written by this model.
CREATE TABLE forecast_ranges (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  batch_id bigint NOT NULL REFERENCES market_batches(id) ON DELETE CASCADE,
  symbol varchar(12) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
  horizon text NOT NULL CHECK (horizon IN ('t2', 't5')),
  low_pct numeric(8, 6) NOT NULL CHECK (low_pct < 0),
  high_pct numeric(8, 6) NOT NULL CHECK (high_pct > 0),
  coverage numeric(4, 3) NOT NULL CHECK (coverage > 0 AND coverage < 1),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'normal', 'high')),
  has_news boolean NOT NULL DEFAULT false,
  sentiment_24h real,
  risk_flags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, symbol, horizon)
);
CREATE INDEX forecast_ranges_symbol_latest_idx ON forecast_ranges(symbol, batch_id DESC, horizon);

ALTER TABLE market_summary
  ADD COLUMN vol_low integer NOT NULL DEFAULT 0 CHECK (vol_low >= 0),
  ADD COLUMN vol_normal integer NOT NULL DEFAULT 0 CHECK (vol_normal >= 0),
  ADD COLUMN vol_high integer NOT NULL DEFAULT 0 CHECK (vol_high >= 0);
