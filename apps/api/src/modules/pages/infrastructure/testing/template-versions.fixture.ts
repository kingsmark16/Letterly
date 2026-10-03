import {
  secretLetterContentSchema,
  secretLetterSettingsSchema,
} from '@letterly/templates/secret-letter';
import { resolveCatalogTemplateFromDefinitions } from '@letterly/templates/catalog-resolution';
import { createTemplateImplementationRegistry } from '@letterly/templates/implementation-registry';
import { versionDefinitions } from '../../application/testing/template-versions.fixture';
import type { TemplateDraftPersistenceAdapter } from '../templates/draft-persistence-adapter';
import type { TemplatePublicationAdapter } from '../templates/publication-adapter';
import type { TemplateOwnerProjectionAdapter } from '../templates/owner-projection';
import type { TemplatePublicProjectionAdapter } from '../templates/public-projection';

export const adapterEvents: Array<{
  stage: string;
  version: number;
  transaction?: unknown;
  pageId?: string;
}> = [];

const descriptors = versionDefinitions.map((definition) => ({
  categoryKey: 'fixture',
  definition,
  name: `Retained v${definition.version}`,
  status: definition.version === 1 ? 'INACTIVE' : 'ACTIVE',
}));
export function resolveFixtureCatalog(
  identity: Parameters<typeof resolveCatalogTemplateFromDefinitions>[0],
) {
  return resolveCatalogTemplateFromDefinitions(identity, descriptors);
}

const drafts: Record<string, TemplateDraftPersistenceAdapter> = {};
const publications: Record<string, TemplatePublicationAdapter> = {};
const owners: Record<string, TemplateOwnerProjectionAdapter> = {};
const publics: Record<string, TemplatePublicProjectionAdapter> = {};
for (const { registryKey, version } of versionDefinitions) {
  drafts[registryKey] = {
    registryKey,
    version,
    prepare(input) {
      return {
        content: secretLetterContentSchema.parse({
          ...input.content,
          title: `Persisted v${version}`,
        }),
        settings: secretLetterSettingsSchema.parse(input.settings),
        beforePage(transaction) {
          adapterEvents.push({ stage: 'before-page', version, transaction });
          return Promise.resolve();
        },
        afterPage(transaction, pageId) {
          adapterEvents.push({
            stage: 'after-page',
            version,
            transaction,
            pageId,
          });
          return Promise.resolve();
        },
      };
    },
  };
  publications[registryKey] = {
    registryKey,
    version,
    prepare(transaction, pageId) {
      adapterEvents.push({
        stage: 'prepare-publication',
        version,
        transaction,
        pageId,
      });
      return Promise.resolve({
        incrementsContentVersion: version === 2,
        commit() {
          adapterEvents.push({
            stage: 'commit-publication',
            version,
            transaction,
            pageId,
          });
          return Promise.resolve();
        },
      });
    },
  };
  owners[registryKey] = {
    registryKey,
    version,
    project({ content, privateSettings }) {
      return {
        content: secretLetterContentSchema.parse({
          ...secretLetterContentSchema.parse(content),
          title: `Owner v${version}`,
        }),
        settings: secretLetterSettingsSchema.parse(privateSettings),
      };
    },
    summarize({ content }) {
      return {
        recipientLabel: secretLetterContentSchema.parse(content).recipientName,
        preview: { title: `Summary v${version}` },
      };
    },
  };
  publics[registryKey] = {
    registryKey,
    version,
    project({ page, media }) {
      const content = secretLetterContentSchema.parse(page.content);
      return {
        displaySlug: page.displaySlug,
        canonicalSlug: page.slug,
        template: { registryKey, key: 'secret-letter', version },
        recipientName: content.recipientName,
        mainMessage: content.mainMessage,
        title: `Public persistence v${version}`,
        ...media,
      };
    },
  };
}
export const resolveFixtureDraft = createTemplateImplementationRegistry(
  versionDefinitions,
  drafts,
);
export const resolveFixturePublication = createTemplateImplementationRegistry(
  versionDefinitions,
  publications,
);
export const resolveFixtureOwner = createTemplateImplementationRegistry(
  versionDefinitions,
  owners,
);
export const resolveFixturePublic = createTemplateImplementationRegistry(
  versionDefinitions,
  publics,
);
