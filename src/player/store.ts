/**
 * The player's state (zustand + immer) and every action on it, as named functions.
 *
 * UI components and the command registry call these; nothing calls `set` directly.
 * The playback clock is a pure value (see `clock.ts`); actions re-anchor it at
 * `performance.now()`, and the view derives the position each frame.
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { cueIndexAt, durationOf, lastStartingAtOrBefore, parseSrt, type Cue } from '../srt/parse';
import {
  DEFAULT_SETTINGS,
  FONT_SIZE,
  OFFSET,
  SPEED,
  stepValue,
  type Settings,
} from '../settings/schema';
import { settingsStorage, type SettingsStorage } from '../settings/storage';
import * as clock from './clock';

/** Seconds a "seek back/forward" moves, and a "big" seek. */
export const SEEK_STEP_MS = 5_000;
export const SEEK_BIG_STEP_MS = 30_000;
/** Pressing "previous cue" this soon after a cue starts goes to the one before it. */
const PREV_CUE_GRACE_MS = 1_500;

export interface PlayerState {
  fileName: string | null;
  cues: Cue[];
  skipped: number;
  error: string | null;
  clock: clock.Clock;
  settings: Settings;
  settingsLoaded: boolean;
}

const now = () => performance.now();

export const usePlayer = create<PlayerState>()(
  immer(() => ({
    fileName: null,
    cues: [],
    skipped: 0,
    error: null,
    clock: clock.makeClock(0, DEFAULT_SETTINGS.speed),
    settings: DEFAULT_SETTINGS,
    settingsLoaded: false,
  })),
);

const set = usePlayer.setState;
const get = usePlayer.getState;

// --- settings persistence ---------------------------------------------------

let storage: SettingsStorage = settingsStorage();

/** Load saved settings; pass a storage to replace the localStorage default. */
export async function initSettings(custom?: SettingsStorage): Promise<void> {
  if (custom) storage = custom;
  const settings = await storage.load();
  set(s => {
    s.settings = settings;
    s.clock = clock.setSpeed(s.clock, now(), settings.speed);
    s.settingsLoaded = true;
  });
}

export function updateSettings(patch: Partial<Settings>): void {
  set(s => {
    Object.assign(s.settings, patch);
    if (patch.speed !== undefined) s.clock = clock.setSpeed(s.clock, now(), patch.speed);
    if (patch.offsetMs !== undefined) s.clock.duration = timelineLength(s.cues, patch.offsetMs);
  });
  void storage.save(get().settings);
}

/** The timeline runs to the last cue's end, pushed later by a positive offset. */
function timelineLength(cues: readonly Cue[], offsetMs: number): number {
  return durationOf(cues) + Math.max(0, offsetMs);
}

// --- position ----------------------------------------------------------------

/** Timeline position (ms) right now. */
export function currentPosition(state: PlayerState = get()): number {
  return clock.positionAt(state.clock, now());
}

/** The cue on screen at timeline position `pos`, accounting for the sync offset. */
export function cueIndexAtPosition(state: PlayerState, pos: number): number {
  return cueIndexAt(state.cues, pos - state.settings.offsetMs);
}

// --- actions -----------------------------------------------------------------

export function loadSrtText(fileName: string, text: string): void {
  const { cues, skipped } = parseSrt(text);
  if (cues.length === 0) {
    set(s => {
      s.error = `No subtitles found in “${fileName}”. Is it an .srt file?`;
    });
    return;
  }
  set(s => {
    s.fileName = fileName;
    s.cues = cues;
    s.skipped = skipped;
    s.error = null;
    s.clock = clock.makeClock(timelineLength(cues, s.settings.offsetMs), s.settings.speed);
  });
}

export async function loadFile(file: File): Promise<void> {
  try {
    loadSrtText(file.name, await readText(file));
  } catch {
    set(s => {
      s.error = `Could not read “${file.name}”.`;
    });
  }
}

/** Read as UTF-8, falling back to Windows-1252 when the bytes are not valid UTF-8. */
async function readText(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function dismissError(): void {
  set(s => {
    s.error = null;
  });
}

export function togglePlay(): void {
  if (!get().cues.length) return;
  set(s => {
    s.clock = s.clock.playing ? clock.pause(s.clock, now()) : clock.play(s.clock, now());
  });
}

export function pausePlayback(): void {
  set(s => {
    s.clock = clock.pause(s.clock, now());
  });
}

export function seekTo(pos: number): void {
  set(s => {
    s.clock = clock.seek(s.clock, now(), pos);
  });
}

export function seekBy(deltaMs: number): void {
  seekTo(currentPosition() + deltaMs);
}

/** Jump to the start of the next (+1) or previous (-1) cue. */
export function jumpCue(direction: 1 | -1): void {
  const state = get();
  const { cues } = state;
  if (!cues.length) return;
  const offset = state.settings.offsetMs;
  const t = currentPosition(state) - offset;
  const i = lastStartingAtOrBefore(cues, t);
  let target: number;
  if (direction === 1) {
    target = Math.min(i + 1, cues.length - 1);
  } else {
    const intoCue = i >= 0 ? t - cues[i].start : 0;
    target = Math.max(intoCue < PREV_CUE_GRACE_MS ? i - 1 : i, 0);
  }
  seekTo(cues[target].start + offset);
}

export function restart(): void {
  seekTo(0);
}

export function stepSpeed(n: number): void {
  updateSettings({ speed: stepValue(get().settings.speed, n, SPEED) });
}

export function stepFontSize(n: number): void {
  updateSettings({ fontSize: stepValue(get().settings.fontSize, n, FONT_SIZE) });
}

export function stepOffset(n: number): void {
  updateSettings({ offsetMs: stepValue(get().settings.offsetMs, n, OFFSET) });
}
