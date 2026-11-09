import { describe, expect, it } from 'vitest';
import { addTradingDays, newsSession } from './calendar.js';
import { adjustedBars, quoteStats } from './quote.js';
import { INDEX_GROUPS, SYMBOL_GROUPS, inGroup } from './symbolGroups.js';

describe('addTradingDays', () => {
  it('skips weekends', () => {
    expect(addTradingDays('2026-11-06', 2)).toBe('2026-11-10'); // Fri + 2 -> Tue
    expect(addTradingDays('2026-11-06', 5)).toBe('2026-11-13');
  });
  it('skips exchange holidays', () => {
    expect(addTradingDays('2026-11-06', 2, ['2026-11-09'])).toBe('2026-11-11');
  });
  it('returns null without a start date', () => {
    expect(addTradingDays(null, 2)).toBeNull();
  });
});

describe('newsSession', () => {
  it('keeps articles before 15:00 ICT on the same day', () => {
    expect(newsSession('2026-11-06T14:59:00+07:00')).toBe('2026-11-06');
  });
  it('moves articles from 15:00 ICT to the next day', () => {
    expect(newsSession('2026-11-06T15:00:00+07:00')).toBe('2026-11-07');
    expect(newsSession('2026-11-06T08:30:00Z')).toBe('2026-11-07'); // 15:30 ICT
  });
  it('uses the Vietnam date, not the UTC date', () => {
    expect(newsSession('2026-11-05T18:00:00Z')).toBe('2026-11-06'); // 01:00 ICT on the 6th
  });
});

describe('adjustedBars', () => {
  it('uses adjusted prices when present and traded prices otherwise', () => {
    const [a, b] = adjustedBars([
      { date: '2026-01-02', open: 10, high: 12, low: 9, close: 11, adjOpen: 5, adjHigh: 6, adjLow: 4.5, adjClose: 5.5 },
      { date: '2026-01-03', open: 10, high: 12, low: 9, close: 11 },
    ]);
    expect(a).toMatchObject({ open: 5, high: 6, low: 4.5, close: 5.5 });
    expect(b).toMatchObject({ open: 10, high: 12, low: 9, close: 11 });
  });
});

describe('quoteStats', () => {
  const bar = (date, close, adjClose = close, volume = 1000) => ({ date, open: close, high: close, low: close, close, volume, adjOpen: adjClose, adjHigh: adjClose, adjLow: adjClose, adjClose });

  it('measures the ex-rights day against the restated reference, not the raw previous close', () => {
    // A dividend cut the price from 60,000 to about 50,000; the adjusted history already reflects it.
    const stats = quoteStats('HOSE', [bar('2026-03-02', 60_000, 50_000), bar('2026-03-03', 50_500)]);
    const [latest, first] = stats.history;
    expect(latest).toMatchObject({ date: '2026-03-03', change: 500, changePercent: 1 });
    expect(first.change).toBeNull();
  });

  it('computes year-to-date, range and 20-session volume', () => {
    const stats = quoteStats('HOSE', [bar('2025-12-31', 40_000, 40_000, 100), bar('2026-01-02', 41_000, 41_000, 300), bar('2026-01-05', 44_000, 44_000, 200)]);
    expect(stats.ytd).toBe(10);
    expect(stats.rangeHigh).toBe(44_000);
    expect(stats.rangeLow).toBe(40_000);
    expect(stats.rangeLabel).toBe('3 phiên');
    expect(stats.avgVolume20).toBe(200);
    expect(stats.quote.close).toBe(44_000);
    expect(stats.history.map((row) => row.date)).toEqual(['2026-01-05', '2026-01-02', '2025-12-31']);
  });
});

describe('symbol groups', () => {
  const vjc = { exchange: 'HOSE', indices: ['VN30', 'VN100'] };
  const shs = { exchange: 'HNX', indices: ['HNX30'] };
  it('matches index baskets and exchanges', () => {
    expect(inGroup(vjc, 'VN30')).toBe(true);
    expect(inGroup(vjc, 'HNX30')).toBe(false);
    expect(inGroup(shs, 'HNX')).toBe(true);
    expect(inGroup(shs, 'HOSE')).toBe(false);
    expect(inGroup({ exchange: 'HOSE' }, 'VN30')).toBe(false);
    expect(inGroup(shs, 'all')).toBe(true);
  });
  it('lists every index basket as a tab', () => {
    const tabs = SYMBOL_GROUPS.map(([value]) => value);
    expect(INDEX_GROUPS.every((group) => tabs.includes(group))).toBe(true);
  });
});
