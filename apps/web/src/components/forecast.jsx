import { getVolatilityLabel, newsContext, rangePrices } from '@stocksense/core/labels';
import { RISK_TEXT } from '@stocksense/core/news';

// Forecast display pieces. A forecast is the model's volatility level and 80% price range (AI_Core rangecast): it says
// how far the price may move, never which way.
const formatDay = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('vi-VN') : '—');
const signed = (pct) => `${pct < 0 ? '−' : '+'}${Math.abs(pct * 100).toFixed(1).replace('.', ',')}%`;
const price = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
export const rangeText = (range) => (range ? `${signed(range.lowPct)} / ${signed(range.highPct)}` : '—');

export function MiniLab({ forecast }) {
  if (!forecast?.riskLevel) return <span className="muted">—</span>;
  const level = getVolatilityLabel(forecast.riskLevel);
  return <><span className={`chip ${level.tone}`} title={`${level.text}; dải giá 80%: ${rangeText(forecast.range)}`}>{level.symbol} {level.short}</span>{forecast.stale && <span className="muted small" title={`Dự báo cũ ngày ${formatDay(forecast.dataDate)}`}> · cũ</span>}</>;
}

// close and changePercent are the page's own latest price and day change: the band is stored as returns on the close.
export function ForecastCard({ horizon, forecast, dueDate, close, changePercent }) {
  const level = getVolatilityLabel(forecast?.riskLevel);
  const band = rangePrices(close, forecast?.range);
  const flags = forecast?.news?.riskFlags ?? [];
  return <div className="fc">
    <div className="fc-h"><span className="hz">{horizon === 't2' ? 'T+2' : 'T+5'}</span><span className="small muted">Đáo hạn <span className="num">{formatDay(dueDate)}</span></span></div>
    <div className="fc-label c-hold">{level.symbol} {level.text}</div>
    {forecast?.range ? <>
      <div className="num">Dải giá {Math.round(forecast.range.coverage * 100)}%: {band ? <b>{price.format(band.low)} – {price.format(band.high)}</b> : '—'} <span className="muted small">({rangeText(forecast.range)})</span></div>
      <div className="small muted">{newsContext(forecast.news, changePercent)}</div>
      <div className="fc-f">{flags.length > 0 && <span className="chip down">Cờ rủi ro trong tin: {flags.map((flag) => RISK_TEXT[flag] ?? flag).join(', ')}</span>}{forecast.stale && <span className="chip down">Dự báo cũ · {formatDay(forecast.dataDate)}</span>}</div>
    </> : <div className="small muted">Chưa có dự báo cho kỳ hạn này.</div>}
  </div>;
}
