import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { StoreProvider } from "../data/StoreProvider";
import { saveData } from "../data/storage";
import { createStore } from "../data/store";
import { makeBoard, makeCard, makeColumn, makeData } from "../test/dataFactories";
import { BoardPage } from "./BoardPage";

function renderAt(path: string) {
  render(
    <StoreProvider store={createStore()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/boards/:boardId" element={<BoardPage />} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
}

describe("BoardPage", () => {
  it("shows the board's name and counts", () => {
    saveData(
      makeData([
        makeBoard(
          "b1",
          [makeColumn("c1", [makeCard("k1"), makeCard("k2")]), makeColumn("c2")],
          "Roadmap",
        ),
      ]),
    );
    renderAt("/boards/b1");
    expect(screen.getByRole("heading", { name: "Roadmap", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Columns: 2, cards: 2/)).toBeInTheDocument();
  });

  it("says so when the board doesn't exist", () => {
    renderAt("/boards/nope");
    expect(screen.getByText("Board not found.")).toBeInTheDocument();
  });
});