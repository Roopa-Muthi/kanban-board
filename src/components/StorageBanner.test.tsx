import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { StoreProvider } from "../data/StoreProvider";
import { STORAGE_KEY } from "../data/storage";
import { createStore } from "../data/store";
import { StorageBanner } from "./StorageBanner";

const blocked = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("blocked");
  },
} as unknown as Storage;

// Readable but full: reads work, writes are refused.
const full = {
  getItem: () => null,
  setItem() {
    throw new Error("quota exceeded");
  },
} as unknown as Storage;

function renderBanner(store = createStore()) {
  render(
    <StoreProvider store={store}>
      <StorageBanner />
    </StoreProvider>,
  );
  return store;
}

describe("StorageBanner", () => {
  it("shows nothing when storage works", () => {
    renderBanner();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("warns when the browser blocks storage", () => {
    renderBanner(createStore(blocked));
    expect(screen.getByRole("alert")).toHaveTextContent(/blocking local storage/i);
  });

  it("warns when saving fails", async () => {
    const store = renderBanner(createStore(full));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => {
      store.dispatch({ type: "board/add", id: "b1", name: "X", now: "2026-02-02T00:00:00.000Z" });
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn't save/i);
  });

  it("explains unreadable saved data, and can be dismissed", async () => {
    localStorage.setItem(STORAGE_KEY, "{bad");
    renderBanner();
    expect(screen.getByRole("status")).toHaveTextContent(/couldn't be read/i);

    await userEvent.setup().click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});