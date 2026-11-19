import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { lastClosedSession, planSync, startPriceCatchup } from './price-catchup.js';

const thursdayMorning = new Date('2026-11-19T03:00:00Z'); // 10:00 ICT: today's session is still open

describe('price catch-up', () => {
  it('knows the last closed session in Vietnam time', () => {
    expect(lastClosedSession(thursdayMorning)).toBe('2026-11-18');
    expect(lastClosedSession(new Date('2026-11-19T08:45:00Z'))).toBe('2026-11-19'); // Thu 15:45: today closed
    expect(lastClosedSession(new Date('2026-11-23T03:00:00Z'))).toBe('2026-11-20'); // Mon 10:00 -> Fri
    expect(lastClosedSession(new Date('2026-11-23T03:00:00Z'), ['2026-11-20'])).toBe('2026-11-19'); // Fri holiday
  });

  it('plans the missing days, never today\'s open session', () => {
    expect(planSync({ FPT: '2026-11-12', VNM: '2026-11-13' }, thursdayMorning)).toEqual({ from: '2026-11-13', to: '2026-11-18', symbols: null });
    expect(planSync({ FPT: '2026-11-18', VNM: '2026-11-13' }, thursdayMorning)).toEqual({ from: '2026-11-14', to: '2026-11-18', symbols: ['VNM'] });
    expect(planSync({ FPT: '2026-11-18', VNM: '2026-11-18' }, thursdayMorning)).toBeNull();
  });

  it('loads five years for symbols without history before catching up the others', () => {
    expect(planSync({ FPT: null, VNM: null }, thursdayMorning)).toEqual({ from: '2021-11-18', to: '2026-11-18', symbols: null });
    expect(planSync({ FPT: '2026-11-12', NEW: null }, thursdayMorning)).toEqual({ from: '2021-11-18', to: '2026-11-18', symbols: ['NEW'] });
  });

  it('runs one worker at a time, retries failures and moves on after a clean run', async () => {
    let latest = { FPT: null, VNM: '2000-01-03' };
    const pool = { query: vi.fn(async () => ({ rows: Object.entries(latest).map(([symbol, value]) => ({ symbol, latest: value, holidays: [] })) })) };
    const children = [];
    const spawnImpl = vi.fn(() => { const child = new EventEmitter(); child.kill = vi.fn(); children.push(child); return child; });
    const catchup = startPriceCatchup(pool, { intervalMs: 0, spawnImpl, logger: {} });
    const tick = () => new Promise((resolve) => setImmediate(resolve));

    const first = await catchup.check();
    expect(first.symbols).toEqual(['FPT']); // history load first
    expect(spawnImpl.mock.calls[0][1]).toContain('--symbols');
    expect(await catchup.check()).toBeNull(); // still running
    children[0].emit('exit', 2); // partial: retried at the next check
    expect(await catchup.check()).toEqual(first);
    latest = { FPT: '2000-01-03', VNM: '2000-01-03' };
    children[1].emit('exit', 0); // clean: re-checks at once and starts the catch-up of everyone
    await tick(); await tick();
    expect(spawnImpl).toHaveBeenCalledTimes(3);
    expect(spawnImpl.mock.calls[2][1]).not.toContain('--symbols');
    children[2].emit('exit', 0); // clean, but no new bar (late publish or unlisted holiday): not repeated for an hour
    await tick(); await tick();
    expect(await catchup.check()).toBeNull();
    expect(spawnImpl).toHaveBeenCalledTimes(3);
    catchup.stop();
  });
});
