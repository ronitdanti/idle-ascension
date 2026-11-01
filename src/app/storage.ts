import { CONFIG } from '../content/config';
import { decodeExport, fromJson, SaveError, toJson } from '../core/save';
import type { GameState } from '../core/state';

const KEY = 'kia.save';
const KEY_BAK = 'kia.save.bak';
const KEY_BAK_AT = 'kia.save.bak.at';
const KEY_CORRUPT = 'kia.save.unreadable';
const IDB_NAME = 'kia';
const IDB_STORE = 'saves';

export type LoadResult =
  | { kind: 'none' }
  | { kind: 'ok'; state: GameState; source: 'main' | 'backup' | 'mirror' }
  | { kind: 'unreadable'; error: SaveError; raw: string }
  | { kind: 'tooNew'; error: SaveError; raw: string };

// ---- IndexedDB mirror: a second copy in a different storage bucket, best effort only ----

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(text: string): Promise<void> {
  try {
    const db = await idb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(text, 'main');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* mirror is optional */
  }
}

async function idbGet(): Promise<string | null> {
  try {
    const db = await idb();
    const value = await new Promise<string | null>((resolve, reject) => {
      const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get('main');
      req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  } catch {
    return null;
  }
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Persistence with a safety rule: if a save exists but cannot be read, writing is blocked
 * until the player makes an explicit choice. We never silently overwrite something we could not load.
 */
export class SaveStore {
  /** When false, save() is a no-op. Set while an unreadable save is waiting for the player's decision. */
  writable = true;
  lastError: string | null = null;

  async load(): Promise<LoadResult> {
    const main = lsGet(KEY);
    const bak = lsGet(KEY_BAK);
    const mirror = main === null && bak === null ? await idbGet() : null;
    if (main === null && bak === null && mirror === null) return { kind: 'none' };

    const attempts: Array<['main' | 'backup' | 'mirror', string | null]> = [
      ['main', main],
      ['backup', bak],
      ['mirror', mirror ?? (main !== null ? await idbGet() : null)],
    ];
    let firstError: SaveError | null = null;
    let firstRaw = '';
    for (const [source, raw] of attempts) {
      if (raw === null) continue;
      try {
        const state = fromJson(raw);
        // Recovered from a copy: keep whatever the main slot held so nothing is destroyed by the next save.
        if (source !== 'main' && main !== null) lsSet(`${KEY_CORRUPT}.${Date.now()}`, main);
        return { kind: 'ok', state, source };
      } catch (e) {
        if (e instanceof SaveError) {
          if (e.code === 'tooNew') return { kind: 'tooNew', error: e, raw };
          if (!firstError) {
            firstError = e;
            firstRaw = raw;
          }
        }
      }
    }
    return { kind: 'unreadable', error: firstError ?? new SaveError('corrupt', 'Save unreadable.'), raw: firstRaw };
  }

  /** Write the current state. Returns false if blocked or storage failed (e.g. quota). */
  save(state: GameState, nowMs = Date.now()): boolean {
    if (!this.writable) return false;
    const text = toJson(state);
    const previous = lsGet(KEY);

    // Rolling backup: keep the last known-good copy, refreshed at most every backupEverySec.
    if (previous !== null) {
      const at = Number(lsGet(KEY_BAK_AT) ?? 0);
      if (nowMs - at >= CONFIG.backupEverySec * 1000 || lsGet(KEY_BAK) === null) {
        try {
          fromJson(previous);
          lsSet(KEY_BAK, previous);
          lsSet(KEY_BAK_AT, String(nowMs));
        } catch {
          /* never promote an unreadable copy to backup */
        }
      }
    }

    const ok = lsSet(KEY, text);
    this.lastError = ok ? null : 'Could not write to browser storage. Export your save to be safe.';
    void idbPut(text);
    return ok;
  }

  /**
   * Replace the stored save with a new state after an explicit, confirmed player action
   * (import, new game after unreadable). The old raw text is preserved under a recovery key first.
   */
  replaceConfirmed(state: GameState): boolean {
    const old = lsGet(KEY);
    if (old !== null) lsSet(`${KEY_CORRUPT}.${Date.now()}`, old);
    this.writable = true;
    return this.save(state);
  }

  /** Hard reset: only ever called after the double confirmation. Keeps a recovery copy. */
  resetConfirmed(fresh: GameState): boolean {
    return this.replaceConfirmed(fresh);
  }

  /** Raw text of what is in storage, for "download what's left". */
  rawMain(): string | null {
    return lsGet(KEY);
  }

  /** Ask the browser not to evict our data under storage pressure. */
  async requestPersistence(): Promise<boolean> {
    try {
      return (await navigator.storage?.persist?.()) ?? false;
    } catch {
      return false;
    }
  }
}

export function parseImport(text: string): GameState {
  return decodeExport(text);
}
