import { createTemplateImplementationRegistry } from "@letterly/templates/implementation-registry";
import { resolveWebTemplate, type WebTemplateIdentity } from "./registration";

export interface WebTemplateImplementation<Implementation> {
  registryKey: string;
  version: number;
  implementation: Implementation;
}

export function createWebTemplateImplementationRegistry<
  Implementation,
  Registration extends {
    id: string;
    categoryKey: string;
    templateKey: string;
    version: number;
  },
>(
  registrations: readonly Registration[],
  implementations: Readonly<
    Record<string, WebTemplateImplementation<Implementation>>
  >,
) {
  const retained = registrations.map((registration) => ({ ...registration }));
  const resolveImplementation = createTemplateImplementationRegistry(
    retained.map(({ id, version }) => ({ registryKey: id, version })),
    implementations,
  );
  return (identity: WebTemplateIdentity) => {
    const registration = resolveWebTemplate(identity, retained);
    if (!registration) return undefined;
    const binding = resolveImplementation({
      registryKey: registration.id,
      version: registration.version,
    });
    return binding
      ? { registration, implementation: binding.implementation }
      : undefined;
  };
}
