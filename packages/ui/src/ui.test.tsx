import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field } from "./field";
import { IconButton } from "./icon-button";
import { Input } from "./input";
import { Status } from "./status";

describe("shared UI primitives", () => {
  it("keeps a button name while exposing loading semantics", () => {
    render(
      <Button loading loadingLabel="Saving letter">
        Save letter
      </Button>,
    );

    const button = screen.getByRole("button", { name: /save letter/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Saving letter")).toHaveAttribute("role", "status");
  });

  it("wires field descriptions and errors to the control", () => {
    render(
      <Field
        description="Use the name shown on the letter."
        error="A name is required."
        id="recipient"
        label="Recipient"
        required
      >
        <Input />
      </Field>,
    );

    const input = screen.getByLabelText(/Recipient/);
    expect(input).toHaveAttribute("id", "recipient");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain("recipient-");
    expect(screen.getByRole("alert")).toHaveTextContent("A name is required.");
  });

  it("requires an accessible name for icon controls", () => {
    render(<IconButton icon={<svg />} label="Open menu" />);
    expect(
      screen.getByRole("button", { name: "Open menu" }),
    ).toBeInTheDocument();
  });

  it("renders only the caller supplied status recovery action", () => {
    render(
      <Status
        error={<p>Catalog unavailable</p>}
        recovery={<Button variant="secondary">Try again</Button>}
        state="error"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Catalog unavailable");
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  it("opens and closes the native dialog", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <div>
        <button type="button">Open preview</button>
        <Dialog onClose={onClose} open={false} title="Preview">
          <p>Preview content</p>
        </Dialog>
      </div>,
    );

    rerender(
      <div>
        <button type="button">Open preview</button>
        <Dialog onClose={onClose} open title="Preview">
          <p>Preview content</p>
        </Dialog>
      </div>,
    );

    const dialog = screen.getByRole("dialog");
    await waitFor(() => expect(dialog).toHaveAttribute("open"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
