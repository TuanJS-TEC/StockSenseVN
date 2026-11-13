import { describe, expect, it } from 'vitest';
import { defaultRange, defaultWindow, mapNlpNews, parseRange, vnDayRange } from './nlp-news.js';

const now = new Date('2026-11-12T18:30:00Z'); // 01:30 VN on the 13th
const row = {
  document_id: 'd1', title: 'T', url: 'https://x/y', source: 'cafef', published_at: new Date('2026-11-12T01:00:00Z'),
  relation: 'direct', p_pos: 0.88, p_neu: 0.08, p_neg: 0.04, uncertain: false, risk_flags: ['litigation'],
  passage: 'p', model_version: 'm1',
};

describe('nlp-news helpers', () => {
  it('vnDayRange is a half-open VN-day interval in UTC', () => {
    expect(vnDayRange('2026-11-12', '2026-11-12')).toEqual({ start: '2026-11-11T17:00:00.000Z', end: '2026-11-12T17:00:00.000Z' });
  });
  it('defaultRange ends today in VN and spans 7 days', () => {
    expect(defaultRange(now)).toEqual({ from: '2026-11-06', to: '2026-11-13' });
  });
  it('defaultWindow is the half-open UTC window of the default list range', () => {
    expect(defaultWindow(now)).toEqual({ start: '2026-11-05T17:00:00.000Z', end: '2026-11-13T17:00:00.000Z' });
  });
  it('parseRange defaults, and rejects bad or inverted ranges', () => {
    expect(parseRange({}, now)).toEqual({ from: '2026-11-06', to: '2026-11-13' });
    expect(parseRange({ from: '2026-11-01' }, now)).toEqual({ from: '2026-11-01', to: '2026-11-13' });
    expect(parseRange({ from: '2026-11-13', to: '2026-11-12' }, now)).toBeNull();
    expect(parseRange({ from: '12/11/2026' }, now)).toBeNull();
    expect(parseRange({ from: '2026-02-31' }, now)).toBeNull();
  });
  it('mapNlpNews maps columns and hides HOSE api links', () => {
    expect(mapNlpNews(row)).toEqual({
      id: 'd1', title: 'T', url: 'https://x/y', source: 'cafef', publishedAt: '2026-11-12T01:00:00.000Z', relation: 'direct',
      probabilities: { positive: 0.88, neutral: 0.08, negative: 0.04 }, uncertain: false, riskFlags: ['litigation'], passage: 'p', modelVersion: 'm1',
    });
    expect(mapNlpNews({ ...row, source: 'hose' }).url).toBeNull();
  });
});
