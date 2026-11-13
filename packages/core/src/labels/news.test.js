import { describe, expect, it } from 'vitest';
import { RISK_TEXT, UNSURE_NOTE, defaultRange, relationText, sentimentOf } from './news.js';

describe('nlp news labels', () => {
  it('sentimentOf: unsure beats the top label, else the argmax in rounded percent', () => {
    expect(sentimentOf({ uncertain: true, probabilities: { positive: 0.04, neutral: 0.76, negative: 0.2 } })).toEqual({ tone: 'unsure', text: 'Chưa chắc' });
    expect(sentimentOf({ uncertain: false, probabilities: { positive: 0.88, neutral: 0.08, negative: 0.04 } })).toEqual({ tone: 'up', text: 'Tích cực 88%' });
    expect(sentimentOf({ uncertain: false, probabilities: { positive: 0.05, neutral: 0.8, negative: 0.15 } }).text).toBe('Trung tính 80%');
    expect(sentimentOf({ uncertain: false, probabilities: { positive: 0.3, neutral: 0.18, negative: 0.516 } })).toEqual({ tone: 'down', text: 'Tiêu cực 52%' });
  });
  it('relationText covers the four relations', () => {
    expect(relationText('direct', 'FPT')).toBe('Nói trực tiếp về FPT');
    expect(relationText('sector', 'FPT')).toBe('Tin ngành');
    expect(relationText('market', 'FPT')).toBe('Tin thị trường chung');
    expect(relationText('ambiguous', 'FPT')).toBe('Liên quan chưa rõ');
  });
  it('exposes the risk labels and the unsure note', () => {
    expect(Object.keys(RISK_TEXT).sort()).toEqual(['bond_default', 'guarantee', 'prosecution', 'sanction', 'seizure']);
    expect(UNSURE_NOTE).toMatch(/không được tính/);
  });
  it('defaultRange is today in VN time minus 7 days', () => {
    // 2026-11-12 18:00 UTC is already 13 Nov 01:00 in Vietnam.
    expect(defaultRange(Date.parse('2026-11-12T18:00:00Z'))).toEqual({ from: '2026-11-06', to: '2026-11-13' });
    expect(defaultRange(Date.parse('2026-11-12T10:00:00Z'))).toEqual({ from: '2026-11-05', to: '2026-11-12' });
  });
});
