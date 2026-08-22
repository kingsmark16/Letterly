import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { Field } from "./field";
import { IconButton } from "./icon-button";
import { Input } from "./input";
import { Link } from "./link";
import { Card } from "./card";
import { Container } from "./container";
import { Stack } from "./stack";
import { Status } from "./status";
import { Textarea } from "./textarea";

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

  it("announces a useful default when loading has no label", () => {
    render(<Button loading>Save letter</Button>);

    expect(screen.getByRole("status")).toHaveTextContent("Loading");
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

  it("keeps a caller supplied control id connected to its field label", () => {
    render(
      <Field id="recipient" label="Recipient">
        <Input id="custom-recipient" />
      </Field>,
    );

    expect(screen.getByLabelText("Recipient")).toHaveAttribute(
      "id",
      "custom-recipient",
    );
  });

  it("prioritizes field errors while preserving caller descriptions", () => {
    render(
      <Field
        description="Use the name shown on the letter."
        error="A name is required."
        id="recipient"
        label="Recipient"
      >
        <Input aria-describedby="recipient-format" aria-required />
      </Field>,
    );

    const input = screen.getByLabelText("Recipient");
    const describedBy = input.getAttribute("aria-describedby") ?? "";

    expect(describedBy).toContain("recipient-");
    expect(describedBy).toContain("recipient-format");
    expect(describedBy).not.toContain("description");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(screen.getByText("Use the name shown on the letter.")).toBeVisible();
  });

  it("preserves required rel protections for blank target links", () => {
    render(
      <Link href="https://letterly.example" rel="nofollow" target="_blank">
        Visit Letterly
      </Link>,
    );

    expect(screen.getByRole("link", { name: "Visit Letterly" })).toHaveAttribute(
      "rel",
      "noopener noreferrer nofollow",
    );
  });

  it("requires an accessible name for icon controls", () => {
    render(<IconButton icon={<svg />} label="Open menu" />);
    expect(
      screen.getByRole("button", { name: "Open menu" }),
    ).toBeInTheDocument();
  });

  it("keeps input and textarea loading states unavailable to activation", () => {
    render(
      <>
        <Input aria-label="Recipient" loading />
        <Textarea aria-label="Message" characterCount="0 / 2000" loading />
      </>,
    );

    expect(screen.getByRole("textbox", { name: "Recipient" })).toBeDisabled();
    expect(screen.getByRole("textbox", { name: "Recipient" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "Message" })).toBeDisabled();
    expect(screen.getByText("0 / 2000")).toBeVisible();
  });

  it("renders the shared layout primitives with their typed options", () => {
    render(
      <Container as="main" size="content">
        <Stack
          aria-label="Preview stack"
          direction="horizontal"
          gap={3}
          wrap
        >
          <Card
            aria-label="Preview card"
            as="section"
            state={<span>Needs attention</span>}
          >
            Letterly
          </Card>
        </Stack>
      </Container>,
    );

    expect(screen.getByRole("main")).toHaveAttribute("data-size", "content");
    const stack = screen.getByText("Letterly").closest("[data-direction]");
    expect(stack).not.toBeNull();
    expect(stack).toHaveAttribute("data-direction", "horizontal");
    expect(stack).toHaveAttribute("data-gap", "3");
    expect(stack).toHaveAttribute("data-wrap", "true");
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
  });

  it("renders each status slot with the correct announcement", () => {
    const { rerender } = render(
      <Status loading={<p>Loading templates</p>} state="loading" />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Loading templates");

    rerender(<Status empty={<p>No templates</p>} state="empty" />);
    expect(screen.getByRole("status")).toHaveTextContent("No templates");

    rerender(
      <Status
        error={<p>Catalog unavailable</p>}
        recovery={<Link href="/">Try again</Link>}
        state="error"
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Catalog unavailable");
    expect(screen.getByRole("link", { name: "Try again" })).toBeInTheDocument();
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

  it("keeps a non actionable error polite while retaining a state cue", () => {
    render(<Status error={<p>Catalog unavailable</p>} state="error" />);

    expect(screen.getByRole("status")).toHaveTextContent("Catalog unavailable");
    expect(screen.getByRole("status").querySelector("[aria-hidden='true']"))
      .toBeInTheDocument();
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

  it("restores scroll and focus to the trigger after closing", async () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 384,
    });
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });

    function DialogHarness(): React.JSX.Element {
      const triggerRef = useRef<HTMLButtonElement>(null);
      const [open, setOpen] = useState(false);

      return (
        <>
          <button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
            Open preview
          </button>
          <Dialog
            onClose={() => setOpen(false)}
            open={open}
            title="Preview"
            triggerRef={triggerRef}
          >
            <p>Preview content</p>
          </Dialog>
        </>
      );
    }

    render(<DialogHarness />);
    const trigger = screen.getByRole("button", { name: "Open preview" });

    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveAttribute("open"));

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 384, behavior: "auto" });
    expect(trigger).toHaveFocus();
  });

  it("closes from the native cancel event and only closes from the overlay when enabled", async () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Dialog
        closeOnOverlayClick={false}
        onClose={onClose}
        open
        title="Preview"
      >
        <p>Preview content</p>
      </Dialog>,
    );

    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveAttribute("open"));

    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();

    fireEvent(
      dialog,
      new Event("cancel", { bubbles: false, cancelable: true }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Dialog
        closeOnOverlayClick
        onClose={onClose}
        open={false}
        title="Preview"
      >
        <p>Preview content</p>
      </Dialog>,
    );
    rerender(
      <Dialog closeOnOverlayClick onClose={onClose} open title="Preview">
        <p>Preview content</p>
      </Dialog>,
    );

    const reopenedDialog = screen.getByRole("dialog", { hidden: true });
    await waitFor(() => expect(reopenedDialog).toHaveAttribute("open"));
    fireEvent.click(reopenedDialog);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
