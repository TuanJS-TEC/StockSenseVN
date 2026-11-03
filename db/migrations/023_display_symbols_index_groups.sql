-- 30 tracked symbols: the 15 covered by the forecasting model plus 15 display-only symbols (price board, overview,
-- screener and search). Display-only symbols have prices but no forecasts, explanations or symbol detail page.
ALTER TABLE symbols ADD COLUMN analysis_enabled boolean NOT NULL DEFAULT false;

UPDATE symbols SET analysis_enabled = true
WHERE symbol IN ('FPT', 'VNM', 'STB', 'ACB', 'SSI', 'VIC', 'HPG', 'VCB', 'MSN', 'MBB', 'GAS', 'MWG', 'VPB', 'VRE', 'TCB');

INSERT INTO symbols (symbol, name, exchange, industry, currency, is_enabled, analysis_enabled) VALUES
  ('BID', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)', 'HOSE', 'Ngân hàng', 'VND', true, false),
  ('CTG', 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)', 'HOSE', 'Ngân hàng', 'VND', true, false),
  ('HDB', 'Ngân hàng TMCP Phát triển TP. Hồ Chí Minh (HDBank)', 'HOSE', 'Ngân hàng', 'VND', true, false),
  ('VHM', 'CTCP Vinhomes', 'HOSE', 'Bất động sản', 'VND', true, false),
  ('KDH', 'CTCP Đầu tư và Kinh doanh Nhà Khang Điền', 'HOSE', 'Bất động sản', 'VND', true, false),
  ('PLX', 'Tập đoàn Xăng dầu Việt Nam (Petrolimex)', 'HOSE', 'Dầu khí', 'VND', true, false),
  ('SAB', 'Tổng CTCP Bia – Rượu – Nước giải khát Sài Gòn (Sabeco)', 'HOSE', 'Thực phẩm & đồ uống', 'VND', true, false),
  ('VJC', 'CTCP Hàng không VietJet', 'HOSE', 'Hàng không', 'VND', true, false),
  ('GVR', 'Tập đoàn Công nghiệp Cao su Việt Nam', 'HOSE', 'Cao su', 'VND', true, false),
  ('DGC', 'CTCP Tập đoàn Hóa chất Đức Giang', 'HOSE', 'Hóa chất', 'VND', true, false),
  ('PNJ', 'CTCP Vàng bạc Đá quý Phú Nhuận', 'HOSE', 'Bán lẻ', 'VND', true, false),
  ('REE', 'CTCP Cơ Điện Lạnh (REE)', 'HOSE', 'Điện & hạ tầng', 'VND', true, false),
  ('SHS', 'CTCP Chứng khoán Sài Gòn - Hà Nội', 'HNX', 'Chứng khoán', 'VND', true, false),
  ('PVS', 'Tổng CTCP Dịch vụ Kỹ thuật Dầu khí Việt Nam (PTSC)', 'HNX', 'Dầu khí', 'VND', true, false),
  ('IDC', 'Tổng Công ty IDICO - CTCP', 'HNX', 'Bất động sản KCN', 'VND', true, false)
ON CONFLICT (symbol) DO UPDATE SET name = EXCLUDED.name, exchange = EXCLUDED.exchange, industry = EXCLUDED.industry,
  is_enabled = true, analysis_enabled = false, updated_at = now();

-- Fixed index baskets used by the group filters (VN30 ⊂ VN100). Kept as data so a basket review only needs an update.
CREATE TABLE index_memberships (
  index_code text NOT NULL CHECK (index_code IN ('VN30', 'VN100', 'HNX30')),
  symbol varchar(12) NOT NULL REFERENCES symbols(symbol) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (index_code, symbol)
);
CREATE INDEX index_memberships_symbol_idx ON index_memberships (symbol);

INSERT INTO index_memberships (index_code, symbol)
SELECT code, symbol FROM (VALUES ('VN30'), ('VN100')) AS codes(code)
CROSS JOIN unnest(ARRAY['FPT', 'VNM', 'STB', 'ACB', 'SSI', 'VIC', 'HPG', 'VCB', 'MSN', 'MBB', 'GAS', 'MWG', 'VPB', 'VRE', 'TCB',
  'BID', 'CTG', 'HDB', 'VHM', 'PLX', 'SAB', 'VJC', 'GVR']) AS symbol;
INSERT INTO index_memberships (index_code, symbol)
SELECT 'VN100', symbol FROM unnest(ARRAY['DGC', 'PNJ', 'REE', 'KDH']) AS symbol;
INSERT INTO index_memberships (index_code, symbol)
SELECT 'HNX30', symbol FROM unnest(ARRAY['SHS', 'PVS', 'IDC']) AS symbol;
