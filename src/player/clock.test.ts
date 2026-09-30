import { describe, expect, it } from 'vitest';
import { makeClock, pause, play, positionAt, seek, setSpeed } from './clock';

describe('clock', () => {
  it('advances only while playing, scaled by speed', () => {
    let c = makeClock(10_000);
    expect(positionAt(c, 500)).toBe(0);
    c = play(c, 1000);
    expect(positionAt(c, 3000)).toBe(2000);
    c = setSpeed(c, 3000, 2);
    expect(positionAt(c, 3000)).toBe(2000); // no jump on speed change
    expect(positionAt(c, 4000)).toBe(4000);
    c = pause(c, 4000);
    expect(positionAt(c, 9000)).toBe(4000);
  });

  it('clamps to the timeline and restarts when played from the end', () => {
    let c = play(makeClock(1000), 0);
    expect(positionAt(c, 5000)).toBe(1000);
    c = play(pause(c, 5000), 5000);
    expect(positionAt(c, 5000)).toBe(0);
    expect(positionAt(seek(c, 0, -50), 0)).toBe(0);
  });
});
