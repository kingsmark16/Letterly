import type { Locator, Page, TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { test, expect, type ZoomFixtures } from "./support/browser-zoom";
import { mountSharedPrimitiveFixture } from "./support/shared-primitive-fixture";
import { installOwnerEditorRoutes } from "./support/owner-editor";
import { pageId } from "./fixtures/owner-page";

async function assertZoom(
  page: Page,
  actualZoom: ZoomFixtures["actualZoom"],
  info: TestInfo,
) {
  const metrics = await actualZoom(page);
  expect(metrics.factor).toBe(2);
  expect(metrics.after.width).toBeCloseTo(metrics.before.width / 2, 0);
  expect(metrics.after.dpr).toBe(metrics.before.dpr * 2);
  expect(metrics.before.cssZoom).toBe("1");
  expect(metrics.after.cssZoom).toBe("1");
  await writeFile(
    info.outputPath("actual-browser-zoom.json"),
    JSON.stringify(metrics, null, 2),
  );
  await info.attach("actual-browser-zoom", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
}

async function assertNoHorizontalScroll(page: Page) {
  const size = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(size.scroll).toBeLessThanOrEqual(size.width + 1);
}

async function assertFits(page: Page, control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeVisible();
  const bounds = await control.boundingBox();
  if (!bounds) throw new Error("Missing visible zoom control");
  const width = await page.evaluate(() => document.documentElement.clientWidth);
  expect(bounds.x).toBeGreaterThanOrEqual(-1);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width + 1);
}

test("shared fields and controls remain labeled, focusable, and within the zoomed viewport", async ({
  page,
  actualZoom,
}, info) => {
  await mountSharedPrimitiveFixture(page);
  await assertZoom(page, actualZoom, info);
  const recipient = page.getByLabel("Fixture recipient", { exact: false });
  const message = page.getByLabel("Fixture message", { exact: false });
  await assertFits(page, recipient);
  await recipient.focus();
  await recipient.press("ControlOrMeta+A");
  await recipient.pressSequentially("Zoomed reader");
  await expect(recipient).toHaveValue("Zoomed reader");
  await assertFits(page, message);
  await message.focus();
  await expect(message).toBeFocused();
  await expect(message).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("A message is required", { exact: true }),
  ).toBeVisible();
  await assertFits(
    page,
    page.getByRole("button", { name: "Mark reviewed", exact: true }),
  );
  await assertNoHorizontalScroll(page);
});

test("legal dialog remains scrollable with keyboard closing and trigger focus restoration", async ({
  page,
  actualZoom,
}, info) => {
  await page.goto("/");
  await assertZoom(page, actualZoom, info);
  const trigger = page
    .locator("[data-landing-root] > footer")
    .getByRole("link", { name: "Privacy", exact: true });
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const close = dialog.getByRole("button", { name: "Close Privacy Policy" });
  await assertFits(page, close);
  const bounds = await dialog.boundingBox();
  const viewport = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
  }));
  expect(bounds?.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds?.height).toBeLessThanOrEqual(viewport.height + 1);
  const last = dialog.locator("article > section").last();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await assertNoHorizontalScroll(page);
});

test("catalog preview keeps its controls reachable at actual browser zoom", async ({
  page,
  actualZoom,
}, info) => {
  await page.goto("/templates/confession");
  await assertZoom(page, actualZoom, info);
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Secret Letter", exact: true }),
  });
  const trigger = card.getByRole("link", { name: "Preview", exact: true });
  await assertFits(page, trigger);
  await trigger.focus();
  await trigger.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog
      .getByText("A few things I never want to forget", { exact: true })
      .first(),
  ).toBeVisible();
  await assertFits(page, dialog.getByRole("button", { name: /^Close/ }));
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await assertNoHorizontalScroll(page);
});

test("owner editor retains labeled fields and section navigation at actual zoom", async ({
  page,
  actualZoom,
}, info) => {
  await installOwnerEditorRoutes(page);
  await page.goto(`/dashboard/pages/${pageId}/edit?section=content`);
  await expect(page.getByLabel("Your message")).toBeVisible();
  await assertZoom(page, actualZoom, info);
  const recipient = page.getByLabel("To (required)");
  const message = page.getByLabel("Your message");
  await assertFits(page, recipient);
  await recipient.focus();
  await expect(recipient).toBeFocused();
  await assertFits(page, message);
  await expect(message).toHaveValue("A message worth keeping.");
  await message.focus();
  await expect(message).toBeFocused();
  await assertNoHorizontalScroll(page);
  const navigation = page.getByRole("navigation", {
    name: "Letter editor",
    exact: true,
  });
  const sections = navigation.getByRole("button", {
    name: "Open editor sections",
  });
  await assertFits(page, sections);
  await sections.focus();
  await sections.press("Enter");
  const settings = page.getByRole("menuitem", {
    name: "Settings",
    exact: true,
  });
  await assertFits(page, settings);
  await settings.focus();
  await settings.press("Enter");
  await expect(page).toHaveURL(/section=settings/u);
  await expect(sections).toBeFocused();
});

test("long public letter retains readable page navigation at actual zoom", async ({
  page,
  actualZoom,
}, info) => {
  await page.goto("/p/fixture-letter-paginated");
  await assertZoom(page, actualZoom, info);
  const open = page.getByRole("button", {
    name: "Open your letter",
    exact: true,
  });
  await assertFits(page, open);
  await open.focus();
  await open.press("Enter");
  const next = page.getByRole("button", {
    name: "Next message page",
    exact: true,
  });
  await expect(next).toBeEnabled();
  await assertFits(page, next);
  await next.focus();
  await next.press("Enter");
  const previous = page.getByRole("button", {
    name: "Previous message page",
    exact: true,
  });
  await expect(previous).toBeEnabled();
  await assertFits(page, previous);
  await assertNoHorizontalScroll(page);
});

test("public journey choices and private response remain usable at actual zoom", async ({
  page,
  actualZoom,
}, info) => {
  await page.route("**/p/*/responses", (route) =>
    route.fulfill({ json: { accepted: true } }),
  );
  await page.goto("/p/fixture-heart");
  await assertZoom(page, actualZoom, info);
  for (const name of ["The happy moments", "Share the warm result"]) {
    const choice = page.getByRole("button", { name, exact: true });
    await assertFits(page, choice);
    await choice.focus();
    await choice.press("Enter");
  }
  await expect(
    page.getByRole("heading", { name: "A heart full of warmth", exact: true }),
  ).toBeVisible();
  const note = page.getByRole("textbox", { name: /Private message/ });
  await assertFits(page, note);
  await note.fill("A zoomed private fixture note.");
  const send = page.getByRole("button", {
    name: "Send private response",
    exact: true,
  });
  await assertFits(page, send);
  await send.focus();
  await send.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Thank you for sharing." }),
  ).toBeVisible();
  await assertNoHorizontalScroll(page);
});
