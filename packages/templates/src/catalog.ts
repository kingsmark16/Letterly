import { chooseYourHeartTemplate } from "@letterly/templates/choose-your-heart";
import { secretLetterTemplate } from "@letterly/templates/secret-letter";
import { createCatalogProvisioningPlan } from "@letterly/templates/catalog-provisioning";
import { categoryDefinitions } from "@letterly/templates/category-definitions";

export { categoryDefinitions };

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
