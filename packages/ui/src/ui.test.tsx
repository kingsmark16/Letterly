import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useRef, useState } from "react";
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
  it("forwards input refs and keeps validation/loading flags independent", () => {
    const ref = createRef<HTMLInputElement>();
    const { rerender } = render(
      <Input
        ref={ref}
        aria-label="Recipient"
        invalid
        loading
        defaultValue="Avery"
      />,
    );
    const input = screen.getByRole("textbox", { name: "Recipient" });
    expect(ref.current).toBe(input);
    expect(input).toHaveValue("Avery");
    expect(input).toHaveAttribute("data-invalid", "true");
    expect(input).toHaveAttribute("aria-busy", "true");
    expect(input).toBeDisabled();
    rerender(<Input ref={ref} aria-label="Recipient" disabled />);
    expect(input).toBeDisabled();
    expect(input).not.toHaveAttribute("aria-busy");
    expect(input).not.toHaveAttribute("data-invalid");
  });

  it("preserves textarea refs, native values, and count placement", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(
      <Textarea
        ref={ref}
        aria-label="Message"
        defaultValue="Dear Avery"
        characterCount="10 / 2000"
        invalid
        className="min-h-11 px-2 rounded-medium"
      />,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });
    expect(ref.current).toBe(textarea);
    expect(textarea).toHaveValue("Dear Avery");
    expect(textarea).toHaveClass("min-h-11", "px-2", "rounded-medium");
    expect(textarea).not.toHaveClass(
      "min-h-target",
      "min-h-[var(--letterly-textarea-min-height)]",
      "px-4",
      "rounded-small",
    );
    expect(textarea.nextElementSibling).toHaveTextContent("10 / 2000");
    expect(textarea).toHaveAttribute("data-invalid", "true");
  });

  it("keeps field relations stable when errors clear", () => {
    const { rerender } = render(
      <Field
        id="recipient"
        label="Recipient"
        description="Shown on the letter"
        error="Required"
        required
        className="gap-4"
      >
        <Input />
      </Field>,
    );
    const input = screen.getByRole("textbox", { name: "Recipient" });
    const errorId = screen.getByRole("alert").id;
    expect(input).toHaveAttribute("aria-describedby", errorId);
    expect(input.closest("div")).toHaveClass("gap-4");
    rerender(
      <Field
        id="recipient"
        label="Recipient"
        description="Shown on the letter"
        required
        className="gap-4"
      >
        <Input />
      </Field>,
    );
    expect(input).toHaveAttribute(
      "aria-describedby",
      screen.getByText("Shown on the letter").id,
    );
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("merges link typography while retaining blank target protections", () => {
    render(
      <Link
        href="/preview"
        className="text-wine underline"
        rel="nofollow noopener"
        target="_blank"
      >
        Preview
      </Link>,
    );
    const link = screen.getByRole("link", { name: "Preview" });
    expect(link).toHaveClass("text-wine", "underline");
    expect(link).not.toHaveClass("text-inherit", "no-underline");
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow");
  });

  it("preserves container semantic elements and caller width overrides", () => {
    render(
      <Container as="article" size="content" className="max-w-none px-3">
        Letter
      </Container>,
    );
    const container = screen.getByRole("article");
    expect(container).toHaveAttribute("data-size", "content");
    expect(container).toHaveClass(
      "max-w-none",
      "px-3",
      "tablet:px-6",
      "desktop:px-7",
    );
    expect(container).not.toHaveClass(
      "max-w-[var(--letterly-content-max)]",
      "px-5",
    );
  });

  it("keeps stack direction, alignment, wrap, and caller styles composable", () => {
    render(
      <Stack
        direction="horizontal"
        align="center"
        justify="between"
        gap={5}
        wrap
        className="gap-2 items-end"
        style={{ color: "red" }}
      >
        Stack content
      </Stack>,
    );
    const stack = screen.getByText("Stack content");
    expect(stack).toHaveClass(
      "flex-row",
      "items-end",
      "justify-between",
      "flex-wrap",
      "gap-2",
    );
    expect(stack).not.toHaveClass("items-center", "gap-5");
    expect(stack).toHaveAttribute("data-gap", "5");
    expect(stack).toHaveStyle({ color: "rgb(255, 0, 0)" });
  });

  it("forwards button refs and activation without a wrapper element", () => {
    const ref = createRef<HTMLButtonElement>();
    const activate = vi.fn();
    render(
      <Button ref={ref} onClick={activate} variant="ghost" size="sm">
        Edit
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Edit" });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute("data-variant", "ghost");
    expect(button).toHaveAttribute("data-size", "sm");
    fireEvent.click(button);
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("honors button caller utilities without losing semantic typography", () => {
    render(
      <Button className="px-3 text-wine rounded-full feature_button">
        Save
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass(
      "px-3",
      "text-wine",
      "text-small",
      "rounded-full",
      "feature_button",
    );
    expect(button).not.toHaveClass("px-5", "text-surface", "rounded-medium");
  });

  it("keeps disabled and loading states distinct", () => {
    const { rerender } = render(<Button disabled>Save</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.queryByRole("status")).toBeNull();
    rerender(
      <Button loading loadingLabel="Saving">
        Save
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Save");
    expect(screen.getByRole("status").previousElementSibling).toBe(
      screen.getByRole("button"),
    );
    rerender(<Button>Save</Button>);
    expect(screen.getByRole("button")).not.toBeDisabled();
    expect(screen.getByRole("button")).not.toHaveAttribute("aria-busy");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("preserves card semantics and allows caller layout utilities", () => {
    const { rerender } = render(
      <Card className="p-2 border-0 rounded-large" state={<span>Ready</span>}>
        Letter
      </Card>,
    );
    const card = screen.getByRole("article");
    expect(card).toHaveClass("p-2", "border-0", "rounded-large");
    expect(card).not.toHaveClass("p-5", "border", "rounded-medium");
    expect(screen.getByText("Ready")).toBeVisible();
    rerender(
      <Card as="section" aria-label="Preview">
        Letter
      </Card>,
    );
    expect(screen.getByRole("region", { name: "Preview" })).toBeInTheDocument();
    expect(screen.queryByRole("article")).toBeNull();
  });

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

    expect(
      screen.getByRole("link", { name: "Visit Letterly" }),
    ).toHaveAttribute("rel", "noopener noreferrer nofollow");
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
        <Stack aria-label="Preview stack" direction="horizontal" gap={3} wrap>
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
    expect(
      screen.getByRole("status").querySelector("[aria-hidden='true']"),
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
