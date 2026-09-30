/**
 * Viewer settings: the Zod schema is the single source of truth for their shape,
 * bounds, steps and defaults. Controls read `BOUNDS` from here; nothing hard-codes
 * a min or max in JSX.
 */
import { z } from 'zod';

export const SPEED = { min: 0.25, max: 3, step: 0.05, default: 1 } as const;
export const FONT_SIZE = { min: 14, max: 120, step: 2, default: 36 } as const; // px
export const OFFSET = { min: -600_000, max: 600_000, step: 100, default: 0 } as const; // ms

export const settingsSchema = z.object({
  /** Playback rate; 1 is real time. */
  speed: z.number().min(SPEED.min).max(SPEED.max).default(SPEED.default),
  /** Subtitle font size in CSS px. */
  fontSize: z.number().min(FONT_SIZE.min).max(FONT_SIZE.max).default(FONT_SIZE.default),
  /** Shift every cue by this many ms (positive = later), to sync with a film. */
  offsetMs: z.number().int().min(OFFSET.min).max(OFFSET.max).default(OFFSET.default),
  /** Show the previous and next cue, dimmed, around the current one. */
  showContext: z.boolean().default(true),
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

/** Parse anything (e.g. stored JSON from an older version) into valid settings. */
export function coerceSettings(raw: unknown): Settings {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  // Field by field, so one bad value never throws away the rest.
  for (const [key, field] of Object.entries(settingsSchema.shape)) {
    const r = field.safeParse(obj[key]);
    if (r.success && obj[key] !== undefined) out[key] = r.data;
  }
  return out as Settings;
}

const roundTo = (x: number, step: number) => Math.round(x / step) * step;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Step a bounded number by `n` steps, snapped to the grid and clamped. */
export function stepValue(
  value: number,
  n: number,
  bounds: { min: number; max: number; step: number },
): number {
  const next = clamp(roundTo(value + n * bounds.step, bounds.step), bounds.min, bounds.max);
  return Number(next.toFixed(6));
}
