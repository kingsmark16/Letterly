import assert from "node:assert/strict";
import { test } from "node:test";
import {
  messagePagesMatch,
  paginateMessage,
  paginateMessageToFit,
} from "./message-pagination";

function createMeasureElement(
  measure: (text: string) => number = (text) => text.length,
) {
  let textContent = "";

  return {
    get textContent() {
      return textContent;
    },
    set textContent(value: string | null) {
      textContent = value ?? "";
    },
    getBoundingClientRect() {
      return { height: measure(textContent) };
    },
  };
}

test("paginateMessage trims outer whitespace and preserves empty messages", () => {
  assert.deepEqual(paginateMessage("  a short message  "), ["a short message"]);
  assert.deepEqual(paginateMessage(" \n\t "), [""]);
});

test("paginateMessage breaks long text at spaces within the page limit", () => {
  const firstPart = "a".repeat(630);
  const secondPart = "b".repeat(20);
  const pages = paginateMessage(`  ${firstPart} ${secondPart}  `);

  assert.deepEqual(pages, [firstPart, secondPart]);
  assert.ok(pages.every((page) => page.length <= 640));
});

test("paginateMessage bounds a long word while preserving all characters", () => {
  const message = "x".repeat(650);
  const pages = paginateMessage(message);

  assert.deepEqual(
    pages.map((page) => page.length),
    [640, 10],
  );
  assert.equal(pages.join(""), message);
});

test("paginateMessageToFit uses measured boundaries and clears its measurement text", () => {
  const measureElement = createMeasureElement();

  assert.deepEqual(paginateMessageToFit("one two", measureElement, 5), [
    "one",
    "two",
  ]);
  assert.equal(measureElement.textContent, "");
});

test("paginateMessageToFit makes progress when less than one character fits", () => {
  const measureElement = createMeasureElement(() => 2);

  assert.deepEqual(paginateMessageToFit("abc", measureElement, 1), [
    "a",
    "b",
    "c",
  ]);
  assert.equal(measureElement.textContent, "");
});

test("paginateMessageToFit falls back to bounded pages without a measurable height", () => {
  const measureElement = createMeasureElement(() => {
    throw new Error("The fallback should not measure text");
  });
  const message = "x".repeat(650);

  assert.deepEqual(
    paginateMessageToFit(message, measureElement, 0).map((page) => page.length),
    [640, 10],
  );
  assert.equal(measureElement.textContent, "");
});

test("messagePagesMatch compares page content and order", () => {
  assert.equal(messagePagesMatch(["one", "two"], ["one", "two"]), true);
  assert.equal(messagePagesMatch(["one", "two"], ["two", "one"]), false);
  assert.equal(messagePagesMatch(["one"], ["one", "two"]), false);
});
