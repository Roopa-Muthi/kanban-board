import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadText } from "../data/files";
import type { AppData } from "../data/model";
import { StoreProvider } from "../data/StoreProvider";
import { loadData, parseJson, saveData, serialize } from "../data/storage";
import { createStore } from "../data/store";
import { makeBoard, makeCard, makeColumn, makeData } from "../test/dataFactories";
import { DataTools } from "./DataTools";

vi.mock("../data/files", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../data/files")>();
  return { ...actual, downloadText: vi.fn() };
});

const current = () => makeData([makeBoard("b1", [makeColumn("c1", [makeCard("k1")])], "Roadmap")]);
const other = () =>
  makeData([makeBoard("x1", [], "Imported one"), makeBoard("x2", [], "Imported two")]);

type User = ReturnType<typeof userEvent.setup>;

function renderTools(data: AppData = current()): User {
  saveData(data); // preload the browser store before the app starts
  render(
    <StoreProvider store={createStore()}>
      <DataTools />
    </StoreProvider>,
  );
  return userEvent.setup();
}

const jsonFile = (text: string) => new File([text], "backup.json", { type: "application/json" });
const upload = (user: User, file: File) =>
  user.upload(screen.getByLabelText(/import from file/i), file);
const storedNames = () => loadData().data.boards.map((b) => b.name);

beforeEach(() => {
  vi.mocked(downloadText).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DataTools", () => {
  it("downloads a backup named by date, containing the current data", async () => {
    const user = renderTools();
    await user.click(screen.getByRole("button", { name: "Export backup" }));

    expect(downloadText).toHaveBeenCalledTimes(1);
    const call = vi.mocked(downloadText).mock.calls[0];
    expect(call?.[0]).toMatch(/^kanban-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(parseJson(call?.[1] ?? "")).toEqual(current());
    expect(screen.getByRole("status")).toHaveTextContent("Backup downloaded");
  });

  it("replaces everything with an imported file after confirmation", async () => {
    const user = renderTools();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await upload(user, jsonFile(serialize(other())));

    expect(await screen.findByRole("status")).toHaveTextContent("Imported 2 boards");
    expect(storedNames()).toEqual(["Imported one", "Imported two"]);
  });

  it("keeps the current data when the import is declined", async () => {
    const user = renderTools();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);

    await upload(user, jsonFile(serialize(other())));

    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(storedNames()).toEqual(["Roadmap"]);
  });

  it("rejects a file that isn't JSON, without asking or changing anything", async () => {
    const user = renderTools();
    const confirm = vi.spyOn(window, "confirm");

    await upload(user, jsonFile("garbage"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't a valid Kanban backup/);
    expect(confirm).not.toHaveBeenCalled();
    expect(storedNames()).toEqual(["Roadmap"]);
  });

  it("rejects JSON of the wrong shape", async () => {
    const user = renderTools();
    await upload(user, jsonFile('{"version":1,"boards":"nope"}'));
    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't a valid Kanban backup/);
    expect(storedNames()).toEqual(["Roadmap"]);
  });

  it("rejects a file that is far too large", async () => {
    const user = renderTools();
    const big = jsonFile("{}");
    Object.defineProperty(big, "size", { value: 6 * 1024 * 1024 });

    await upload(user, big);

    expect(await screen.findByRole("alert")).toHaveTextContent(/too large/);
    expect(storedNames()).toEqual(["Roadmap"]);
  });

  it("adds the sample boards on top of the existing ones", async () => {
    const user = renderTools();
    await user.click(screen.getByRole("button", { name: "Add sample boards" }));

    expect(screen.getByRole("status")).toHaveTextContent("Added 2 sample boards");
    expect(storedNames()).toEqual(["Product launch", "Weekend project", "Roadmap"]);
  });

  it("erases everything after confirmation", async () => {
    const user = renderTools();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    await user.click(screen.getByRole("button", { name: "Erase all data" }));

    expect(screen.getByRole("status")).toHaveTextContent("All data erased");
    expect(storedNames()).toEqual([]);
  });

  it("keeps everything when the erase is declined", async () => {
    const user = renderTools();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    await user.click(screen.getByRole("button", { name: "Erase all data" }));

    expect(storedNames()).toEqual(["Roadmap"]);
  });
});