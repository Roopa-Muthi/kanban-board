import { useContext, useSyncExternalStore } from "react";
import { StoreContext } from "./context";
import type { Store, Snapshot } from "./store";

function useStoreObject(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore hooks must be used inside <StoreProvider>");
  return store;
}

export function useSnapshot(): Snapshot {
  const store = useStoreObject();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function useDispatch(): Store["dispatch"] {
  return useStoreObject().dispatch;
}