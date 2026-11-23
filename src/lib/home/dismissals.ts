/**
 * What a visitor has dismissed on Home: changelog items for good, Cubby's tip
 * for the day. Per device (localStorage), read through useSyncExternalStore.
 */
const CHANGES_KEY = "cubehub.home.dismissedChanges";
const TIP_KEY = "cubehub.home.tipDismissedOn";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function subscribeDismissals(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Blocked storage: dismissed for this page view only.
  }
  notify();
}

/** A string snapshot (stable between reads) of dismissed changelog ids. */
export function dismissedChangesSnapshot(): string {
  return read(CHANGES_KEY) ?? "[]";
}

export function parseDismissed(raw: string): Set<string> {
  try {
    const v: unknown = JSON.parse(raw);
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

export function dismissChange(id: string): void {
  const ids = parseDismissed(dismissedChangesSnapshot());
  ids.add(id);
  write(CHANGES_KEY, JSON.stringify([...ids]));
}

export function tipDismissedOnSnapshot(): string {
  return read(TIP_KEY) ?? "";
}

export function dismissTipFor(day: string): void {
  write(TIP_KEY, day);
}
