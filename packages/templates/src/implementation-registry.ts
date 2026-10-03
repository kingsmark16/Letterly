export interface TemplateImplementationIdentity {
  readonly registryKey: string;
  readonly version: number;
}

export function createTemplateImplementationRegistry<
  Implementation extends TemplateImplementationIdentity,
>(
  definitions: readonly TemplateImplementationIdentity[],
  implementations: Readonly<Record<string, Implementation>>,
): (identity: TemplateImplementationIdentity) => Implementation | undefined {
  const expected = new Map<string, number>();
  for (const { registryKey, version } of definitions) {
    if (!registryKey.trim() || !Number.isSafeInteger(version) || version < 1) {
      throw new Error("Invalid template implementation definition identity.");
    }
    if (expected.has(registryKey)) {
      throw new Error(
        `Duplicate template implementation definition: ${registryKey}.`,
      );
    }
    expected.set(registryKey, version);
  }

  const bindings = new Map<
    string,
    { version: number; implementation: Implementation }
  >();
  for (const [key, implementation] of Object.entries(implementations)) {
    const version = expected.get(key);
    if (version === undefined) {
      throw new Error(`Unknown template implementation registration: ${key}.`);
    }
    if (
      implementation.registryKey !== key ||
      implementation.version !== version
    ) {
      throw new Error(
        `Template implementation identity mismatch: ${key} v${version}.`,
      );
    }
    bindings.set(key, { version, implementation });
  }
  for (const key of expected.keys()) {
    if (!bindings.has(key)) {
      throw new Error(`Missing template implementation registration: ${key}.`);
    }
  }

  return ({ registryKey, version }) => {
    const binding = bindings.get(registryKey);
    if (!binding || binding.version !== version) return undefined;
    const implementation = binding.implementation;
    if (
      implementation.registryKey !== registryKey ||
      implementation.version !== version
    )
      return undefined;
    return implementation;
  };
}
