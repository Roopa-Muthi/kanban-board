import { describe, expect, it, vi } from "vitest";
import { makeBoard, makeColumn, makeData } from "../test/dataFactories";
import { STORAGE_KEY, loadData, saveData } from "./storage";
import { createStore } from "./store";

const NOW = "2026-02-02T00:00:00.000Z";

const sample = () => makeData([makeBoard("b1", [makeColumn("c1")])]);

// Storage that refuses everything, like a blocked browser store.
const unreadable = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
} as unknown as Storage;

describe("createStore", () => {
  it("starts empty on the first visit", () => {
    const snapshot = createStore().getSnapshot();
    expect(snapshot.loadStatus).toBe("first-run");
    expect(snapshot.data.boards).toEqual([]);
    expect(snapshot.saveFailed).toBe(false);
  });

  it("starts from data that was already saved", () => {
    saveData(sample());
    const snapshot = createStore().getSnapshot();
    expect(snapshot.loadStatus).toBe("ok");
    expect(snapshot.data).toEqual(sample());
  });

  it("applies actions and saves them", () => {
    const store = createStore();
    store.dispatch({ type: "board/add", id: "b1", name: "Sprint", now: NOW });
    expect(store.getSnapshot().data.boards.map((b) => b.name)).toEqual(["Sprint"]);
    expect(loadData().data.boards.map((b) => b.name)).toEqual(["Sprint"]);
  });

  it("notifies subscribers only when something changed", () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);

    store.dispatch({ type: "board/delete", boardId: "nope" });
    expect(listener).not.toHaveBeenCalled();

    store.dispatch({ type: "board/add", id: "b1", name: "X", now: NOW });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops notifying after unsubscribing", () => {
    const store = createStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.dispatch({ type: "board/add", id: "b1", name: "X", now: NOW });
    expect(listener).not.toHaveBeenCalled();
  });

  it("keeps changes in memory and flags the failure when saving isn't possible", () => {
    const store = createStore(unreadable);
    expect(store.getSnapshot().loadStatus).toBe("unavailable");
    store.dispatch({ type: "board/add", id: "b1", name: "X", now: NOW });
    expect(store.getSnapshot().data.boards).toHaveLength(1);
    expect(store.getSnapshot().saveFailed).toBe(true);
  });

  it("picks up changes written by another tab on reload", () => {
    const store = createStore();
    const listener = vi.fn();
    store.subscribe(listener);

    saveData(sample()); // what another tab would have written
    store.reload();

    expect(store.getSnapshot().data).toEqual(sample());
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignores unreadable data on reload", () => {
    const store = createStore();
    store.dispatch({ type: "board/add", id: "b1", name: "X", now: NOW });
    const listener = vi.fn();
    store.subscribe(listener);

    localStorage.setItem(STORAGE_KEY, "{bad");
    store.reload();

    expect(store.getSnapshot().data.boards).toHaveLength(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("returns the same snapshot object until something changes", () => {
    const store = createStore();
    expect(store.getSnapshot()).toBe(store.getSnapshot());
  });
});