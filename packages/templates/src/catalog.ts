import { chooseYourHeartTemplate } from "@letterly/templates/choose-your-heart";
import { secretLetterTemplate } from "@letterly/templates/secret-letter";

export const categoryDefinitions = [
  {
    key: "confession",
    name: "Confession",
    description: "Personal letters and heartfelt messages.",
    displayOrder: 1,
  },
] as const;

export const templateDefinitions = [
  {
    categoryKey: "confession",
    name: "Secret Letter",
    description: "A romantic letter with optional interactive features.",
    displayOrder: 1,
    definition: secretLetterTemplate,
  },
  {
    categoryKey: "confession",
    name: "Choose Your Heart",
    description: "A guided branching journey with a personal result.",
    displayOrder: 2,
    definition: chooseYourHeartTemplate,
  },
] as const;
