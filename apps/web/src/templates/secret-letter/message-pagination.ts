const MESSAGE_PAGE_CHARACTER_LIMIT = 640;
const WHITESPACE_PATTERN = /\s/;
const MESSAGE_MEASUREMENT_EPSILON = 0.5;

type TextMeasureElement = {
  textContent: string | null;
  getBoundingClientRect: () => { height: number };
};

export function paginateMessage(message: string): string[] {
  let remainingMessage = message.trim();
  if (!remainingMessage) return [""];

  const pages: string[] = [];

  while (remainingMessage.length > MESSAGE_PAGE_CHARACTER_LIMIT) {
    let breakAt = MESSAGE_PAGE_CHARACTER_LIMIT;
    for (let index = MESSAGE_PAGE_CHARACTER_LIMIT; index > 0; index -= 1) {
      if (WHITESPACE_PATTERN.test(remainingMessage[index] ?? "")) {
        breakAt = index;
        break;
      }
    }

    pages.push(remainingMessage.slice(0, breakAt).trimEnd());
    remainingMessage = remainingMessage.slice(breakAt).trimStart();
  }

  if (remainingMessage) pages.push(remainingMessage);
  return pages;
}

export function paginateMessageToFit(
  message: string,
  measureElement: TextMeasureElement,
  availableHeight: number,
): string[] {
  let remainingMessage = message.trim();
  if (!remainingMessage || availableHeight <= 0) {
    return paginateMessage(message);
  }

  const pages: string[] = [];

  const fits = (candidate: string): boolean => {
    measureElement.textContent = candidate;
    return (
      measureElement.getBoundingClientRect().height <=
      availableHeight + MESSAGE_MEASUREMENT_EPSILON
    );
  };

  try {
    while (remainingMessage) {
      if (fits(remainingMessage)) {
        pages.push(remainingMessage);
        break;
      }

      let low = 1;
      let high = remainingMessage.length;
      let bestFitLength = 0;

      while (low <= high) {
        const midpoint = Math.ceil((low + high) / 2);
        const candidate = remainingMessage.slice(0, midpoint).trimEnd();

        if (candidate && fits(candidate)) {
          bestFitLength = midpoint;
          low = midpoint + 1;
        } else {
          high = midpoint - 1;
        }
      }

      // A single character is still useful when a very narrow viewport leaves
      // less room than one normal line. `overflow-wrap:anywhere` lets that
      // character make progress instead of trapping the loop.
      let breakAt = Math.max(bestFitLength, 1);

      if (breakAt < remainingMessage.length) {
        for (let index = breakAt; index > 0; index -= 1) {
          if (WHITESPACE_PATTERN.test(remainingMessage[index - 1] ?? "")) {
            breakAt = index;
            break;
          }
        }
      }

      const page = remainingMessage.slice(0, breakAt).trim();
      if (!page) {
        breakAt = Math.max(breakAt, 1);
        pages.push(remainingMessage.slice(0, breakAt).trim());
      } else {
        pages.push(page);
      }

      remainingMessage = remainingMessage.slice(breakAt).trimStart();
    }
  } finally {
    measureElement.textContent = "";
  }

  return pages.length > 0 ? pages : [""];
}

export function messagePagesMatch(
  first: readonly string[],
  second: readonly string[],
): boolean {
  return (
    first.length === second.length &&
    first.every((page, index) => page === second[index])
  );
}
