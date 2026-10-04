import type { CSSProperties } from "react";
import styles from "./floating-letter-field.module.css";
const floatingLetterItems = [
  { kind: "quote", text: "dear you", color: "#a84d5a" },
  { kind: "quote", text: "keep this close", color: "#8f3443" },
  { kind: "quote", text: "with love", color: "#d45d68" },
  { kind: "quote", text: "just because", color: "#a86f60" },
  { kind: "quote", text: "open when ready", color: "#b94756" },
  { kind: "quote", text: "a little note", color: "#c26672" },
  { kind: "quote", text: "from the heart", color: "#9f5360" },
  { kind: "quote", text: "for your someday", color: "#b56f62" },
  { kind: "quote", text: "say what matters", color: "#d45d68" },
  { kind: "quote", text: "words worth keeping", color: "#8f3443" },
  { kind: "quote", text: "to remember", color: "#a84d5a" },
  { kind: "quote", text: "save this feeling", color: "#c26672" },
  { kind: "quote", text: "always and forever", color: "#9f5360" },
  { kind: "quote", text: "a note for later", color: "#b56f62" },
  { kind: "quote", text: "you are loved", color: "#d45d68" },
  { kind: "quote", text: "hold onto this", color: "#8f3443" },
  { kind: "quote", text: "thank you", color: "#a86f60" },
  { kind: "quote", text: "one day at a time", color: "#b94756" },
  { kind: "quote", text: "your story matters", color: "#c26672" },
  { kind: "quote", text: "written with care", color: "#a84d5a" },
  { kind: "quote", text: "for the quiet moments", color: "#8f3443" },
  { kind: "quote", text: "read this slowly", color: "#b56f62" },
  { kind: "quote", text: "a place for us", color: "#d45d68" },
  { kind: "quote", text: "you make life brighter", color: "#a86f60" },
  { kind: "quote", text: "keep choosing joy", color: "#c26672" },
  { kind: "quote", text: "remember this day", color: "#a84d5a" },
  { kind: "quote", text: "all my gratitude", color: "#b94756" },
  { kind: "quote", text: "the little things", color: "#9f5360" },
  { kind: "quote", text: "for whenever you need it", color: "#8f3443" },
  { kind: "quote", text: "you matter here", color: "#d45d68" },
  { kind: "quote", text: "a soft place to land", color: "#b56f62" },
  { kind: "quote", text: "made for you", color: "#c26672" },
  { kind: "quote", text: "let this stay", color: "#a84d5a" },
  { kind: "quote", text: "the words between us", color: "#a86f60" },
  { kind: "quote", text: "always in my thoughts", color: "#b94756" },
  { kind: "quote", text: "a promise in ink", color: "#9f5360" },
  { kind: "quote", text: "more than a message", color: "#d45d68" },
  { kind: "quote", text: "keep the good close", color: "#8f3443" },
  { kind: "quote", text: "for your heart", color: "#c26672" },
  { kind: "quote", text: "a moment to keep", color: "#a84d5a" },
] as const;

function shuffleFloatingLetters<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const currentItem = shuffled[index];
    const swapItem = shuffled[swapIndex];

    if (currentItem === undefined || swapItem === undefined) {
      continue;
    }

    shuffled[index] = swapItem;
    shuffled[swapIndex] = currentItem;
  }

  return shuffled;
}

function randomFloatingValue(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function FloatingLetterField(): React.JSX.Element {
  const shuffledItems = shuffleFloatingLetters(floatingLetterItems);
  const floatingSlotCount = Math.ceil(shuffledItems.length / 2);
  const floatingSlotStep = 92 / floatingSlotCount;

  return (
    <div className={styles.floatingLetterField} aria-hidden="true">
      {shuffledItems.map((item, index) => {
        const isRightGutter = index % 2 === 1;
        const slotIndex = Math.floor(index / 2);
        const slotTop = 4 + (slotIndex + 0.5) * floatingSlotStep;
        const left = isRightGutter
          ? randomFloatingValue(78, 93)
          : randomFloatingValue(7, 22);
        const top = Math.min(
          97,
          Math.max(
            3,
            slotTop +
              randomFloatingValue(
                -floatingSlotStep * 0.22,
                floatingSlotStep * 0.22,
              ),
          ),
        );

        return (
          <span
            className={`${styles.floatingLetter} ${styles.floatingLetterQuote}`}
            key={`${item.kind}-${index}`}
            style={
              {
                "--letter-left": `${left}%`,
                "--letter-top": `${top}%`,
                "--letter-rotation": `${randomFloatingValue(-8, 8)}deg`,
                "--letter-delay": `${randomFloatingValue(-12, -1)}s`,
                "--letter-duration": `${randomFloatingValue(10, 17)}s`,
                "--letter-color": item.color,
              } as CSSProperties
            }
          >
            {`“${item.text}”`}
          </span>
        );
      })}
    </div>
  );
}
