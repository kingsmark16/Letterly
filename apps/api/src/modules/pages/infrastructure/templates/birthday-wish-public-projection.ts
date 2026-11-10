import {
  birthdayWishContentSchema,
  birthdayWishSettingsSchema,
  birthdayWishTemplate,
} from '@letterly/templates';
import type { TemplatePublicProjectionAdapter } from './public-projection';

export const birthdayWishPublicProjectionAdapter: TemplatePublicProjectionAdapter =
  {
    registryKey: birthdayWishTemplate.registryKey,
    version: birthdayWishTemplate.version,
    project({ page, template: trustedTemplate, media }) {
      const content = birthdayWishContentSchema.parse(page.content);
      if (page.settings) {
        birthdayWishSettingsSchema.parse(page.settings);
      }

      return {
        displaySlug: page.displaySlug,
        canonicalSlug: page.slug,
        template: {
          registryKey: trustedTemplate.registryKey,
          key: 'birthday-wish',
          version: page.templateVersion.version,
        },
        ...(content.title !== undefined ? { title: content.title } : {}),
        recipientName: content.recipientName,
        mainMessage: content.mainMessage,
        ...(content.creatorName !== undefined
          ? { creatorName: content.creatorName }
          : {}),
        ...media,
        response: { enabled: false as const },
      };
    },
  };
