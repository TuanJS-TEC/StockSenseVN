import { describe, expect, it } from 'vitest';
import { getConfig } from './config.js';

const env = { DATABASE_URL: 'postgres://x' };

describe('market sync config', () => {
  it('reads an optional symbol subset', () => {
    expect(getConfig(env, ['--from', '2026-11-13', '--to', '2026-11-18', '--symbols', 'fpt, VNM'])).toMatchObject({
      startDate: '2026-11-13', endDate: '2026-11-18', symbols: ['FPT', 'VNM'] });
    expect(getConfig(env, ['--from', '2026-11-13', '--to', '2026-11-18']).symbols).toBeNull();
  });
  it('rejects a malformed symbol list', () => {
    expect(() => getConfig(env, ['--symbols', 'FPT;DROP'])).toThrow('--symbols');
  });
});
