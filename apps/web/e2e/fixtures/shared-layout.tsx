import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "@repo/ui/button";
import { Container } from "@repo/ui/container";
import { Stack } from "@repo/ui/stack";
import { Field } from "@repo/ui/field";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";
import { IconButton } from "@repo/ui/icon-button";
import { Status } from "@repo/ui/status";
import { Dialog } from "@repo/ui/dialog";
import * as React from "react";

// tsx uses the classic JSX transform for linked package source in this child process.
Object.assign(globalThis, { React });

process.stdout.write(
  renderToStaticMarkup(
    <>
      <Dialog
        id="shared-dialog-probe"
        onClose={() => {}}
        open={false}
        title="Fixture dialog"
        description="Fixture dialog description"
      >
        <p>Fixture dialog content</p>
      </Dialog>
      <Container id="shared-feedback-probe" size="content">
        <IconButton icon={<svg viewBox="0 0 24 24" />} label="Fixture action" />
        <IconButton icon={<svg />} label="Fixture busy action" loading />
        <Status state="loading" loading={<p>Fixture loading</p>} />
        <Status state="empty" empty={<p>Fixture empty</p>} />
        <Status state="error" error={<p>Fixture error</p>} />
        <Status
          state="error"
          error={<p>Fixture actionable error</p>}
          recovery={<a href="#shared-controls-probe">Fixture recovery</a>}
        />
      </Container>
      <Container id="shared-controls-probe" size="content">
        <Field
          id="shared-recipient"
          label="Fixture recipient"
          description="Shown on the letter"
          required
        >
          <Input defaultValue="Avery" />
        </Field>
        <Field
          id="shared-message"
          label="Fixture message"
          description="A message worth keeping"
          error="A message is required"
        >
          <Textarea characterCount="0 / 2000" />
        </Field>
        <Input aria-label="Loading recipient" loading />
        <Textarea aria-label="Loading message" loading />
        <Input
          aria-label="Caller styled recipient"
          className="px-2 text-small rounded-medium"
        />
      </Container>
      <Container
        as="section"
        id="shared-admin-actions-probe"
        className="flex flex-wrap gap-3"
        aria-label="Administrator actions"
      >
        <Button id="admin-action-primary">Mark reviewed</Button>
        <Button id="admin-action-secondary" variant="secondary">
          Dismiss
        </Button>
        <Button id="admin-action-tertiary" variant="tertiary" size="sm">
          Try again
        </Button>
        <Button id="admin-action-disabled" disabled variant="secondary">
          Restore creator
        </Button>
      </Container>
      <Container as="section" id="shared-layout-probe">
        <Stack
          id="shared-stack-probe"
          direction="horizontal"
          gap={5}
          align="center"
          justify="between"
          wrap
        >
          Layout check
        </Stack>
      </Container>
      <Container id="shared-content-probe" size="content">
        Content check
      </Container>
      <Container id="shared-full-probe" size="full">
        Full check
      </Container>
      {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((gap) => (
        <Stack key={gap} id={`shared-gap-${gap}`} gap={gap}>
          Gap check
        </Stack>
      ))}
    </>,
  ),
);
