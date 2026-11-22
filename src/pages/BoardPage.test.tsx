import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
describe("BoardPage keyboard moves", () => {
  const focusHandle = (title: string) =>
    screen.getByRole("button", { name: `Reorder ${title}` }).focus();

  const handleNames = (region: HTMLElement) =>
    within(region)
      .getAllByRole("button", { name: /^Reorder / })
      .map((b) => b.getAttribute("aria-label"));

  const storedTitles = (columnIndex: number) =>
    storedBoard()?.columns[columnIndex]?.cards.map((c) => c.title);

  it("moves a card down within its column and saves it on drop", async () => {
    const { user } = renderBoard();
    focusHandle("Write README");

    await user.keyboard(" ");
    expect(screen.getByText(/Picked up Write README, position 1 of 3 in To do/)).toBeInTheDocument();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByText("Moved to position 2 of 3 in To do.")).toBeInTheDocument();
    expect(storedTitles(0)).toEqual(["Write README", "Add seed command", "Deploy"]); // not saved yet

    await user.keyboard(" ");
    expect(handleNames(column("To do"))).toEqual([
      "Reorder Add seed command",
      "Reorder Write README",
      "Reorder Deploy",
    ]);
    expect(storedTitles(0)).toEqual(["Add seed command", "Write README", "Deploy"]);
  });

  it("moves a card to another column, keeps focus on it, and saves it on drop", async () => {
    const { user } = renderBoard();
    focusHandle("Write README");

    await user.keyboard(" ");
    await user.keyboard("{ArrowRight}");

    const handle = within(column("Done")).getByRole("button", { name: "Reorder Write README" });
    expect(handle).toHaveFocus();
    expect(screen.getByText("Moved to position 1 of 1 in Done.")).toBeInTheDocument();
    expect(within(column("To do")).queryByText("Write README")).not.toBeInTheDocument();

    await user.keyboard(" ");
    expect(storedTitles(0)).toEqual(["Add seed command", "Deploy"]);
    expect(storedTitles(1)).toEqual(["Write README"]);
  });

  it("cancels with Escape and puts everything back", async () => {
    const { user } = renderBoard();
    focusHandle("Write README");
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Escape}");

    expect(handleNames(column("To do"))).toEqual([
      "Reorder Write README",
      "Reorder Add seed command",
      "Reorder Deploy",
    ]);
    expect(screen.getByText("Move cancelled.")).toBeInTheDocument();
    expect(storedTitles(0)).toEqual(["Write README", "Add seed command", "Deploy"]);
  });

  it("says so when a card can't move any further", async () => {
    const { user } = renderBoard();
    focusHandle("Write README");
    await user.keyboard(" ");
    await user.keyboard("{ArrowUp}");
    expect(screen.getByText("Can't move any further up.")).toBeInTheDocument();
  });

  it("changes nothing when the card is dropped where it started", async () => {
    const { user } = renderBoard();
    focusHandle("Write README");
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{ArrowUp}");
    await user.keyboard(" ");

    expect(screen.getByText(/Nothing changed/)).toBeInTheDocument();
    expect(storedTitles(0)).toEqual(["Write README", "Add seed command", "Deploy"]);
  });

  it("cancels the pick-up when the pointer is pressed elsewhere", async () => {
    const { user } = renderBoard();
    focusHandle("Write README");
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");

    fireEvent.pointerDown(document.body);

    expect(screen.getByText("Move cancelled.")).toBeInTheDocument();
    expect(handleNames(column("To do"))[0]).toBe("Reorder Write README");
  });

  it("ignores arrow keys until a card has been picked up", async () => {
    const { user } = renderBoard();
    focusHandle("Write README");
    await user.keyboard("{ArrowDown}");

    expect(handleNames(column("To do"))[0]).toBe("Reorder Write README");
    expect(screen.queryByText(/Moved to/)).not.toBeInTheDocument();
  });

  it("discards a pick-up when the board changes in another tab, without hiding the new card", async () => {
    const { user, store } = renderBoard();
    focusHandle("Write README");
    await user.keyboard(" ");
    await user.keyboard("{ArrowDown}");
    expect(handleNames(column("To do"))[0]).toBe("Reorder Add seed command");

    act(() => {
      // what another tab would have written: the same board plus one more card
      saveData(
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
                  makeCard("k9", { title: "From another tab" }),
                ],
                "To do",
              ),
              makeColumn("c2", [], "Done"),
            ],
            "Roadmap",
          ),
        ]),
      );
      store.reload();
    });

    expect(within(column("To do")).getByText("From another tab")).toBeInTheDocument();
    expect(handleNames(column("To do"))).toEqual([
      "Reorder Write README",
      "Reorder Add seed command",
      "Reorder Deploy",
      "Reorder From another tab",
    ]);
  });
});
describe("BoardPage card details", () => {
  const openDetails = (user: ReturnType<typeof userEvent.setup>, title: string) =>
    user.click(screen.getByRole("button", { name: `Open details for ${title}` }));

  it("opens the details dialog for a card", async () => {
    const { user } = renderBoard();
    await openDetails(user, "Write README");
    const dialog = screen.getByRole("dialog", { name: "Card details" });
    expect(within(dialog).getByLabelText("Title")).toHaveValue("Write README");
  });

  it("saves a description and due date and shows them on the card", async () => {
    const { user } = renderBoard();
    await openDetails(user, "Write README");
    await user.type(screen.getByLabelText("Description"), "Add a screenshot.");
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2998-01-15" } });
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(column("To do")).getByText("Add a screenshot.")).toBeInTheDocument();
    expect(within(column("To do")).getByText(/Due .*2998/)).toBeInTheDocument();
    expect(storedBoard()?.columns[0]?.cards[0]).toMatchObject({
      description: "Add a screenshot.",
      dueDate: "2998-01-15",
    });
  });

  it("closes the dialog if the card is deleted in another tab", async () => {
    const { user, store } = renderBoard();
    await openDetails(user, "Write README");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    act(() => {
      // what another tab would have written: the same board without that card
      saveData(
        makeData([
          makeBoard(
            "b1",
            [
              makeColumn("c1", [makeCard("k2", { title: "Add seed command" })], "To do"),
              makeColumn("c2", [], "Done"),
            ],
            "Roadmap",
          ),
        ]),
      );
      store.reload();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});