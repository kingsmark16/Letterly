import {
  secretLetterTemplate,
  secretLetterContentSchema,
  secretLetterSettingsSchema,
} from '@letterly/templates/secret-letter';
import { resolveTemplateFromDefinitions } from '@letterly/templates/registry';
import { createTemplateImplementationRegistry } from '@letterly/templates/implementation-registry';
import type { TemplateDraftPolicy } from '../templates/draft-policy';
import type { TemplatePublishPolicy } from '../templates/publish-policy';
import type { PublicProjectionAdapter } from '../projections/public-projection';
import { secretLetterPublicProjection } from '../projections/secret-letter-public-projection';

export const versionDefinitions = [1, 2].map((version) => ({
  ...secretLetterTemplate,
  registryKey: `fixture.secret-letter.v${version}`,
  version,
  defaultContent: {
    recipientName: `Recipient v${version}`,
    mainMessage: `Default v${version}`,
    sections: [],
  },
}));

export function resolveFixtureTemplate(
  criteria: Parameters<typeof resolveTemplateFromDefinitions>[0],
) {
  return resolveTemplateFromDefinitions(criteria, versionDefinitions);
}

const draftPolicies: Record<string, TemplateDraftPolicy> = {};
const publishPolicies: Record<string, TemplatePublishPolicy> = {};
const publicAdapters: Record<string, PublicProjectionAdapter> = {};

for (const definition of versionDefinitions) {
  const { registryKey, version } = definition;
  draftPolicies[registryKey] = {
    registryKey,
    version,
    initialize(input) {
      return {
        content: secretLetterContentSchema.parse({
          ...definition.defaultContent,
          ...input,
        }),
        settings: secretLetterSettingsSchema.parse(definition.defaultSettings),
      };
    },
    update(current, input) {
      return secretLetterContentSchema.parse({
        ...secretLetterContentSchema.parse(current),
        ...input,
        title: `Updated by v${version}`,
      });
    },
  };
  publishPolicies[registryKey] = {
    registryKey,
    version,
    requiresOwnedJourney: false,
    acceptsContent: (content) =>
      content.mainMessage === `Ready for v${version}`,
  };
  publicAdapters[registryKey] = {
    registryKey,
    version,
    project(context) {
      return secretLetterPublicProjection.project({
        ...context,
        page: { ...context.page, title: `Public v${version}` },
      });
    },
  };
}

export const resolveFixtureDraftPolicy = createTemplateImplementationRegistry(
  versionDefinitions,
  draftPolicies,
);
export const resolveFixturePublishPolicy = createTemplateImplementationRegistry(
  versionDefinitions,
  publishPolicies,
);
export const resolveFixturePublicAdapter = createTemplateImplementationRegistry(
  versionDefinitions,
  publicAdapters,
);
