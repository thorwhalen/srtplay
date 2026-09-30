/**
 * SRT parsing and cue lookup — pure functions, no DOM, no dependencies.
 *
 * Reusable outside this app: `parseSrt(text)` turns the text of a SubRip file into
 * sorted cues (times in milliseconds), `cueIndexAt(cues, t)` finds the cue showing
 * at time `t`, and `formatTime(ms)` renders a position as `H:MM:SS`.
 *
 * The parser is lenient in the ways real-world .srt files need: a UTF-8 BOM, CRLF
 * or CR line endings, missing or wrong cue numbers, `.` instead of `,` before the
 * milliseconds, 1-digit hours, trailing position hints after the end time
 * (`X1:... Y1:...`), and blank-line runs. Blocks without a valid timing line are
 * skipped and reported in `skipped` rather than failing the whole file.
 */

export interface Cue {
  /** Position in the sorted cue list (0-based). */
  index: number;
  /** Start time, in milliseconds. */
  start: number;
  /** End time, in milliseconds. */
  end: number;
  /** Cue text, lines joined with `\n`, inline tags left as they are. */
  text: string;
}

export interface ParseResult {
  cues: Cue[];
  /** Number of non-empty blocks that had no valid timing line. */
  skipped: number;
}

const TIMESTAMP = String.raw`(\d{1,3}):(\d{1,2}):(\d{1,2})[,.](\d{1,3})`;
const TIMING_LINE = new RegExp(`^\\s*${TIMESTAMP}\\s*-->\\s*${TIMESTAMP}`);

function toMs(h: string, m: string, s: string, frac: string): number {
  // "5" after the comma means 500 ms, not 5 ms.
  const ms = Number(frac.padEnd(3, '0'));
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 + ms;
}

/** Parse the text of an .srt file into cues sorted by start time. */
export function parseSrt(text: string): ParseResult {
  const normalized = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const raw: Omit<Cue, 'index'>[] = [];
  let skipped = 0;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines[0] === '') continue;
    const timingAt = lines.findIndex(line => TIMING_LINE.test(line));
    if (timingAt === -1 || timingAt > 1) {
      skipped += 1;
      continue;
    }
    const m = TIMING_LINE.exec(lines[timingAt])!;
    const start = toMs(m[1], m[2], m[3], m[4]);
    const end = toMs(m[5], m[6], m[7], m[8]);
    const cueText = lines
      .slice(timingAt + 1)
      .join('\n')
      .trim();
    raw.push({ start, end: Math.max(end, start), text: cueText });
  }

  raw.sort((a, b) => a.start - b.start || a.end - b.end);
  return { cues: raw.map((c, index) => ({ ...c, index })), skipped };
}

/**
 * Index of the cue on screen at time `t` (ms), or -1 when none is.
 *
 * When cues overlap, the latest-starting one that still covers `t` wins.
 * Binary search, so it is cheap to call on every animation frame.
 */
export function cueIndexAt(cues: readonly Cue[], t: number): number {
  const i = lastStartingAtOrBefore(cues, t);
  for (let j = i; j >= 0 && j > i - 8; j--) {
    if (cues[j].end > t) return j;
  }
  return -1;
}

/** Index of the last cue whose start is <= `t`, or -1. */
export function lastStartingAtOrBefore(cues: readonly Cue[], t: number): number {
  let lo = 0;
  let hi = cues.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/** Total length of a cue list: the latest end time (ms). */
export function durationOf(cues: readonly Cue[]): number {
  return cues.reduce((max, c) => Math.max(max, c.end), 0);
}

/** Render milliseconds as `H:MM:SS` (or `M:SS` under an hour). */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export interface Segment {
  text: string;
  italic: boolean;
  bold: boolean;
  underline: boolean;
}

/**
 * Split cue text into styled runs, honouring `<i> <b> <u>` (the tags SRT players
 * support) and dropping everything else (`<font>`, `{\\an8}` positioning codes).
 * Returns data, not markup, so a UI can render it without `innerHTML`.
 */
export function toSegments(text: string): Segment[] {
  const clean = text.replace(/\{\\[^}]*\}/g, '');
  const style = { i: 0, b: 0, u: 0 };
  const out: Segment[] = [];
  for (const part of clean.split(/(<\/?[a-zA-Z][^>]*>)/)) {
    const tag = /^<(\/?)([ibu])\b[^>]*>$/i.exec(part);
    if (tag) {
      const key = tag[2].toLowerCase() as 'i' | 'b' | 'u';
      style[key] = Math.max(0, style[key] + (tag[1] ? -1 : 1));
      continue;
    }
    if (part === '' || /^<\/?[a-zA-Z][^>]*>$/.test(part)) continue;
    out.push({ text: part, italic: style.i > 0, bold: style.b > 0, underline: style.u > 0 });
  }
  return out;
}
