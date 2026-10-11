import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const mergeClasses = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["small", "medium", "large", "round"],
      shadow: ["low", "medium"],
      text: [
        "display",
        "heading-1",
        "heading-2",
        "heading-3",
        "body-large",
        "body",
        "small",
        "label",
      ],
    },
    classGroups: {
      "min-h": ["min-h-target"],
      duration: ["duration-fast", "duration-standard", "duration-slow"],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return mergeClasses(clsx(inputs));
}
