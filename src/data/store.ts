import type { AppData } from "./model";
import { reducer } from "./reducer";
import type { Action } from "./reducer";
import { loadData, saveData } from "./storage";
import type { LoadStatus } from "./storage";

export interface Snapshot {
  data: AppData;
  loadStatus: LoadStatus;
  saveFailed: boolean;
}

export interface StoreOptions {
  // Called once, on the very first visit (nothing stored yet), to provide starter data.
  seed?: () => AppData;
}

// Pass a Storage for tests; leave it out to use the browser's localStorage.
export function createStore(storage?: Storage | null, options: StoreOptions = {}) {
  const initial = loadData(storage);
  let data = initial.data;
  let saveFailed = false;
  if (initial.status === "first-run" && options.seed) {
    data = options.seed();
    saveFailed = !saveData(data, storage); // saving also marks the first visit as done
  }

  let snapshot: Snapshot = { data, loadStatus: initial.status, saveFailed };
  const listeners = new Set<() => void>();

  function publish(next: Snapshot): void {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  return {
    // Must return the same object until something changes (useSyncExternalStore relies on it).
    getSnapshot: (): Snapshot => snapshot,

    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    dispatch: (action: Action): void => {
      const next = reducer(snapshot.data, action);
      if (next === snapshot.data) return; // nothing changed: nothing to save
      publish({ ...snapshot, data: next, saveFailed: !saveData(next, storage) });
    },

    // Called when another tab changed the stored data.
    reload: (): void => {
      const result = loadData(storage);
      if (result.status !== "ok") return; // cleared or broken elsewhere: keep what we have
      publish({ ...snapshot, data: result.data, saveFailed: false });
    },
  };
}

export type Store = ReturnType<typeof createStore>;