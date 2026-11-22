import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";
import { saveData } from "./data/storage";
import { makeBoard, makeCard, makeColumn, makeData } from "./test/dataFactories";

beforeEach(() => {
  window.history.pushState({}, "", "/"); // BrowserRouter reads the real URL
});

describe("App", () => {
  it("shows the sample boards on the first visit", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Your boards", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Product launch" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Weekend project" })).toBeInTheDocument();
    expect(document.title).toBe("Kanban");
  });

  it("opens a board from the list and titles the tab after it", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("link", { name: "Product launch" }));

    expect(screen.getByRole("heading", { name: "Product launch", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Backlog" })).toBeInTheDocument();
    expect(document.title).toBe("Product launch · Kanban");
    expect(window.location.pathname).toMatch(/^\/boards\/.+/);
  });

  it("supports the whole flow: create a board, add a column and a card, see the counts", async () => {
    saveData(makeData([])); // not a first visit, so no sample data
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByRole("textbox", { name: "New board name" }), "Trip");
    await user.click(screen.getByRole("button", { name: "Create board" }));
    await user.click(screen.getByRole("link", { name: "Trip" }));

    await user.click(screen.getByRole("button", { name: /add a column/i }));
    await user.type(screen.getByRole("textbox", { name: "Column title" }), "Ideas{Enter}");

    const ideas = screen.getByRole("region", { name: "Ideas" });
    await user.click(within(ideas).getByRole("button", { name: /add a card/i }));
    await user.type(within(ideas).getByRole("textbox", { name: "Card title" }), "Book flights{Enter}");
    expect(within(ideas).getByText("Book flights")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "← All boards" }));
    expect(screen.getByText("1 column · 1 card")).toBeInTheDocument();
  });

  it("opens a board directly from its URL", () => {
    saveData(
      makeData([
        makeBoard(
          "b1",
          [makeColumn("c1", [makeCard("k1", { title: "Write README" })], "To do")],
          "Roadmap",
        ),
      ]),
    );
    window.history.pushState({}, "", "/boards/b1");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Roadmap", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Write README")).toBeInTheDocument();
  });

  it("says so for a board that doesn't exist", () => {
    saveData(makeData([]));
    window.history.pushState({}, "", "/boards/nope");
    render(<App />);

    expect(screen.getByText("Board not found.")).toBeInTheDocument();
    expect(document.title).toBe("Board not found · Kanban");
  });

  it("sends unknown URLs back to the list", () => {
    saveData(makeData([]));
    window.history.pushState({}, "", "/login");
    render(<App />);

    expect(screen.getByRole("heading", { name: "Your boards", level: 1 })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
  });
});
  it("has a header link that returns to the boards list", async () => {
    saveData(makeData([makeBoard("b1", [], "Roadmap")]));
    window.history.pushState({}, "", "/boards/b1");
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("link", { name: "Kanban" }));

    expect(screen.getByRole("heading", { name: "Your boards", level: 1 })).toBeInTheDocument();
  });