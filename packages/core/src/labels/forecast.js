export const FORECAST_LABELS = Object.freeze({
  up: { text: 'Tăng', symbol: '▲', tone: 'up' },
  hold: { text: 'Đi ngang', symbol: '●', tone: 'hold' },
  down: { text: 'Giảm', symbol: '▼', tone: 'down' },
});

export function getForecastLabel(label) {
  return FORECAST_LABELS[label] ?? {
    text: 'Chưa có dữ liệu',
    symbol: '—',
    tone: 'neutral',
  };
}

// Since AI_Core's rangecast model (2026-11-13) a forecast is a volatility level and an 80% price range, not a direction.
export const VOLATILITY_LABELS = Object.freeze({
  low: { text: 'Biến động thấp', short: 'Thấp', symbol: '◔', tone: 'neutral' },
  normal: { text: 'Biến động bình thường', short: 'Bình thường', symbol: '◑', tone: 'hold' },
  high: { text: 'Biến động cao', short: 'Cao', symbol: '◕', tone: 'acc' },
});

export function getVolatilityLabel(level) {
  return VOLATILITY_LABELS[level] ?? { text: 'Chưa có dự báo', short: '—', symbol: '—', tone: 'neutral' };
}

export const RANGE_CAPTION = 'Dải giá: 8/10 lần giá đóng cửa sau h phiên được kỳ vọng nằm trong dải. Không phải giá mục tiêu.';

// The band is stored as returns on the close of the forecast session; the caller supplies its own close (same unit out).
export function rangePrices(close, range) {
  if (close == null || !range || range.lowPct == null || range.highPct == null) return null;
  const at = (pct) => Math.round(close * (1 + pct) * 1000) / 1000;
  return { low: at(range.lowPct), high: at(range.highPct) };
}

const NEUTRAL = 0.1; // |sentiment| below this reads as neutral (AI_Core fusion.live SENT_BAND)

// One line of context beside a forecast. It only says whether the tone of the news and the day's move point the same
// way: news did not predict direction in AI_Core's tests, so the wording never claims a cause.
export function newsContext(news, changePercent) {
  if (!news?.hasNews) return 'Không có tin trong 72 giờ';
  const s = news.sentiment24h;
  if (s == null) return 'Có tin trong 72 giờ, không có tin trong 24 giờ';
  const tone = s >= NEUTRAL ? 1 : s <= -NEUTRAL ? -1 : 0;
  const score = `${s < 0 ? '−' : '+'}${Math.abs(s).toFixed(2)}`;
  const head = `Tin 24h: ${['tiêu cực', 'trung tính', 'tích cực'][tone + 1]} (${score})`;
  const move = Math.sign(changePercent ?? 0);
  return tone && move ? `${head}, ${tone === move ? 'cùng chiều' : 'trái chiều'} với biến động giá hôm nay` : head;
}

// Trade Plan hint: the edge of the T+5 band on the losing side of the plan, as a whole price; the user may overwrite it.
export function stopFromRange(side, close, forecast) {
  const band = rangePrices(close, forecast?.range);
  return band ? Math.round(side === 'long' ? band.low : band.high) : null;
}
