/**
 * A pure playback clock: where in the timeline we are, given wall-clock time.
 *
 * The clock is a value, not a timer. It stores the position at the last change
 * (`anchorPos`) and the wall time of that change (`anchorWall`); the current
 * position is derived from `now`. Play, pause, seek and speed changes each return a
 * new clock re-anchored at `now`, so changing speed mid-play never makes the
 * position jump. Rendering reads `positionAt(clock, performance.now())` each frame.
 */

export interface Clock {
  playing: boolean;
  /** Timeline position (ms) at `anchorWall`. */
  anchorPos: number;
  /** Wall-clock time (ms, e.g. performance.now()) of the last re-anchor. */
  anchorWall: number;
  /** Playback rate; 1 is real time. */
  speed: number;
  /** Length of the timeline (ms); the clock stops there. */
  duration: number;
}

export function makeClock(duration: number, speed = 1): Clock {
  return { playing: false, anchorPos: 0, anchorWall: 0, speed, duration };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function positionAt(c: Clock, now: number): number {
  if (!c.playing) return c.anchorPos;
  return clamp(c.anchorPos + (now - c.anchorWall) * c.speed, 0, c.duration);
}

export function isAtEnd(c: Clock, now: number): boolean {
  return positionAt(c, now) >= c.duration;
}

export function play(c: Clock, now: number): Clock {
  // Playing from the end restarts, as every media player does.
  const from = isAtEnd(c, now) ? 0 : positionAt(c, now);
  return { ...c, playing: true, anchorPos: from, anchorWall: now };
}

export function pause(c: Clock, now: number): Clock {
  return { ...c, playing: false, anchorPos: positionAt(c, now), anchorWall: now };
}

export function seek(c: Clock, now: number, pos: number): Clock {
  return { ...c, anchorPos: clamp(pos, 0, c.duration), anchorWall: now };
}

export function setSpeed(c: Clock, now: number, speed: number): Clock {
  return { ...c, anchorPos: positionAt(c, now), anchorWall: now, speed };
}
