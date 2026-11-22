import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Card } from "../data/model";
import { makeCard } from "../test/dataFactories";
import { CardModal } from "./CardModal";

const baseCard = makeCard("k1", {
  title: "Write README",
  description: "Screenshot and link.",
  dueDate: "2026-12-01",
});

function setup(overrides: Partial<Card> = {}) {
  const user = userEvent.setup();
  const onSave = vi.fn();
  const onClose = vi.fn();
  const ui = (card: Card) => <CardModal card={card} onSave={onSave} onClose={onClose} />;
  const view = render(ui({ ...baseCard, ...overrides }));
  return { user, onSave, onClose, ui, rerender: view.rerender };
}

const saveButton = () => screen.getByRole("button", { name: "Save" });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CardModal", () => {
  it("shows the card's current values", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Card details" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Write README");
    expect(screen.getByLabelText("Description")).toHaveValue("Screenshot and link.");
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-12-01");
  });

  it("keeps Save disabled until something changes", async () => {
    const { user } = setup();
    expect(saveButton()).toBeDisabled();
    await user.type(screen.getByLabelText("Description"), " More.");
    expect(saveButton()).toBeEnabled();
  });

  it("sends only the fields that changed, then closes", async () => {
    const { user, onSave, onClose } = setup();
    const description = screen.getByLabelText("Description");
    await user.clear(description);
    await user.type(description, "New text");
    await user.click(saveButton());

    expect(onSave).toHaveBeenCalledWith({ description: "New text" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("trims a changed title", async () => {
    const { user, onSave } = setup();
    const title = screen.getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "  New title  ");
    await user.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({ title: "New title" });
  });

  it("won't save a blank title", async () => {
    const { user } = setup();
    await user.clear(screen.getByLabelText("Title"));
    expect(saveButton()).toBeDisabled();
  });

  it("changes the due date", async () => {
    const { user, onSave } = setup();
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2027-01-15" } });
    await user.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({ dueDate: "2027-01-15" });
  });

  it("clears the due date", async () => {
    const { user, onSave } = setup();
    await user.click(screen.getByRole("button", { name: "Clear due date" }));
    await user.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({ dueDate: null });
  });

  it("closes on Cancel without asking when nothing changed", async () => {
    const { user, onClose } = setup();
    const confirm = vi.spyOn(window, "confirm");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when discarding changes is declined", async () => {
    const { user, onClose } = setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await user.type(screen.getByLabelText("Description"), " more");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(confirm).toHaveBeenCalledWith("Discard your changes?");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes when discarding changes is confirmed", async () => {
    const { user, onClose } = setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await user.type(screen.getByLabelText("Description"), " more");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked", async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("still saves only the user's own changes if the card changes elsewhere meanwhile", async () => {
    const { user, onSave, ui, rerender } = setup();
    await user.type(screen.getByLabelText("Description"), " More");
    rerender(ui({ ...baseCard, title: "Changed elsewhere" }));
    await user.click(saveButton());
    expect(onSave).toHaveBeenCalledWith({ description: "Screenshot and link. More" });
  });
});