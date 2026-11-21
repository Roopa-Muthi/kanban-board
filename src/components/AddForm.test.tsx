import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddForm } from "./AddForm";

function setup() {
  const onSubmit = vi.fn();
  const user = userEvent.setup();
  render(
    <AddForm
      label="Add a card"
      placeholder="Card title"
      submitLabel="Add card"
      maxLength={300}
      onSubmit={onSubmit}
    />,
  );
  return { user, onSubmit };
}

const openButton = () => screen.getByRole("button", { name: "+ Add a card" });
const input = () => screen.getByRole("textbox", { name: "Card title" });

describe("AddForm", () => {
  it("shows only the button until it's opened", () => {
    setup();
    expect(openButton()).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("submits a trimmed title, clears the field and stays open", async () => {
    const { user, onSubmit } = setup();
    await user.click(openButton());
    await user.type(input(), "  Hello  ");
    await user.click(screen.getByRole("button", { name: "Add card" }));

    expect(onSubmit).toHaveBeenCalledWith("Hello");
    expect(input()).toHaveValue("");
  });

  it("disables the submit button for a blank title", async () => {
    const { user } = setup();
    await user.click(openButton());
    const submit = screen.getByRole("button", { name: "Add card" });
    expect(submit).toBeDisabled();
    await user.type(input(), "   ");
    expect(submit).toBeDisabled();
  });

  it("ignores Enter on a blank title", async () => {
    const { user, onSubmit } = setup();
    await user.click(openButton());
    await user.type(input(), "   {Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes on Escape and returns focus to the button", async () => {
    const { user, onSubmit } = setup();
    await user.click(openButton());
    await user.type(input(), "x");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => expect(openButton()).toHaveFocus());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes on Cancel without submitting, and reopens empty", async () => {
    const { user, onSubmit } = setup();
    await user.click(openButton());
    await user.type(input(), "draft");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(openButton());
    expect(input()).toHaveValue("");
  });
});
