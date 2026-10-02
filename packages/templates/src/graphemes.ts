type GraphemeSegmenter = {
  segment(input: string): Iterable<{ segment: string }>;
};

type IntlWithSegmenter = typeof Intl & {
  Segmenter?: new (
    locales?: string | string[],
    options?: {
      granularity: "grapheme";
    },
  ) => GraphemeSegmenter;
};

const intlWithSegmenter = Intl as IntlWithSegmenter;
const Segmenter = intlWithSegmenter.Segmenter;

const graphemeSegmenter = Segmenter
  ? new Segmenter(undefined, { granularity: "grapheme" })
  : undefined;

export function countGraphemes(value: string): number {
  if (!graphemeSegmenter) {
    throw new Error("Intl.Segmenter is required for grapheme counting");
  }

  return Array.from(graphemeSegmenter.segment(value)).length;
}

export function hasAtMostGraphemes(value: string, maximum: number): boolean {
  return countGraphemes(value) <= maximum;
}

export function truncateGraphemes(value: string, maximum: number): string {
  if (!graphemeSegmenter) {
    throw new Error("Intl.Segmenter is required for grapheme counting");
  }

  const limit = Math.max(0, Math.floor(maximum));
  let truncated = "";
  let count = 0;

  for (const { segment } of graphemeSegmenter.segment(value)) {
    if (count >= limit) break;
    truncated += segment;
    count += 1;
  }

  return truncated;
}
