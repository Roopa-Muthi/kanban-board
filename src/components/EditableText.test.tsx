import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EditableText } from "./EditableText";

function setup(headingLevel?: number) {
  const onSave = vi.fn();
  const user = userEvent.setup();
  render(
    <EditableText
      value="Write README"
      maxLength={300}
      editLabel="Edit title"
      headingLevel={headingLevel}
      onSave={onSave}
    />,
  );
  return { user, onSave };
}

const editButton = () => screen.getByRole("button", { name: "Edit title" });
const input = () => screen.getByRole("textbox", { name: "Edit title" });

describe("EditableText", () => {
  it("shows the value and an Edit button", () => {
    setup();
    expect(screen.getByText("Write README")).toBeInTheDocument();
    expect(editButton()).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("saves a trimmed new value, closes and returns focus to Edit", async () => {
    const { user, onSave } = setup();
    await user.click(editButton());
    await user.clear(input());
    await user.type(input(), "  Write the README  ");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith("Write the README");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => expect(editButton()).toHaveFocus());
  });

  it("doesn't call onSave when the value is unchanged", async () => {
    const { user, onSave } = setup();
    await user.click(editButton());
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("doesn't call onSave for a blank value", async () => {
    const { user, onSave } = setup();
    await user.click(editButton());
    await user.clear(input());
    await user.type(input(), "   ");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Write README")).toBeInTheDocument();
  });

  it("cancels on Escape and keeps the old value", async () => {
    const { user, onSave } = setup();
    await user.click(editButton());
    await user.type(input(), " extra");
    await user.keyboard("{Escape}");

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Write README")).toBeInTheDocument();
  });

  it("cancels with the Cancel button", async () => {
    const { user, onSave } = setup();
    await user.click(editButton());
    await user.type(input(), " extra");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Write README")).toBeInTheDocument();
  });

  it("exposes the text as a heading when given a level", () => {
    setup(2);
    expect(screen.getByRole("heading", { name: "Write README", level: 2 })).toBeInTheDocument();
  });
});