import { describe, expect, it } from 'vitest';
import { DEMO_FORECAST_NOTE, EXPERIMENTAL_FORECAST_NOTE, forecastStateNote } from './disclaimer.js';

describe('forecastStateNote', () => {
  it('warns for demo and experimental batches only', () => {
    expect(forecastStateNote('demo')).toBe(DEMO_FORECAST_NOTE);
    expect(forecastStateNote('experimental')).toBe(EXPERIMENTAL_FORECAST_NOTE);
    expect(EXPERIMENTAL_FORECAST_NOTE).toMatch(/thử nghiệm/);
    expect(forecastStateNote('live')).toBeNull();
    expect(forecastStateNote(undefined)).toBeNull();
  });
});
