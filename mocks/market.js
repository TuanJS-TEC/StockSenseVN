const makeForecast = (label, probabilities, confidence = 'mid') => ({ label, probabilities, confidence });

// The 15 HOSE symbols covered by the forecasting model (agreed with the model team, 31/10/2026).
const rows = [
  ['FPT', 'CTCP FPT', 'HOSE', 52700, 0.00, 'up', [0.62, 0.23, 0.15], 'hold', [0.31, 0.44, 0.25]],
  ['VNM', 'CTCP Sữa Việt Nam (Vinamilk)', 'HOSE', 56900, -1.39, 'hold', [0.27, 0.49, 0.24], 'down', [0.24, 0.31, 0.45]],
  ['STB', 'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)', 'HOSE', 66300, 0.45, 'up', [0.54, 0.30, 0.16], 'up', [0.52, 0.31, 0.17]],
  ['ACB', 'Ngân hàng TMCP Á Châu (ACB)', 'HOSE', 21000, -1.41, 'hold', [0.31, 0.47, 0.22], 'hold', [0.29, 0.46, 0.25]],
  ['SSI', 'CTCP Chứng khoán SSI', 'HOSE', 19300, -1.53, 'up', [0.68, 0.20, 0.12], 'up', [0.61, 0.25, 0.14]],
  ['VIC', 'Tập đoàn Vingroup', 'HOSE', 241000, 0.00, 'up', [0.58, 0.27, 0.15], 'up', [0.63, 0.23, 0.14]],
  ['HPG', 'Tập đoàn Hòa Phát', 'HOSE', 21000, -0.94, 'up', [0.57, 0.28, 0.15], 'up', [0.59, 0.25, 0.16]],
  ['VCB', 'Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)', 'HOSE', 56300, -1.57, 'hold', [0.28, 0.48, 0.24], 'hold', [0.25, 0.51, 0.24]],
  ['MSN', 'Tập đoàn Masan', 'HOSE', 70000, 0.67, 'hold', [0.33, 0.45, 0.22], 'up', [0.50, 0.32, 0.18]],
  ['MBB', 'Ngân hàng TMCP Quân đội (MBBank)', 'HOSE', 19300, -2.03, 'hold', [0.29, 0.46, 0.25], 'up', [0.48, 0.34, 0.18]],
  ['GAS', 'Tổng Công ty Khí Việt Nam (PV Gas)', 'HOSE', 78000, 2.63, 'down', [0.19, 0.29, 0.52], 'hold', [0.26, 0.48, 0.26]],
  ['MWG', 'CTCP Đầu tư Thế giới Di Động', 'HOSE', 74000, -2.37, 'up', [0.56, 0.29, 0.15], 'hold', [0.30, 0.45, 0.25]],
  ['VPB', 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)', 'HOSE', 22950, -0.71, 'hold', [0.30, 0.47, 0.23], 'down', [0.23, 0.33, 0.44]],
  ['VRE', 'CTCP Vincom Retail', 'HOSE', 24050, 0.33, 'down', [0.21, 0.31, 0.48], 'hold', [0.27, 0.47, 0.26]],
  ['TCB', 'Ngân hàng TMCP Kỹ thương Việt Nam (Techcombank)', 'HOSE', 21600, -0.31, 'up', [0.55, 0.29, 0.16], 'up', [0.57, 0.27, 0.16]],
];
// 15 display-only symbols (price board, overview, screener, search); no forecasts or deep analysis yet.
const displayRows = [
  ['BID', 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam (BIDV)', 'HOSE', 32000, 0.31],
  ['CTG', 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)', 'HOSE', 29750, -0.50],
  ['HDB', 'Ngân hàng TMCP Phát triển TP. Hồ Chí Minh (HDBank)', 'HOSE', 21900, 0.46],
  ['VHM', 'CTCP Vinhomes', 'HOSE', 62000, 1.31],
  ['KDH', 'CTCP Đầu tư và Kinh doanh Nhà Khang Điền', 'HOSE', 13300, -0.75],
  ['PLX', 'Tập đoàn Xăng dầu Việt Nam (Petrolimex)', 'HOSE', 33000, 0.00],
  ['SAB', 'Tổng CTCP Bia – Rượu – Nước giải khát Sài Gòn (Sabeco)', 'HOSE', 41700, -0.24],
  ['VJC', 'CTCP Hàng không VietJet', 'HOSE', 132300, 0.92],
  ['GVR', 'Tập đoàn Công nghiệp Cao su Việt Nam', 'HOSE', 29100, -1.02],
  ['DGC', 'CTCP Tập đoàn Hóa chất Đức Giang', 'HOSE', 32700, 0.62],
  ['PNJ', 'CTCP Vàng bạc Đá quý Phú Nhuận', 'HOSE', 15600, -0.64],
  ['REE', 'CTCP Cơ Điện Lạnh (REE)', 'HOSE', 44950, 0.22],
  ['SHS', 'CTCP Chứng khoán Sài Gòn - Hà Nội', 'HNX', 12200, 1.67],
  ['PVS', 'Tổng CTCP Dịch vụ Kỹ thuật Dầu khí Việt Nam (PTSC)', 'HNX', 29800, -0.67],
  ['IDC', 'Tổng Công ty IDICO - CTCP', 'HNX', 32600, 0.31],
];
export const ANALYSIS_SYMBOLS = rows.map(([symbol]) => symbol);
export const TRACKED_SYMBOLS = [...ANALYSIS_SYMBOLS, ...displayRows.map(([symbol]) => symbol)];

// Fixed index baskets (same lists as migration 023).
const VN30 = [...ANALYSIS_SYMBOLS, 'BID', 'CTG', 'HDB', 'VHM', 'PLX', 'SAB', 'VJC', 'GVR'];
const VN100 = [...VN30, 'DGC', 'PNJ', 'REE', 'KDH'];
const HNX30 = ['SHS', 'PVS', 'IDC'];
export const indicesOf = (symbol) => [['VN30', VN30], ['VN100', VN100], ['HNX30', HNX30]]
  .filter(([, members]) => members.includes(symbol)).map(([code]) => code);

const industries = {
  FPT: 'Công nghệ', VNM: 'Thực phẩm & đồ uống', MSN: 'Thực phẩm & đồ uống', SSI: 'Chứng khoán', VIC: 'Bất động sản', VRE: 'Bất động sản',
  HPG: 'Thép', GAS: 'Dầu khí', MWG: 'Bán lẻ',
  STB: 'Ngân hàng', ACB: 'Ngân hàng', VCB: 'Ngân hàng', MBB: 'Ngân hàng', VPB: 'Ngân hàng', TCB: 'Ngân hàng',
  BID: 'Ngân hàng', CTG: 'Ngân hàng', HDB: 'Ngân hàng', VHM: 'Bất động sản', KDH: 'Bất động sản', PLX: 'Dầu khí',
  SAB: 'Thực phẩm & đồ uống', VJC: 'Hàng không', GVR: 'Cao su', DGC: 'Hóa chất', PNJ: 'Bán lẻ', REE: 'Điện & hạ tầng',
  SHS: 'Chứng khoán', PVS: 'Dầu khí', IDC: 'Bất động sản KCN',
};

const forecastFrom = (label, values) => {
  const [up, hold, down] = values;
  const confidence = Math.max(up, hold, down) >= 0.58 ? 'high' : Math.max(up, hold, down) < 0.45 ? 'low' : 'mid';
  return makeForecast(label, { up, hold, down }, confidence);
};

export const marketMock = {
  status: {
    dataDate: '2026-10-07',
    batchCompletedAt: '2026-10-07T19:42:00+07:00',
    modelVersion: 'demo-0.0.1',
    state: 'demo',
    sourceStatus: 'sample',
  },
  summary: {
    indices: [
      { code: 'VNINDEX', label: 'VN-Index', value: 1284.56, changePoints: 8.24, changePercent: 0.65 },
      { code: 'HNX', label: 'HNX-Index', value: 236.18, changePoints: -0.42, changePercent: -0.18 },
      { code: 'VN30', label: 'VN30', value: 1348.22, changePoints: 6.58, changePercent: 0.49 },
    ],
    breadth: { advances: 218, nochanges: 74, declines: 151 },
    // T+5 label counts of the rows above.
    labelDistribution: {
      up: rows.filter((row) => row[7] === 'up').length,
      hold: rows.filter((row) => row[7] === 'hold').length,
      down: rows.filter((row) => row[7] === 'down').length,
    },
  },
  symbols: {
    items: [...rows, ...displayRows].map(([symbol, name, exchange, closePrice, changePercent, t2Label, t2Values, t5Label, t5Values]) => ({
      symbol,
      name,
      exchange,
      industry: industries[symbol] ?? null,
      indices: indicesOf(symbol),
      analysisEnabled: Boolean(t2Label),
      closePrice,
      changePercent,
      averageTurnover20d: t2Label ? 125000000000 : 60000000000,
      dataStatus: 'complete',
      forecasts: t2Label ? {
        t2: forecastFrom(t2Label, t2Values),
        t5: forecastFrom(t5Label, t5Values),
      } : null,
    })),
    total: rows.length + displayRows.length,
  },
};
