import { chooseYourHeartTemplate } from "@letterly/templates/choose-your-heart";
import { secretLetterTemplate } from "@letterly/templates/secret-letter";
import { createCatalogProvisioningPlan } from "@letterly/templates/catalog-provisioning";

export const categoryDefinitions = [
  {
    key: "confession",
    name: "Confession",
    description: "Personal letters and heartfelt messages.",
    displayOrder: 1,
    status: "ACTIVE",
  },
] as const;

export const templateDefinitions = [
  {
    categoryKey: "confession",
    name: "Secret Letter",
    description: "A romantic letter with optional interactive features.",
    displayOrder: 1,
    status: "ACTIVE",
    definition: secretLetterTemplate,
  },
  {
    categoryKey: "confession",
    name: "Choose Your Heart",
    description: "A guided branching journey with a personal result.",
    displayOrder: 2,
    status: "ACTIVE",
    definition: chooseYourHeartTemplate,
  },
] as const;

createCatalogProvisioningPlan(categoryDefinitions, templateDefinitions);
