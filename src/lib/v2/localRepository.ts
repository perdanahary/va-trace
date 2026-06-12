import { useSyncExternalStore } from "react";

/**
 * Shared local repository helper for V2 stores.
 *
 * Implements the storage pattern required by
 * docs/implementation/02-state-management-refactor.md (Phase 0):
 * - one versioned localStorage key per aggregate group,
 * - cached snapshot reads for `useSyncExternalStore` stability,
 * - cross-tab and same-tab change notification,
 * - seed fallback so the app runs without persisted data.
 *
 * The repository boundary keeps page components unaware of localStorage so a
 * future API-backed repository can replace it without UI changes.
 */
export interface LocalRepository<T> {
  getSnapshot: () => T;
  useSnapshot: () => T;
  write: (next: T) => void;
  update: (updater: (current: T) => T) => T;
  subscribe: (listener: () => void) => () => void;
}

export function createLocalRepository<T>(options: {
  storageKey: string;
  /** Seed used when no persisted value exists or parsing fails. */
  seed: () => T;
  /** Optional migration applied to parsed persisted values. */
  migrate?: (persisted: unknown) => T;
}): LocalRepository<T> {
  const { storageKey, seed, migrate } = options;
  const changeEvent = `${storageKey}:change`;

  let cachedValue: T | null = null;
  let cachedSerialized: string | null = null;

  function readSnapshot(): T {
    if (typeof window === "undefined") {
      cachedValue ??= seed();
      return cachedValue;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);

      if (!stored) {
        if (cachedSerialized !== null || cachedValue === null) {
          cachedValue = seed();
          cachedSerialized = null;
        }
        return cachedValue;
      }

      if (stored === cachedSerialized && cachedValue !== null) {
        return cachedValue;
      }

      const parsed = JSON.parse(stored) as unknown;
      cachedValue = migrate ? migrate(parsed) : (parsed as T);
      cachedSerialized = stored;
      return cachedValue;
    } catch {
      cachedValue ??= seed();
      return cachedValue;
    }
  }

  function write(next: T) {
    if (typeof window === "undefined") {
      cachedValue = next;
      return;
    }

    const serialized = JSON.stringify(next);
    cachedValue = next;
    cachedSerialized = serialized;
    window.localStorage.setItem(storageKey, serialized);
    window.dispatchEvent(new Event(changeEvent));
  }

  function update(updater: (current: T) => T): T {
    const next = updater(readSnapshot());
    write(next);
    return next;
  }

  function subscribe(listener: () => void) {
    if (typeof window === "undefined") {
      return () => undefined;
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        listener();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(changeEvent, listener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(changeEvent, listener);
    };
  }

  function useSnapshot(): T {
    return useSyncExternalStore(subscribe, readSnapshot, readSnapshot);
  }

  return { getSnapshot: readSnapshot, useSnapshot, write, update, subscribe };
}
