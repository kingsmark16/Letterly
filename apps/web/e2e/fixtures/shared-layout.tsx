import { renderToStaticMarkup } from "react-dom/server";
import { Container } from "@repo/ui/container";
import { Stack } from "@repo/ui/stack";
import * as React from "react";

// tsx uses the classic JSX transform for linked package source in this child process.
Object.assign(globalThis, { React });

process.stdout.write(
  renderToStaticMarkup(
    <>
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
