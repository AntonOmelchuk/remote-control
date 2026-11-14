import type { Preferences } from './model.ts';
import { decodePreferences, defaultPreferences, encodePreferences } from './model.ts';

export const preferencesStorageKey = 'remote-control.preferences.v1';

export type PreferencesStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function createPreferencesRepository(storage: PreferencesStorage) {
  let pendingWrite: Promise<unknown> = Promise.resolve();
  return {
    async load(): Promise<{ preferences: Preferences; failed: boolean }> {
      try {
        return {
          preferences: decodePreferences(await storage.getItem(preferencesStorageKey)),
          failed: false,
        };
      } catch {
        return { preferences: defaultPreferences, failed: true };
      }
    },
    save(preferences: Preferences): Promise<unknown> {
      const encoded = encodePreferences(preferences);
      const write = pendingWrite.then(() => storage.setItem(preferencesStorageKey, encoded));
      // A failed request is reported to its caller while subsequent writes remain possible.
      pendingWrite = write.catch(() => undefined);
      return write;
    },
  };
}
