import type { ReactNode } from "react";
import type { SecretLetterRenderModel } from "@letterly/templates/secret-letter";
import coffeeMornings from "./assets/coffee-mornings.jpg";
import handwrittenLetter from "./assets/handwritten-letter.jpg";
import holdingHands from "./assets/holding-hands.jpg";
import { SecretLetterRenderer } from "./renderer";

const mockLetter: SecretLetterRenderModel = {
  title: "A few things I never want to forget",
  recipientName: "Maria",
  mainMessage:
    "I keep thinking about the small moments that have become my favorite parts of life with you: the rainy walk home when we missed the bus, our Sunday coffee that turns into a three-hour conversation, and the way you always remember to ask how the hard parts went.\n\nYou make room for all of me. You listen when I need to talk, make me laugh when I take myself too seriously, and somehow turn a quiet evening at home into the best part of my week. I hope I give that same kind of comfort back to you.\n\nWhen I look through these little memories, I don't just see where we were. I see how lucky I am to keep finding my way beside you. Thank you for making ordinary days feel like somewhere I want to stay.\n\nWhatever the next chapter brings, I hope you always know that you have someone in your corner. I love building a life with you, one ordinary day at a time.",
  creatorName: "Alex",
  sections: [],
  images: [
    {
      imageId: "00000000-0000-4000-8000-000000000001",
      mediaUrl: holdingHands.src,
      caption: "A long walk with nowhere else to be",
    },
    {
      imageId: "00000000-0000-4000-8000-000000000002",
      mediaUrl: coffeeMornings.src,
      caption: "Slow mornings, two cups, and no rush",
    },
    {
      imageId: "00000000-0000-4000-8000-000000000003",
      mediaUrl: handwrittenLetter.src,
      caption: "The note you left for me on our first trip",
    },
  ],
};

export function SecretLetterPreview({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <SecretLetterRenderer preview autoOpen model={mockLetter}>
      {children}
    </SecretLetterRenderer>
  );
}
