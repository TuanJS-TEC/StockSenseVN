import { describe, expect, it } from 'vitest';
import { forecastOf } from './repository.js';

const row = { t5_level: 'high', t5_low: '-0.038000', t5_high: '0.036000', t5_coverage: '0.800', t5_has_news: true,
  t5_sentiment: -0.31, t5_flags: ['sanction'], t5_date: '2026-11-12', t5_stale: false, t2_level: null };

describe('forecastOf (price range, migration 025)', () => {
  it('maps a forecast_ranges row to level, range and news context', () => {
    expect(forecastOf(row, 't5')).toEqual({
      riskLevel: 'high', range: { lowPct: -0.038, highPct: 0.036, coverage: 0.8 },
      news: { hasNews: true, sentiment24h: -0.31, riskFlags: ['sanction'] },
      dataDate: '2026-11-12', stale: false, label: null, probabilities: null, confidence: null,
    });
  });
  it('is null when the symbol has no range for that horizon', () => {
    expect(forecastOf(row, 't2')).toBeNull();
    expect(forecastOf({}, 't5')).toBeNull();
  });
  it('keeps a missing sentiment null and a missing flag list empty', () => {
    const f = forecastOf({ ...row, t5_sentiment: null, t5_flags: null, t5_has_news: false, t5_stale: true }, 't5');
    expect(f.news).toEqual({ hasNews: false, sentiment24h: null, riskFlags: [] });
    expect(f.stale).toBe(true);
  });
});
