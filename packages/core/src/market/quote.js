import { buildBoardQuote, tickSize } from './priceBoard.js';
import { changeOver } from './indicators.js';

// Bars restated with back-adjusted prices, so stock dividends and splits do not show up as price drops.
export const adjustedBars = (bars) => bars.map((bar) => ({ ...bar,
  open: bar.adjOpen ?? bar.open, high: bar.adjHigh ?? bar.high, low: bar.adjLow ?? bar.low, close: bar.adjClose ?? bar.close }));

// Quote panel numbers derived from the daily bars of GET /symbols/{symbol}/prices (oldest first).
// The quote uses traded prices; period returns and the 52-week range use adjusted prices.
export function quoteStats(exchange, bars) {
  const quote = buildBoardQuote(exchange, bars.at(-1), bars.at(-2));
  const adjusted = adjustedBars(bars);
  const recent = adjusted.slice(-250);
  const yearStart = adjusted.findIndex((bar) => bar.date.slice(0, 4) === adjusted.at(-1)?.date.slice(0, 4));
  const ytdBase = yearStart > 0 ? adjusted[yearStart - 1].close : null;
  const last20 = bars.slice(-20).map((bar) => bar.volume).filter((value) => value != null);
  // Day-on-day change against the previous close restated on the same basis (ex-rights days stay correct).
  const history = bars.map((bar, i) => {
    const restated = i ? adjusted[i - 1].close * (bar.close / adjusted[i].close) : null;
    const previous = restated == null ? null : Math.round(restated / tickSize(exchange, restated)) * tickSize(exchange, restated);
    const change = previous ? Math.round(bar.close - previous) : null;
    return { ...bar, change, changePercent: change == null ? null : Number(((change / previous) * 100).toFixed(2)) };
  }).reverse();
  return {
    quote, history,
    week: changeOver(adjusted, 5), month: changeOver(adjusted, 21), quarter: changeOver(adjusted, 63),
    ytd: ytdBase ? Number((((adjusted.at(-1).close - ytdBase) / ytdBase) * 100).toFixed(2)) : null,
    rangeHigh: recent.length ? Math.max(...recent.map((bar) => bar.high ?? bar.close)) : null,
    rangeLow: recent.length ? Math.min(...recent.map((bar) => bar.low ?? bar.close)) : null,
    rangeLabel: recent.length >= 250 ? '52 tuần' : `${recent.length} phiên`,
    avgVolume20: last20.length ? Math.round(last20.reduce((a, b) => a + b, 0) / last20.length) : null,
  };
}
