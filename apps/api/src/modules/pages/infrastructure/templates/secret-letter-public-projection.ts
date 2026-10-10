import {
  secretLetterTemplate,
  secretLetterContentSchema,
  secretLetterSettingsSchema,
} from '@letterly/templates';
import {
  areValidSecretLetterQuestions,
  resolveSecretLetterResponseAvailability,
} from '../../application/secret-letter-response-availability';
import type { TemplatePublicProjectionAdapter } from './public-projection';

export const secretLetterPublicProjectionAdapter: TemplatePublicProjectionAdapter =
  {
    registryKey: secretLetterTemplate.registryKey,
    version: secretLetterTemplate.version,
    project({ page, template: trustedTemplate, media }) {
      const content = secretLetterContentSchema.parse(page.content);
      const settings = page.settings
        ? secretLetterSettingsSchema.parse(page.settings)
        : null;
      const sortedQuestions = [...(page.questions ?? [])].sort(
        (left, right) =>
          left.displayOrder - right.displayOrder ||
          left.id.localeCompare(right.id),
      );
      const questionsAreValid = areValidSecretLetterQuestions(sortedQuestions);
      const responseEnabled = resolveSecretLetterResponseAvailability({
        template: trustedTemplate,
        validQuestionCount: questionsAreValid ? sortedQuestions.length : 0,
      });
      const response = responseEnabled
        ? {
            enabled: true as const,
            requiredAnswers: trustedTemplate.questionRules?.required ?? false,
            visitorMessageEnabled:
              trustedTemplate.capabilities.includes('visitorMessage'),
            visitorMessagePrompt: trustedTemplate.response.visitorMessagePrompt,
            visitorMessagePrivacyText:
              trustedTemplate.response.visitorMessagePrivacyText,
            visitorMessageMaxLength:
              trustedTemplate.response.visitorMessageMaxLength,
            textAnswerMaxLength: trustedTemplate.response.textAnswerMaxLength,
            questions: sortedQuestions
              .map((question) => ({
                id: question.id,
                type: question.type,
                prompt: question.prompt,
                displayOrder: question.displayOrder,
                choices: [...question.choices]
                  .sort(
                    (left, right) =>
                      left.displayOrder - right.displayOrder ||
                      left.id.localeCompare(right.id),
                  )
                  .map((choice) => ({
                    id: choice.id,
                    label: choice.label,
                    displayOrder: choice.displayOrder,
                  })),
              }))
              .sort(
                (left, right) =>
                  left.displayOrder - right.displayOrder ||
                  left.id.localeCompare(right.id),
              ),
          }
        : { enabled: false as const };

      return {
        displaySlug: page.displaySlug,
        canonicalSlug: page.slug,
        template: {
          registryKey: trustedTemplate.registryKey,
          key: 'secret-letter',
          version: page.templateVersion.version,
        },
        ...(content.title !== undefined ? { title: content.title } : {}),
        recipientName: content.recipientName,
        mainMessage: content.mainMessage,
        ...(content.creatorName !== undefined
          ? { creatorName: content.creatorName }
          : {}),
        ...media,
        ...(settings ? { response } : {}),
      };
    },
  };
