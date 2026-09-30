/**
 * Every user action, declared once. Buttons, the keyboard and the help overlay all
 * read this list, so a shortcut and its button can never disagree.
 *
 * The records follow acture's `CommandRecord` shape (id, title, keybinding, ...) with
 * a local `run`, so moving to the acture registry later (for a palette or an MCP
 * surface) is a registration, not a rewrite. Keybindings use `KeyboardEvent.key`
 * values; `Shift+` is the only modifier we bind.
 */
import * as player from './player/store';

export interface Command {
  id: string;
  title: string;
  category: 'Playback' | 'Navigate' | 'View' | 'File';
  keybinding?: string[];
  run: () => void;
}

/** Host hooks the UI provides (opening the picker, toggling help and fullscreen). */
export interface CommandHost {
  openFile: () => void;
  toggleHelp: () => void;
  toggleFullscreen: () => void;
}

export function makeCommands(host: CommandHost): Command[] {
  return [
    { id: 'srtplay.playback.toggle', title: 'Play / pause', category: 'Playback', keybinding: [' ', 'k'], run: player.togglePlay },
    { id: 'srtplay.playback.back', title: 'Back 5 s', category: 'Navigate', keybinding: ['ArrowLeft'], run: () => player.seekBy(-player.SEEK_STEP_MS) },
    { id: 'srtplay.playback.forward', title: 'Forward 5 s', category: 'Navigate', keybinding: ['ArrowRight'], run: () => player.seekBy(player.SEEK_STEP_MS) },
    { id: 'srtplay.playback.backBig', title: 'Back 30 s', category: 'Navigate', keybinding: ['Shift+ArrowLeft', 'j'], run: () => player.seekBy(-player.SEEK_BIG_STEP_MS) },
    { id: 'srtplay.playback.forwardBig', title: 'Forward 30 s', category: 'Navigate', keybinding: ['Shift+ArrowRight', 'l'], run: () => player.seekBy(player.SEEK_BIG_STEP_MS) },
    { id: 'srtplay.cue.previous', title: 'Previous subtitle', category: 'Navigate', keybinding: ['ArrowUp', ','], run: () => player.jumpCue(-1) },
    { id: 'srtplay.cue.next', title: 'Next subtitle', category: 'Navigate', keybinding: ['ArrowDown', '.'], run: () => player.jumpCue(1) },
    { id: 'srtplay.playback.restart', title: 'Back to the start', category: 'Navigate', keybinding: ['Home', '0'], run: player.restart },
    { id: 'srtplay.speed.down', title: 'Slower', category: 'Playback', keybinding: ['[', '<'], run: () => player.stepSpeed(-1) },
    { id: 'srtplay.speed.up', title: 'Faster', category: 'Playback', keybinding: [']', '>'], run: () => player.stepSpeed(1) },
    { id: 'srtplay.speed.reset', title: 'Normal speed', category: 'Playback', keybinding: ['\\'], run: () => player.updateSettings({ speed: 1 }) },
    { id: 'srtplay.font.down', title: 'Smaller text', category: 'View', keybinding: ['-'], run: () => player.stepFontSize(-1) },
    { id: 'srtplay.font.up', title: 'Larger text', category: 'View', keybinding: ['=', '+'], run: () => player.stepFontSize(1) },
    { id: 'srtplay.offset.earlier', title: 'Subtitles earlier (−0.1 s)', category: 'Playback', keybinding: ['g'], run: () => player.stepOffset(-1) },
    { id: 'srtplay.offset.later', title: 'Subtitles later (+0.1 s)', category: 'Playback', keybinding: ['h'], run: () => player.stepOffset(1) },
    { id: 'srtplay.view.fullscreen', title: 'Full screen', category: 'View', keybinding: ['f'], run: host.toggleFullscreen },
    { id: 'srtplay.file.open', title: 'Open an .srt file', category: 'File', keybinding: ['o'], run: host.openFile },
    { id: 'srtplay.view.help', title: 'Keyboard shortcuts', category: 'View', keybinding: ['?'], run: host.toggleHelp },
  ];
}

/** The binding string for a key event, e.g. `Shift+ArrowLeft`, `k`, `?`. */
export function eventBinding(e: Pick<KeyboardEvent, 'key' | 'shiftKey'>): string {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  // Printable keys already encode Shift (`?`, `>`); only named keys get a prefix.
  return e.shiftKey && e.key.length > 1 ? `Shift+${key}` : key;
}

export function findCommand(commands: readonly Command[], binding: string): Command | undefined {
  return commands.find(c => c.keybinding?.includes(binding));
}

/** How a binding reads in the help overlay. */
export function displayBinding(binding: string): string {
  const names: Record<string, string> = {
    ' ': 'Space',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
  };
  return binding
    .split('+')
    .map(part => names[part] ?? (part.length === 1 ? part.toUpperCase() : part))
    .join(' + ');
}
