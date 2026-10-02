import { templateDefinitions } from "@letterly/templates/catalog";

type RegisteredTemplate = (typeof templateDefinitions)[number]["definition"];
type Registry = {
  [Key in RegisteredTemplate["registryKey"]]: Extract<
    RegisteredTemplate,
    { registryKey: Key }
  >;
};

export const templateRegistry = Object.fromEntries(
  templateDefinitions.map(({ definition }) => [
    definition.registryKey,
    definition,
  ]),
) as Registry;
