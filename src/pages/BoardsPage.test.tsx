import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppData } from "../data/model";
import { StoreProvider } from "../data/StoreProvider";
import { loadData, saveData } from "../data/storage";
import { createStore } from "../data/store";
import { makeBoard, makeCard, makeColumn, makeData } from "../test/dataFactories";
import { BoardsPage } from "./BoardsPage";

function renderPage(data?: AppData) {
  if (data) saveData(data); // preload the browser store before the app starts
  render(
    <StoreProvider store={createStore()}>
      <MemoryRouter>
        <BoardsPage />
      </MemoryRouter>
    </StoreProvider>,
  );
  return userEvent.setup();
}

const roadmap = () =>
  makeData([
    makeBoard(
      "b1",
      [makeColumn("c1", [makeCard("k1"), makeCard("k2")]), makeColumn("c2", [makeCard("k3")])],
      "Roadmap",
    ),
  ]);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BoardsPage", () => {
  it("explains an empty list", () => {
    renderPage();
    expect(screen.getByText(/any boards yet/i)).toBeInTheDocument();
  });

  it("lists boards as links with their counts", () => {
    renderPage(roadmap());
    expect(screen.getByRole("link", { name: "Roadmap" })).toHaveAttribute("href", "/boards/b1");
    expect(screen.getByText("2 columns · 3 cards")).toBeInTheDocument();
  });

  it("disables Create until there's a name", async () => {
    const user = renderPage();
    const create = screen.getByRole("button", { name: "Create board" });
    expect(create).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: "New board name" }), "Sprint");
    expect(create).toBeEnabled();
  });

  it("creates a board, puts it first, saves it and clears the input", async () => {
    const user = renderPage(roadmap());
    const input = screen.getByRole("textbox", { name: "New board name" });

    await user.type(input, "  Sprint  ");
    await user.click(screen.getByRole("button", { name: "Create board" }));

    expect(screen.getAllByRole("link").map((l) => l.textContent)).toEqual(["Sprint", "Roadmap"]);
    expect(input).toHaveValue("");
    expect(loadData().data.boards.map((b) => b.name)).toEqual(["Sprint", "Roadmap"]);
  });

  it("deletes a board after confirmation", async () => {
    const user = renderPage(roadmap());
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "Delete board Roadmap" }));

    await waitFor(() => expect(screen.queryByRole("link", { name: "Roadmap" })).not.toBeInTheDocument());
    expect(loadData().data.boards).toEqual([]);
  });

  it("keeps the board when the confirmation is cancelled", async () => {
    const user = renderPage(roadmap());
    vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(screen.getByRole("button", { name: "Delete board Roadmap" }));

    expect(screen.getByRole("link", { name: "Roadmap" })).toBeInTheDocument();
    expect(loadData().data.boards).toHaveLength(1);
  });

  it("uses singular words for a count of one", () => {
    renderPage(makeData([makeBoard("b1", [makeColumn("c1", [makeCard("k1")])], "Tiny")]));
    expect(screen.getByText("1 column · 1 card")).toBeInTheDocument();
  });
});