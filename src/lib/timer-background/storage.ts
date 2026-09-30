/**
 * Device-local persistence for the timer background. Client-only.
 *
 * - The image lives in IndexedDB: blobs are too big for localStorage.
 * - The display options live in localStorage.
 *
 * Every call tolerates a missing or blocked store (private windows, cleared
 * site data) by acting as if nothing is saved.
 */
import { sanitizeOptions, type BackgroundOptions } from "./options";
import type { LuminanceRange } from "./scrim";

export interface StoredBackground {
  blob: Blob;
  range: LuminanceRange;
  width: number;
  height: number;
  savedAt: number;
}

const DB_NAME = "cubehub";
const STORE = "timer-background";
const KEY = "image";
const OPTIONS_KEY = "cubehub-timer-bg-options";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = op(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadBackground(): Promise<StoredBackground | null> {
  try {
    const value = await run("readonly", (s) => s.get(KEY));
    return (value as StoredBackground | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Throws if the browser refuses (e.g. storage quota); the caller reports it. */
export async function saveBackground(value: StoredBackground): Promise<void> {
  await run("readwrite", (s) => s.put(value, KEY));
}

export async function clearBackground(): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(KEY));
  } catch {
    // Nothing stored or store unavailable — either way, nothing to clear.
  }
}

export function loadOptions(): BackgroundOptions {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    return sanitizeOptions(raw ? JSON.parse(raw) : null);
  } catch {
    return sanitizeOptions(null);
  }
}

export function saveOptions(options: BackgroundOptions): void {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
  } catch {
    // Storage blocked: the options still apply for this visit.
  }
}
