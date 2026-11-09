import type { SecretLetterRenderModel } from "@letterly/templates/secret-letter";
import coffeeMornings from "../secret-letter/assets/coffee-mornings.jpg";
import handwrittenLetter from "../secret-letter/assets/handwritten-letter.jpg";
import holdingHands from "../secret-letter/assets/holding-hands.jpg";
import { BirthdayWishRenderer } from "./renderer";

const mockBirthdayWish: SecretLetterRenderModel = {
  title: "To another radiant year of you",
  recipientName: "Elena",
  mainMessage:
    "Happy birthday to the person who somehow makes every room warmer the moment she walks in. Looking back on this past year, my favorite memories are the unscripted ones: our late afternoon coffee runs, laughing until we lost track of time, and the quiet ways you always show up for the people you love.\n\nYou deserve a year that gives back every bit of kindness and joy you pour into the world. May this next chapter bring slow mornings that feel restful, bold adventures worth telling stories about, and dreams that unfold even better than you imagined.\n\nNo matter how busy life gets or how many candles we add to the cake, I am endlessly grateful to celebrate you today and always.",
  creatorName: "Jordan",
  sections: [],
  images: [
    {
      imageId: "00000000-0000-4000-8000-000000000101",
      mediaUrl: coffeeMornings.src,
      caption: "Our favorite morning ritual before the day begins",
    },
    {
      imageId: "00000000-0000-4000-8000-000000000102",
      mediaUrl: holdingHands.src,
      caption: "Walking the long way home just to keep talking",
    },
    {
      imageId: "00000000-0000-4000-8000-000000000103",
      mediaUrl: handwrittenLetter.src,
      caption: "Notes and keepsakes saved from our favorite weekend",
    },
  ],
};

export function BirthdayWishPreview(): React.JSX.Element {
  return <BirthdayWishRenderer preview autoOpen model={mockBirthdayWish} />;
}
