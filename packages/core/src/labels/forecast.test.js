import { describe, expect, it } from 'vitest';
import { getVolatilityLabel, newsContext, rangePrices, RANGE_CAPTION } from './forecast.js';

describe('volatility level and price range (rangecast)', () => {
  it('names the three levels and falls back for an unknown one', () => {
    expect(getVolatilityLabel('low').text).toBe('Biến động thấp');
    expect(getVolatilityLabel('normal').text).toBe('Biến động bình thường');
    expect(getVolatilityLabel('high').text).toBe('Biến động cao');
    expect(getVolatilityLabel(undefined).text).toBe('Chưa có dự báo');
  });
  it('turns the percentages into prices on the given close', () => {
    expect(rangePrices(122.5, { lowPct: -0.038, highPct: 0.036 })).toEqual({ low: 117.845, high: 126.91 });
    expect(rangePrices(49550, { lowPct: -0.0562, highPct: 0.0569 })).toEqual({ low: 46765.29, high: 52369.395 });
    expect(rangePrices(null, { lowPct: -0.03, highPct: 0.03 })).toBeNull();
    expect(rangePrices(100, null)).toBeNull();
  });
  it('says the band is not a price target', () => {
    expect(RANGE_CAPTION).toBe('Dải giá: 8/10 lần giá đóng cửa sau h phiên được kỳ vọng nằm trong dải. Không phải giá mục tiêu.');
  });
});

describe('newsContext', () => {
  it('reports no news', () => {
    expect(newsContext({ hasNews: false, sentiment24h: null, riskFlags: [] }, -1.2)).toBe('Không có tin trong 72 giờ');
    expect(newsContext(null, 1)).toBe('Không có tin trong 72 giờ');
  });
  it('reports older news without a 24h score', () => {
    expect(newsContext({ hasNews: true, sentiment24h: null }, 0.5)).toBe('Có tin trong 72 giờ, không có tin trong 24 giờ');
  });
  it('compares the tone with the move of the day only when both are clear', () => {
    expect(newsContext({ hasNews: true, sentiment24h: -0.31 }, -1.4)).toBe('Tin 24h: tiêu cực (−0.31), cùng chiều với biến động giá hôm nay');
    expect(newsContext({ hasNews: true, sentiment24h: 0.35 }, -1.4)).toBe('Tin 24h: tích cực (+0.35), trái chiều với biến động giá hôm nay');
    expect(newsContext({ hasNews: true, sentiment24h: 0.05 }, -1.4)).toBe('Tin 24h: trung tính (+0.05)');
    expect(newsContext({ hasNews: true, sentiment24h: 0.35 }, 0)).toBe('Tin 24h: tích cực (+0.35)');
    expect(newsContext({ hasNews: true, sentiment24h: 0.35 }, null)).toBe('Tin 24h: tích cực (+0.35)');
  });
});

describe('stopFromRange', () => {
  const t5 = { range: { lowPct: -0.056, highPct: 0.057, coverage: 0.8 } };
  it('is the lower bound for a long plan and the upper bound for a short one', async () => {
    const { stopFromRange } = await import('./forecast.js');
    expect(stopFromRange('long', 50000, t5)).toBe(47200);
    expect(stopFromRange('short', 50000, t5)).toBe(52850);
  });
  it('is null without a range or a close', async () => {
    const { stopFromRange } = await import('./forecast.js');
    expect(stopFromRange('long', 50000, null)).toBeNull();
    expect(stopFromRange('long', null, t5)).toBeNull();
  });
});
