# srtplay

Play an `.srt` subtitle file as timed text — no video needed — with controls for speed and font size.

Open it, drop an `.srt` file on the page (or choose one), press **Space**. The file never leaves your device.

Live at <https://apps.thorwhalen.com/srtplay/>.

## What it does

- **Load** by drag-and-drop or the file picker. UTF-8 and Windows-1252 files both read correctly.
- **Play / pause / seek** on a timeline; drag the bar (a ghost dot marks where you were), or jump subtitle by subtitle.
- **Speed** from 0.25× to 3×, and **text size** from 14 to 120 px.
- **Sync offset** (Settings, or G / H) to line the subtitles up with a film you are watching elsewhere.
- **Keyboard shortcuts** for everything; press **?** for the list.
- Works on phones and tablets: large touch targets, tap the text to play/pause, the screen stays awake while playing.
- **Settings are remembered** per browser.

## Shortcuts

| Action | Keys |
|---|---|
| Play / pause | Space, K |
| Back / forward 5 s | ← / → |
| Back / forward 30 s | Shift+← / Shift+→, J / L |
| Previous / next subtitle | ↑ / ↓, `,` / `.` |
| Slower / faster / normal | `[` / `]` / `\` |
| Smaller / larger text | `-` / `=` |
| Subtitles earlier / later by 0.1 s | G / H |
| Full screen · open file · help | F · O · ? |

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest: parser, clock, settings
npm run build    # type-check + production build into dist/
```

### Layout

| Path | What |
|---|---|
| `src/srt/parse.ts` | The SRT parser and cue lookup: pure functions, no DOM, no dependencies. Reusable anywhere. |
| `src/player/clock.ts` | A pure playback clock (position derived from wall time, so speed changes never jump). |
| `src/player/store.ts` | zustand + immer state and every action as a named function. |
| `src/settings/` | The Zod settings schema (bounds, steps, defaults) and its storage seam: a zodal `DataProvider`, localStorage by default. |
| `src/commands.ts` | Every user action declared once (acture `CommandRecord` shape); buttons, keys and the help overlay read it. |
| `src/ui/` | React components. |

### Using the parser on its own

```ts
import { parseSrt, cueIndexAt, formatTime } from './src/srt/parse';

const { cues, skipped } = parseSrt(text);   // cues sorted, times in ms
const i = cueIndexAt(cues, 83_500);         // the cue on screen at 1:23.5, or -1
```

### Test data

Tests use a tiny made-up fixture (`src/srt/fixtures/tiny.srt`). Real subtitle files are copyrighted and are **never committed**; keep any you test with outside the repo (the author's live under `~/.local/share/srtplay/samples/`). `.gitignore` refuses `*.srt` everywhere except the fixtures folder.

## Deploy

Served by the tw_platform (enlace) at `/srtplay/`; `app.toml` declares the build.
