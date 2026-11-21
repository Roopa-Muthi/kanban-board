import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppData } from "../data/model";
import { StoreProvider } from "../data/StoreProvider";
import { loadData, saveData } from "../data/storage";
import { createStore } from "../data/store";
import { makeBoard, makeCard, makeColumn, makeData } from "../test/dataFactories";
import { BoardPage } from "./BoardPage";

const sampleData = () =>
  makeData([
    makeBoard(
      "b1",
      [
        makeColumn(
          "c1",
          [
            makeCard("k1", { title: "Write README" }),
            makeCard("k2", { title: "Add seed command", dueDate: "2000-01-01" }),
            makeCard("k3", { title: "Deploy", dueDate: "2999-12-31" }),
          ],
          "To do",
        ),
        makeColumn("c2", [], "Done"),
      ],
      "Roadmap",
    ),
  ]);

function renderBoard(data: AppData = sampleData(), path = "/boards/b1") {
  saveData(data); // preload the browser store before the app starts
  const store = createStore();
  render(
    <StoreProvider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<p>Boards home</p>} />
          <Route path="/boards/:boardId" element={<BoardPage />} />
        </Routes>
      </MemoryRouter>
    </StoreProvider>,
  );
  return { user: userEvent.setup(), store };
}

const column = (name: string) => screen.getByRole("region", { name });
const storedBoard = () => loadData().data.boards.find((b) => b.id === "b1");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BoardPage rendering", () => {
  it("shows the board name, columns, cards and counts", () => {
    renderBoard();
    expect(screen.getByRole("heading", { name: "Roadmap", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "To do", level: 2 })).toBeInTheDocument();
    const todo = column("To do");
    expect(within(todo).getByText("Write README")).toBeInTheDocument();
    expect(within(todo).getByText("3")).toBeInTheDocument();
    expect(within(column("Done")).getByText("No cards yet")).toBeInTheDocument();
  });

  it("flags only overdue cards", () => {
    renderBoard();
    expect(screen.getAllByText(/overdue/)).toHaveLength(1);
  });

  it("explains a board with no columns", () => {
    renderBoard(makeData([makeBoard("b1", [], "Empty")]));
    expect(screen.getByText(/no columns yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add a column/i })).toBeInTheDocument();
  });

  it("says so when the board doesn't exist", () => {
    renderBoard(sampleData(), "/boards/nope");
    expect(screen.getByText("Board not found.")).toBeInTheDocument();
  });
});

describe("BoardPage cards", () => {
  it("adds a card at the bottom of its column and saves it", async () => {
    const { user } = renderBoard();
    const todo = column("To do");

    await user.click(within(todo).getByRole("button", { name: /add a card/i }));
    await user.type(within(todo).getByRole("textbox", { name: "Card title" }), "  Brand new card  ");
    await user.click(within(todo).getByRole("button", { name: "Add card" }));

    const items = within(todo).getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[3]).toHaveTextContent("Brand new card");
    expect(storedBoard()?.columns[0]?.cards.map((c) => c.title)).toEqual([
      "Write README",
      "Add seed command",
      "Deploy",
      "Brand new card",
    ]);
  });

  it("keeps the form open so several cards can be added in a row", async () => {
    const { user } = renderBoard();
    const todo = column("To do");

    await user.click(within(todo).getByRole("button", { name: /add a card/i }));
    const input = within(todo).getByRole("textbox", { name: "Card title" });
    await user.type(input, "One{Enter}");
    await user.type(input, "Two{Enter}");

    expect(within(todo).getByText("One")).toBeInTheDocument();
    expect(within(todo).getByText("Two")).toBeInTheDocument();
    expect(within(todo).getAllByRole("listitem")).toHaveLength(5);
  });

  it("renames a card and saves it", async () => {
    const { user } = renderBoard();
    await user.click(screen.getByRole("button", { name: "Edit title of Write README" }));
    const input = screen.getByRole("textbox", { name: "Edit title of Write README" });
    await user.clear(input);
    await user.type(input, "Write the README");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Write the README")).toBeInTheDocument();
    expect(storedBoard()?.columns[0]?.cards[0]?.title).toBe("Write the README");
  });

  it("deletes a card after confirmation", async () => {
    const { user } = renderBoard();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "Delete Write README" }));

    await waitFor(() => expect(screen.queryByText("Write README")).not.toBeInTheDocument());
    expect(storedBoard()?.columns[0]?.cards).toHaveLength(2);
  });

  it("keeps the card when the confirmation is cancelled", async () => {
    const { user } = renderBoard();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(screen.getByRole("button", { name: "Delete Write README" }));

    expect(screen.getByText("Write README")).toBeInTheDocument();
    expect(storedBoard()?.columns[0]?.cards).toHaveLength(3);
  });
});

describe("BoardPage columns", () => {
  it("adds a column and saves it", async () => {
    const { user } = renderBoard();
    await user.click(screen.getByRole("button", { name: /add a column/i }));
    await user.type(screen.getByRole("textbox", { name: "Column title" }), "Review");
    await user.click(screen.getByRole("button", { name: "Add column" }));

    expect(screen.getByRole("region", { name: "Review" })).toBeInTheDocument();
    expect(storedBoard()?.columns.map((c) => c.title)).toEqual(["To do", "Done", "Review"]);
  });

  it("renames a column", async () => {
    const { user } = renderBoard();
    await user.click(screen.getByRole("button", { name: "Edit name of column To do" }));
    const input = screen.getByRole("textbox", { name: "Edit name of column To do" });
    await user.clear(input);
    await user.type(input, "Doing");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("heading", { name: "Doing", level: 2 })).toBeInTheDocument();
    expect(storedBoard()?.columns[0]?.title).toBe("Doing");
  });

  it("asks before deleting a column, mentioning how many cards go with it", async () => {
    const { user } = renderBoard();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(screen.getByRole("button", { name: "Delete column To do" }));
    expect(confirm).toHaveBeenLastCalledWith('Delete "To do" and its 3 cards?');
    await user.click(screen.getByRole("button", { name: "Delete column Done" }));
    expect(confirm).toHaveBeenLastCalledWith('Delete "Done"?');

    expect(screen.getByRole("region", { name: "To do" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Done" })).toBeInTheDocument();
  });

  it("deletes a column and its cards when confirmed", async () => {
    const { user } = renderBoard();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "Delete column To do" }));

    expect(screen.queryByRole("region", { name: "To do" })).not.toBeInTheDocument();
    expect(screen.queryByText("Write README")).not.toBeInTheDocument();
    expect(storedBoard()?.columns.map((c) => c.id)).toEqual(["c2"]);
  });
});

describe("BoardPage board", () => {
  it("renames the board", async () => {
    const { user } = renderBoard();
    await user.click(screen.getByRole("button", { name: "Edit name of board Roadmap" }));
    const input = screen.getByRole("textbox", { name: "Edit name of board Roadmap" });
    await user.clear(input);
    await user.type(input, "Sprint");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("heading", { name: "Sprint", level: 1 })).toBeInTheDocument();
    expect(storedBoard()?.name).toBe("Sprint");
  });

  it("shows 'not found' when the board is deleted in another tab", () => {
    const { store } = renderBoard();
    expect(screen.getByRole("heading", { name: "Roadmap", level: 1 })).toBeInTheDocument();

    act(() => {
      saveData(makeData([])); // what the other tab would have written
      store.reload();
    });

    expect(screen.getByText("Board not found.")).toBeInTheDocument();
  });
});