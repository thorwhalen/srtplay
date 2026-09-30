/**
 * Where settings persist. The seam is a zodal `DataProvider`: the default is the
 * browser's localStorage (settings are per browser), and any other provider
 * (IndexedDB, an HTTP backend for cross-device sync) can be passed instead.
 */
import type { DataProvider } from '@zodal/store';
import { createLocalStorageProvider } from '@zodal/store-localstorage';
import { coerceSettings, type Settings } from './schema';

type Row = Settings & { id: string };

const ROW_ID = 'settings';
export const STORAGE_KEY = 'srtplay:settings';

export interface SettingsStorage {
  load(): Promise<Settings>;
  save(settings: Settings): Promise<void>;
}

export function settingsStorage(
  provider: DataProvider<Row> = createLocalStorageProvider<Row>({ storageKey: STORAGE_KEY }),
): SettingsStorage {
  return {
    async load() {
      try {
        return coerceSettings(await provider.getOne(ROW_ID));
      } catch {
        return coerceSettings({}); // nothing saved yet, or storage is blocked
      }
    },
    async save(settings) {
      const row = { ...settings, id: ROW_ID };
      try {
        if (provider.upsert) await provider.upsert(row);
        else await provider.update(ROW_ID, row).catch(() => provider.create(row));
      } catch {
        // Private mode / quota: settings still apply for this visit.
      }
    },
  };
}
