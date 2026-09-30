import { describe, expect, it } from 'vitest';
import { coerceSettings, DEFAULT_SETTINGS, SPEED, stepValue } from './schema';

describe('settings', () => {
  it('defaults', () => {
    expect(DEFAULT_SETTINGS).toMatchObject({ speed: 1, fontSize: 36, offsetMs: 0 });
  });

  it('coerce keeps valid fields and drops invalid ones', () => {
    expect(coerceSettings({ speed: 2, fontSize: 9999, junk: 1 })).toEqual({
      ...DEFAULT_SETTINGS,
      speed: 2,
    });
    expect(coerceSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('stepValue snaps and clamps', () => {
    expect(stepValue(1, 1, SPEED)).toBe(1.05);
    expect(stepValue(1.03, -1, SPEED)).toBe(1);
    expect(stepValue(2.99, 5, SPEED)).toBe(3);
    expect(stepValue(0.3, -5, SPEED)).toBe(0.25);
  });
});
