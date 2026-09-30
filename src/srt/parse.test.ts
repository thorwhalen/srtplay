import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { cueIndexAt, durationOf, formatTime, parseSrt, toSegments } from './parse';

const tiny = readFileSync(fileURLToPath(new URL('./fixtures/tiny.srt', import.meta.url)), 'utf8');

describe('parseSrt', () => {
  const { cues, skipped } = parseSrt(tiny);

  it('parses every timed block and skips the rest', () => {
    expect(cues).toHaveLength(5);
    expect(skipped).toBe(1);
  });

  it('sorts by start time and renumbers', () => {
    expect(cues.map(c => c.start)).toEqual([1000, 4000, 5500, 8000, 10500]);
    expect(cues.map(c => c.index)).toEqual([0, 1, 2, 3, 4]);
  });

  it('keeps multi-line text and inline tags', () => {
    expect(cues[1].text).toBe('<i>A second line,</i>\nsplit over two.');
  });

  it('accepts a dot before ms, 1-digit hours, short fractions and position hints', () => {
    expect(cues[4]).toMatchObject({ start: 10500, end: 12000, text: 'Sloppy timing still parses.' });
  });

  it('handles a BOM and CRLF line endings', () => {
    const crlf = '﻿' + tiny.replace(/\n/g, '\r\n');
    expect(parseSrt(crlf).cues).toEqual(cues);
  });

  it('returns nothing for empty input', () => {
    expect(parseSrt('')).toEqual({ cues: [], skipped: 0 });
  });
});

describe('cueIndexAt', () => {
  const { cues } = parseSrt(tiny);

  it.each([
    [0, -1],
    [1000, 0],
    [3499, 0],
    [3500, -1], // end is exclusive
    [4500, 1],
    [5600, 2], // overlap: the later-starting cue wins
    [6500, 2],
    [8500, 3],
    [9500, -1],
    [11000, 4],
    [99999, -1],
  ])('at %i ms shows cue %i', (t, expected) => {
    expect(cueIndexAt(cues, t)).toBe(expected);
  });

  it('finds nothing in an empty list', () => {
    expect(cueIndexAt([], 0)).toBe(-1);
  });
});

describe('helpers', () => {
  it('durationOf is the latest end', () => {
    expect(durationOf(parseSrt(tiny).cues)).toBe(12000);
  });

  it('formatTime', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(65_400)).toBe('1:05');
    expect(formatTime(7_384_000)).toBe('2:03:04');
  });

  it('toSegments keeps i/b/u and drops other tags', () => {
    expect(toSegments('{\\an8}<font color="red">a <i>b</i></font>')).toEqual([
      { text: 'a ', italic: false, bold: false, underline: false },
      { text: 'b', italic: true, bold: false, underline: false },
    ]);
  });
});
