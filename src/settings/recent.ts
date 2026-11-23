/**
 * Recent files: the last subtitle files opened, with where playback stopped, so one tap reopens
 * a file at that point (a file picked from disk cannot be reopened by name, so its text is kept;
 * .srt files are small). The seam is a zodal `DataProvider`, like settings: this browser's
 * localStorage by default.
 */
import type { DataProvider } from '@zodal/store';
import { createLocalStorageProvider } from '@zodal/store-localstorage';

export const RECENT_KEY = 'srtplay:recent';
export const RECENT_MAX = 10;

export interface RecentFile {
  /** The file name (its id: the same name again is the same file). */
  id: string;
  text: string;
  /** Timeline position (ms) where playback stopped. */
  position: number;
  /** Played to the end once. */
  done: boolean;
  at: number;
}

export function recentStore(provider: DataProvider<RecentFile> = createLocalStorageProvider<RecentFile>({ storageKey: RECENT_KEY })) {
  const all = async (): Promise<RecentFile[]> => {
    try {
      const { data } = await provider.getList({ sort: [{ id: 'at', desc: true }] });
      return data;
    } catch {
      return []; // blocked storage: nothing recent, the player still works
    }
  };
  const put = async (rec: RecentFile) => {
    try {
      if (provider.upsert) await provider.upsert(rec);
      else await provider.update(rec.id, rec).catch(() => provider.create(rec));
    } catch {
      /* storage full or blocked */
    }
  };
  return {
    all,
    /** A file was opened: it goes to the top, keeping where it stopped before; the list keeps RECENT_MAX. */
    async opened(name: string, text: string): Promise<RecentFile> {
      const list = await all();
      const was = list.find((r) => r.id === name && r.text === text);
      const rec: RecentFile = { id: name, text, position: was?.position ?? 0, done: was?.done ?? false, at: Date.now() };
      await put(rec);
      for (const old of list.filter((r) => r.id !== name).slice(RECENT_MAX - 1)) await provider.delete(old.id).catch(() => undefined);
      return rec;
    },
    /** Where playback is now (and whether it reached the end). */
    async progress(name: string, position: number, atEnd: boolean): Promise<void> {
      const was = (await all()).find((r) => r.id === name);
      if (!was) return;
      await put({ ...was, position: atEnd ? 0 : position, done: was.done || atEnd, at: Date.now() });
    },
  };
}

export const recent = recentStore();
