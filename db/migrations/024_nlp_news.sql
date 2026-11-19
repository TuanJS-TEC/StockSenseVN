-- NLP news results pushed by AI_Core (ai_core.fusion.stocksense_news); one row per (symbol, document), latest version.
-- pg_notify('nlp_news', 'FPT,VNM') after every push that changed rows.
CREATE TABLE nlp_news (
  symbol varchar(12) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
  document_id text NOT NULL,
  document_version_id text NOT NULL,
  source text NOT NULL,
  url text,
  title text NOT NULL,
  published_at timestamptz NOT NULL,
  relation text NOT NULL CHECK (relation IN ('direct', 'sector', 'market', 'ambiguous')),
  p_pos real NOT NULL, p_neu real NOT NULL, p_neg real NOT NULL,
  uncertain boolean NOT NULL,
  risk_flags text[] NOT NULL DEFAULT '{}',
  passage text NOT NULL,
  model_version text NOT NULL,
  processed_at timestamptz NOT NULL,
  PRIMARY KEY (symbol, document_id)
);
CREATE INDEX nlp_news_symbol_published_idx ON nlp_news (symbol, published_at DESC);
CREATE INDEX nlp_news_processed_idx ON nlp_news (processed_at);
