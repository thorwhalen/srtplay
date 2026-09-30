/** The srtplay screen: the subtitle stage, the control bar, drop zone and overlays. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { displayBinding, eventBinding, findCommand, makeCommands, type Command } from '../commands';
import * as player from '../player/store';
import { usePlayer } from '../player/store';
import { FONT_SIZE, OFFSET, SPEED } from '../settings/schema';
import { lastStartingAtOrBefore, toSegments, type Cue } from '../srt/parse';
import { useFrameNow, useWakeLock } from './hooks';
import { Stepper } from './Stepper';
import { Timeline } from './Timeline';

export function App() {
  const state = usePlayer();
  const { cues, clock, settings, fileName, error } = state;
  const fileInput = useRef<HTMLInputElement>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<number | null>(null);

  const frameNow = useFrameNow(clock.playing);
  const position = preview ?? player.currentPosition(state);
  void frameNow; // the frame tick is what makes `position` move
  const cueIndex = player.cueIndexAtPosition(state, position);
  const lastStarted = lastStartingAtOrBefore(cues, position - settings.offsetMs);
  useWakeLock(clock.playing);

  // Pause at the end rather than sitting "playing" on an empty screen.
  useEffect(() => {
    if (clock.playing && position >= clock.duration) player.pausePlayback();
  }, [clock.playing, clock.duration, position]);

  const commands = useMemo(
    () =>
      makeCommands({
        openFile: () => fileInput.current?.click(),
        toggleHelp: () => setHelpOpen(o => !o),
        toggleFullscreen: () => {
          if (document.fullscreenElement) void document.exitFullscreen();
          else void document.documentElement.requestFullscreen?.().catch(() => {});
        },
      }),
    [],
  );
  const byId = (id: string) => commands.find(c => c.id.endsWith(id))!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTextEntry(e.target)) return;
      if (e.key === 'Escape') {
        setHelpOpen(false);
        setSettingsOpen(false);
        return;
      }
      const cmd = findCommand(commands, eventBinding(e));
      if (!cmd) return;
      e.preventDefault(); // Space would also "click" the focused button
      cmd.run();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commands]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  useEffect(() => {
    document.title = fileName ? `${fileName} · srtplay` : 'srtplay';
  }, [fileName]);

  const openFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) void player.loadFile(file);
  };

  const loaded = cues.length > 0;

  return (
    <div
      className={`app${dragOver ? ' drag-over' : ''}`}
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={e => {
        if (e.currentTarget === e.target) setDragOver(false);
      }}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        openFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={fileInput}
        type="file"
        accept=".srt,application/x-subrip,text/plain"
        hidden
        onChange={e => {
          openFiles(e.target.files);
          e.target.value = ''; // so choosing the same file again still loads it
          e.target.blur();
        }}
      />

      <header className="topbar">
        <span className="brand">srtplay</span>
        <span className="file-name" title={fileName ?? undefined}>
          {fileName ?? ''}
        </span>
        <button type="button" className="icon" onClick={byId('file.open').run} title="Open an .srt file (O)">
          Open
        </button>
        <button
          type="button"
          className="icon"
          onClick={() => setSettingsOpen(o => !o)}
          aria-expanded={settingsOpen}
          title="Settings"
        >
          ⚙
        </button>
        <button type="button" className="icon" onClick={() => setHelpOpen(o => !o)} title="Keyboard shortcuts (?)">
          ?
        </button>
      </header>

      <main
        className="stage"
        onClick={() => {
          // Tap the stage to play/pause, like a video; not when selecting text.
          if (loaded && !window.getSelection()?.toString()) player.togglePlay();
        }}
      >
        {loaded ? (
          <CueView cues={cues} index={cueIndex} lastStarted={lastStarted} fontSize={settings.fontSize} showContext={settings.showContext} />
        ) : (
          <EmptyState onOpen={byId('file.open').run} />
        )}
      </main>

      {error && (
        <div className="toast" role="alert">
          {error}
          <button type="button" onClick={player.dismissError} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <footer className="controls">
        <Timeline position={position} duration={clock.duration} onPreview={setPreview} onSeek={player.seekTo} />
        <div className="buttons">
          <div className="transport">
            <button type="button" onClick={byId('cue.previous').run} disabled={!loaded} title="Previous subtitle (↑)" aria-label="Previous subtitle">
              ⏮
            </button>
            <button type="button" onClick={byId('playback.back').run} disabled={!loaded} title="Back 5 s (←)" aria-label="Back 5 seconds">
              −5s
            </button>
            <button
              type="button"
              className="play"
              onClick={player.togglePlay}
              disabled={!loaded}
              title={clock.playing ? 'Pause (Space)' : 'Play (Space)'}
              aria-label={clock.playing ? 'Pause' : 'Play'}
            >
              {clock.playing ? '❚❚' : '▶'}
            </button>
            <button type="button" onClick={byId('playback.forward').run} disabled={!loaded} title="Forward 5 s (→)" aria-label="Forward 5 seconds">
              +5s
            </button>
            <button type="button" onClick={byId('cue.next').run} disabled={!loaded} title="Next subtitle (↓)" aria-label="Next subtitle">
              ⏭
            </button>
          </div>
          <div className="dials">
            <Stepper
              label="Speed"
              display={`${settings.speed.toFixed(2)}×`}
              onStep={player.stepSpeed}
              onReset={byId('speed.reset').run}
              canDown={settings.speed > SPEED.min}
              canUp={settings.speed < SPEED.max}
              downTitle="Slower ([)"
              upTitle="Faster (])"
            />
            <Stepper
              label="Text"
              display={`${settings.fontSize}px`}
              onStep={player.stepFontSize}
              onReset={() => player.updateSettings({ fontSize: FONT_SIZE.default })}
              canDown={settings.fontSize > FONT_SIZE.min}
              canUp={settings.fontSize < FONT_SIZE.max}
              downTitle="Smaller text (−)"
              upTitle="Larger text (+)"
            />
          </div>
        </div>
      </footer>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {helpOpen && <HelpOverlay commands={commands} onClose={() => setHelpOpen(false)} />}
      {dragOver && <div className="drop-hint">Drop the .srt file to play it</div>}
    </div>
  );
}

interface CueViewProps {
  cues: Cue[];
  /** The cue on screen, or -1 in a gap between cues. */
  index: number;
  /** The last cue that has started (-1 before the first); in a gap, it is the one just gone. */
  lastStarted: number;
  fontSize: number;
  showContext: boolean;
}

function CueView({ cues, index, lastStarted, fontSize, showContext }: CueViewProps) {
  // In a gap, the context lines are the cue just gone and the one coming up.
  const prev = index >= 0 ? (cues[index - 1] ?? null) : (cues[lastStarted] ?? null);
  const next = cues[(index >= 0 ? index : lastStarted) + 1] ?? null;
  return (
    <div className="cues" style={{ fontSize }} aria-live="polite">
      {showContext && <p className="cue context">{prev && <CueText cue={prev} />}</p>}
      <p className="cue current">{index >= 0 && <CueText cue={cues[index]} />}</p>
      {showContext && <p className="cue context">{next && <CueText cue={next} />}</p>}
    </div>
  );
}

/** Keys typed into a text field or a select belong to it, not to the shortcuts. */
function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) return true;
  if (!(target instanceof HTMLInputElement)) return false;
  return !['checkbox', 'radio', 'file', 'button', 'range'].includes(target.type);
}

function CueText({ cue }: { cue: Cue }) {
  return (
    <>
      {toSegments(cue.text).map((seg, i) => {
        const style = {
          fontStyle: seg.italic ? 'italic' : undefined,
          fontWeight: seg.bold ? 700 : undefined,
          textDecoration: seg.underline ? 'underline' : undefined,
        };
        return (
          <span key={i} style={style}>
            {seg.text}
          </span>
        );
      })}
    </>
  );
}

function EmptyState({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="empty">
      <p className="empty-title">Play subtitles as timed text</p>
      <p>Drop an .srt file anywhere, or</p>
      <button type="button" className="primary" onClick={onOpen}>
        Choose an .srt file
      </button>
      <p className="hint">The file stays on your device. Press ? for shortcuts.</p>
    </div>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = usePlayer(s => s.settings);
  const offsetS = settings.offsetMs / 1000;
  return (
    <div className="panel" role="dialog" aria-label="Settings">
      <div className="panel-head">
        <strong>Settings</strong>
        <button type="button" onClick={onClose} aria-label="Close settings">
          ×
        </button>
      </div>
      <Stepper
        label="Sync"
        display={`${offsetS > 0 ? '+' : ''}${offsetS.toFixed(1)}s`}
        onStep={player.stepOffset}
        onReset={() => player.updateSettings({ offsetMs: OFFSET.default })}
        canDown={settings.offsetMs > OFFSET.min}
        canUp={settings.offsetMs < OFFSET.max}
        downTitle="Subtitles earlier (G)"
        upTitle="Subtitles later (H)"
      />
      <label className="row">
        <input
          type="checkbox"
          checked={settings.showContext}
          onChange={e => player.updateSettings({ showContext: e.target.checked })}
        />
        Show previous and next line
      </label>
      <label className="row">
        Theme
        <select
          value={settings.theme}
          onChange={e => player.updateSettings({ theme: e.target.value as typeof settings.theme })}
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
      </label>
      <p className="hint">Settings are saved in this browser.</p>
    </div>
  );
}

function HelpOverlay({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="panel help" role="dialog" aria-label="Keyboard shortcuts" onClick={e => e.stopPropagation()}>
        <div className="panel-head">
          <strong>Keyboard shortcuts</strong>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <table>
          <tbody>
            {commands
              .filter(c => c.keybinding?.length)
              .map(c => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td>
                    {c.keybinding!.map(k => (
                      <kbd key={k}>{displayBinding(k)}</kbd>
                    ))}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <p className="hint">Tap the text area to play or pause. Drag the bar to seek.</p>
      </div>
    </div>
  );
}
