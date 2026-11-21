import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { StoreContext } from "./context";
import { STORAGE_KEY } from "./storage";
import { createStore } from "./store";
import type { Store } from "./store";

interface Props {
  children: ReactNode;
  store?: Store; // tests pass their own
}

export function StoreProvider({ children, store: provided }: Props) {
  const [store] = useState<Store>(() => provided ?? createStore());

  useEffect(() => {
    // Fires only in *other* tabs, when they write to localStorage.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) store.reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [store]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}