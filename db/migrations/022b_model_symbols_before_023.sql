-- 023 links the 15 model symbols into index_memberships (FK to symbols), but on a fresh database those symbols only
-- arrive with db:seed:demo, which runs after migrate, so 023 failed. This file sorts between 022 and 023 ('_' < 'b'):
-- a fresh database gets the symbols before 023; an existing one applies it once as a no-op (ON CONFLICT DO NOTHING).
-- 023 itself cannot be edited: db/migrate.js rejects a changed checksum of an applied migration.
INSERT INTO symbols (symbol, name, exchange, currency, is_enabled) VALUES
  ('FPT', 'CTCP FPT', 'HOSE', 'VND', true),
  ('VNM', 'CTCP Sữa Việt Nam (Vinamilk)', 'HOSE', 'VND', true),
  ('STB', 'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)', 'HOSE', 'VND', true),
  ('ACB', 'Ngân hàng TMCP Á Châu (ACB)', 'HOSE', 'VND', true),
  ('SSI', 'CTCP Chứng khoán SSI', 'HOSE', 'VND', true),
  ('VIC', 'Tập đoàn Vingroup', 'HOSE', 'VND', true),
  ('HPG', 'Tập đoàn Hòa Phát', 'HOSE', 'VND', true),
  ('VCB', 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)', 'HOSE', 'VND', true),
  ('MSN', 'Tập đoàn Masan', 'HOSE', 'VND', true),
  ('MBB', 'Ngân hàng TMCP Quân đội (MBBank)', 'HOSE', 'VND', true),
  ('GAS', 'Tổng Công ty Khí Việt Nam (PV Gas)', 'HOSE', 'VND', true),
  ('MWG', 'CTCP Đầu tư Thế giới Di Động', 'HOSE', 'VND', true),
  ('VPB', 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)', 'HOSE', 'VND', true),
  ('VRE', 'CTCP Vincom Retail', 'HOSE', 'VND', true),
  ('TCB', 'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)', 'HOSE', 'VND', true)
ON CONFLICT (symbol) DO NOTHING;
