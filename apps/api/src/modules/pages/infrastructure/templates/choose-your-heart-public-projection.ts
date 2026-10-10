import {
  chooseYourHeartTemplate,
  secretLetterContentSchema,
} from '@letterly/templates';
import type { TemplatePublicProjectionAdapter } from './public-projection';

export const chooseYourHeartPublicProjectionAdapter: TemplatePublicProjectionAdapter =
  {
    registryKey: chooseYourHeartTemplate.registryKey,
    version: chooseYourHeartTemplate.version,
    project({ page, template: trustedTemplate, media }) {
      secretLetterContentSchema.parse(page.content);
      const settings = page.settings
        ? chooseYourHeartTemplate.settingsSchema.parse(page.settings)
        : null;
      const settingResponsesEnabled = settings?.responsesEnabled === true;

      const publishedRevision = page.pageJourney?.publishedRevision;
      if (!publishedRevision) {
        throw new Error('Published journey revision is missing');
      }

      const responseEnabled =
        (settingResponsesEnabled || publishedRevision.questions.length > 0) &&
        trustedTemplate.capabilities.includes('questions');
      const response = responseEnabled
        ? {
            enabled: true as const,
            requiredAnswers: trustedTemplate.questionRules?.required ?? true,
            visitorMessageEnabled:
              trustedTemplate.capabilities.includes('visitorMessage'),
            visitorMessagePrompt: trustedTemplate.response.visitorMessagePrompt,
            visitorMessagePrivacyText:
              trustedTemplate.response.visitorMessagePrivacyText,
            visitorMessageMaxLength:
              trustedTemplate.response.visitorMessageMaxLength,
            textAnswerMaxLength: trustedTemplate.response.textAnswerMaxLength,
          }
        : { enabled: false as const };

      return {
        displaySlug: page.displaySlug,
        canonicalSlug: page.slug,
        template: {
          registryKey: trustedTemplate.registryKey,
          key: 'choose-your-heart',
          version: page.templateVersion.version,
        },
        publishedGraphVersion: publishedRevision.revisionNumber,
        rootQuestionKey: publishedRevision.rootQuestion.key,
        maxDepth: publishedRevision.maxDepth,
        questions: publishedRevision.questions.map((question) => ({
          key: question.key,
          prompt: question.prompt,
          displayOrder: question.displayOrder,
          choices: question.choices.map((choice) => ({
            key: choice.key,
            label: choice.label,
            displayOrder: choice.displayOrder,
            nextQuestionKey: choice.nextQuestion?.key ?? null,
            outcomeKey: choice.outcome?.key ?? null,
          })),
        })),
        outcomes: publishedRevision.outcomes.map((outcome) => ({
          key: outcome.key,
          title: outcome.title,
          resultMessage: outcome.resultMessage,
          displayOrder: outcome.displayOrder,
        })),
        ...media,
        response,
      };
    },
  };
