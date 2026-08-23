import { Inject, Injectable, Optional } from '@nestjs/common';
import { PAGES_REPOSITORY } from './pages.repository';
import type {
  ListDraftsResult,
  PageLifecycleMutationResult,
  PagesRepository,
} from './pages.repository';
import { TEMPLATE_VERSION_READER } from './template-version.reader';
import type { TemplateVersionReader } from './template-version.reader';
import type { OwnerPage, PageCursor, PublicPage } from '../domain/page.types';
import {
  isReservedPublicSlug,
  normalizePublicSlug,
  publicSecretLetterProjectionSchema,
  publicSecretLetterLockedProjectionSchema,
  publicSlugSchema,
  type PublicSecretLetterProjection,
} from '@letterly/contracts/pages';
import {
  pageJourneyPublicPageProjectionSchema,
  type PageJourneyPublicPageProjection,
} from '@letterly/contracts/page-journeys';
import {
  PagePasswordConfigurationError,
  PagePasswordService,
} from './page-password.service';
import {
  secretLetterContentSchema,
  secretLetterSettingsSchema,
  secretLetterTemplate,
  chooseYourHeartTemplate,
  templateRegistry,
  validatePageJourneyGraph,
} from '@letterly/templates';
import {
  PageJourneyInvalidStateError,
  PageJourneyNotFoundError,
  PageJourneyService,
  PageJourneyValidationError,
} from './page-journeys.service';
import {
  PAGE_JOURNEY_METRICS,
  type PageJourneyMetrics,
} from './page-journey-metrics';

export const APP_ORIGIN = Symbol('APP_ORIGIN');

export interface CreateDraftCommand {
  creatorId: string;
  templateVersionId: string;
  recipientName?: string;
  mainMessage?: string;
}

export interface UpdateDraftCommand {
  creatorId: string;
  pageId: string;
  recipientName: string;
  mainMessage: string;
  responsesEnabled?: boolean;
  expectedContentVersion: number;
  images?: Array<{
    imageId: string;
    sortOrder: number;
    caption?: string;
  }>;
}

export interface ListDraftsCommand {
  creatorId: string;
  size: number;
  cursor: PageCursor | null;
}

export interface DeleteDraftCommand {
  creatorId: string;
  pageId: string;
}

export interface PublishPageCommand {
  creatorId: string;
  pageId: string;
  customSlug?: string | null;
  confirmReady: boolean;
}

export interface UnpublishPageCommand {
  creatorId: string;
  pageId: string;
  confirm: boolean;
}

export interface ArchivePageCommand {
  creatorId: string;
  pageId: string;
}

export interface RestorePageCommand {
  creatorId: string;
  pageId: string;
}

export interface ChangePublishedSlugCommand {
  creatorId: string;
  pageId: string;
  customSlug: string;
}

export interface PageLifecycle {
  page: OwnerPage;
  publishedAt: Date | null;
  unpublishedAt: Date | null;
}

export class TemplateUnavailableError extends Error {
  constructor() {
    super('Template unavailable');
    this.name = 'TemplateUnavailableError';
  }
}

export class TemplateDefinitionUnavailableError extends Error {
  constructor() {
    super('Template definition unavailable');
    this.name = 'TemplateDefinitionUnavailableError';
  }
}

export class PageNotFoundError extends Error {
  constructor() {
    super('Page not found');
    this.name = 'PageNotFoundError';
  }
}

export class StalePageVersionError extends Error {
  constructor(
    readonly currentContentVersion: number,
    readonly currentUpdatedAt: Date,
  ) {
    super('This draft changed elsewhere');
    this.name = 'StalePageVersionError';
  }
}

export class InvalidImageError extends Error {
  constructor() {
    super('Image is invalid or unavailable');
    this.name = 'InvalidImageError';
  }
}

export class ImageLimitReachedError extends Error {
  constructor() {
    super('Image limit reached');
    this.name = 'ImageLimitReachedError';
  }
}

export class TemplateResponseCapabilityUnavailableError extends Error {
  constructor() {
    super('This template does not support visitor responses');
    this.name = 'TemplateResponseCapabilityUnavailableError';
  }
}

export class InvalidSlugError extends Error {
  constructor() {
    super('Invalid public slug');
    this.name = 'InvalidSlugError';
  }
}

export class SlugAlreadyTakenError extends Error {
  constructor() {
    super('That public slug is already in use');
    this.name = 'SlugAlreadyTakenError';
  }
}

export class InvalidPageStateError extends Error {
  constructor() {
    super('This page cannot make that lifecycle change');
    this.name = 'InvalidPageStateError';
  }
}

export class TemplateRequirementError extends Error {
  constructor() {
    super('Add a recipient name and message before publishing');
    this.name = 'TemplateRequirementError';
  }
}

export class ConfirmationRequiredError extends Error {
  constructor() {
    super('Explicit confirmation is required');
    this.name = 'ConfirmationRequiredError';
  }
}

export class SlugAllocationFailedError extends Error {
  constructor() {
    super('The public slug could not be reserved');
    this.name = 'SlugAllocationFailedError';
  }
}

export class PublicPageReadUnavailableError extends Error {
  constructor() {
    super('Public page read unavailable');
    this.name = 'PublicPageReadUnavailableError';
  }
}

type JourneyPublishMetricOutcome =
  'published' | 'rejected' | 'conflict' | 'not_found' | 'unavailable' | 'error';

function journeyPublishMetricOutcome(
  error: unknown,
): JourneyPublishMetricOutcome {
  if (
    error instanceof ConfirmationRequiredError ||
    error instanceof TemplateRequirementError ||
    error instanceof PageJourneyValidationError
  ) {
    return 'rejected';
  }
  if (
    error instanceof InvalidPageStateError ||
    error instanceof StalePageVersionError ||
    error instanceof SlugAlreadyTakenError ||
    error instanceof PageJourneyInvalidStateError
  ) {
    return 'conflict';
  }
  if (
    error instanceof PageNotFoundError ||
    error instanceof PageJourneyNotFoundError
  ) {
    return 'not_found';
  }
  if (error instanceof TemplateDefinitionUnavailableError) {
    return 'unavailable';
  }
  return 'error';
}

@Injectable()
export class PageService {
  constructor(
    @Inject(PAGES_REPOSITORY)
    private readonly pagesRepository: PagesRepository,
    @Inject(TEMPLATE_VERSION_READER)
    private readonly templateVersionReader: TemplateVersionReader,
    @Optional()
    @Inject(APP_ORIGIN)
    private readonly appOrigin = 'http://localhost:3000',
    @Optional()
    @Inject(PagePasswordService)
    private readonly pagePasswordService?: PagePasswordService,
    @Optional()
    @Inject(PageJourneyService)
    private readonly pageJourneyService?: PageJourneyService,
    @Optional()
    @Inject(PAGE_JOURNEY_METRICS)
    private readonly journeyMetrics?: PageJourneyMetrics,
  ) {}

  async createDraft(command: CreateDraftCommand): Promise<OwnerPage> {
    const templateVersion = await this.templateVersionReader.findActiveById(
      command.templateVersionId,
    );

    if (!templateVersion) {
      throw new TemplateUnavailableError();
    }

    const template = Object.values(templateRegistry).find(
      (candidate) =>
        candidate.registryKey === templateVersion.registryKey &&
        candidate.version === templateVersion.version,
    );

    if (!template) {
      throw new TemplateDefinitionUnavailableError();
    }

    const isChooseYourHeart =
      template.registryKey === chooseYourHeartTemplate.registryKey;
    const content = isChooseYourHeart
      ? secretLetterContentSchema.parse({
          recipientName: '',
          mainMessage: '',
          sections: [],
        })
      : secretLetterContentSchema.parse({
          ...secretLetterTemplate.defaultContent,
          recipientName:
            command.recipientName ??
            secretLetterTemplate.defaultContent.recipientName,
          mainMessage:
            command.mainMessage ??
            secretLetterTemplate.defaultContent.mainMessage,
        });

    const settings = isChooseYourHeart
      ? secretLetterSettingsSchema.parse({
          ...secretLetterTemplate.defaultSettings,
          responsesEnabled: template.defaultSettings.responsesEnabled,
        })
      : secretLetterSettingsSchema.parse(secretLetterTemplate.defaultSettings);

    const journey = isChooseYourHeart
      ? validatePageJourneyGraph(chooseYourHeartTemplate.journey.defaultGraph)
      : null;
    if (journey) {
      this.journeyMetrics?.record({
        event: 'journey_graph_validation',
        templateKey: chooseYourHeartTemplate.renderer.key,
        outcome: journey.valid ? 'valid' : 'invalid',
        questionCount: journey.graph?.questions.length ?? 0,
        outcomeCount: journey.graph?.outcomes.length ?? 0,
        issueCount: journey.issues.length,
      });
    }
    if (
      isChooseYourHeart &&
      (!journey?.valid || journey.maxDepth === undefined)
    ) {
      throw new TemplateDefinitionUnavailableError();
    }

    const page = await this.pagesRepository.createDraft({
      creatorId: command.creatorId,
      templateVersionId: templateVersion.id,
      content,
      settings,
      ...(journey?.valid && journey.maxDepth !== undefined
        ? {
            journey: {
              graph: chooseYourHeartTemplate.journey.defaultGraph,
              maxDepth: journey.maxDepth,
            },
          }
        : {}),
    });

    return page;
  }

  async listDrafts(command: ListDraftsCommand): Promise<ListDraftsResult> {
    const result = await this.pagesRepository.listDrafts(command);

    for (const item of result.items) {
      const trustedTemplate = Object.values(templateRegistry).find(
        (candidate) =>
          candidate.registryKey === item.template.registryKey &&
          candidate.version === item.template.version,
      );

      if (!trustedTemplate) {
        throw new TemplateDefinitionUnavailableError();
      }
    }

    return result;
  }

  async updateDraft(command: UpdateDraftCommand): Promise<OwnerPage> {
    const existingPage = await this.pagesRepository.findOwnedPage({
      creatorId: command.creatorId,
      pageId: command.pageId,
    });

    if (!existingPage) {
      throw new PageNotFoundError();
    }

    const template = Object.values(templateRegistry).find(
      (candidate) =>
        candidate.registryKey === existingPage.template.registryKey &&
        candidate.version === existingPage.template.version,
    );

    if (!template) {
      throw new TemplateDefinitionUnavailableError();
    }

    if (
      command.responsesEnabled === true &&
      !template.capabilities.includes('questions') &&
      !template.capabilities.includes('visitorMessage')
    ) {
      throw new TemplateResponseCapabilityUnavailableError();
    }

    const result = await this.pagesRepository.updateDraft(command);

    if (result.type === 'not_found') {
      throw new PageNotFoundError();
    }

    if (result.type === 'stale') {
      throw new StalePageVersionError(
        result.currentContentVersion,
        result.currentUpdatedAt,
      );
    }

    if (result.type === 'invalid_image') {
      throw new InvalidImageError();
    }

    if (result.type === 'image_limit') {
      throw new ImageLimitReachedError();
    }

    return result.page;
  }

  async getOwnedPage(input: {
    creatorId: string;
    pageId: string;
  }): Promise<OwnerPage> {
    const page = await this.pagesRepository.findOwnedPage(input);

    if (!page) {
      throw new PageNotFoundError();
    }

    const template = Object.values(templateRegistry).find(
      (candidate) =>
        candidate.registryKey === page.template.registryKey &&
        candidate.version === page.template.version,
    );

    if (!template) {
      throw new TemplateDefinitionUnavailableError();
    }

    return page;
  }

  async deleteDraft(command: DeleteDraftCommand): Promise<void> {
    const result = await this.pagesRepository.deleteOwnedPage(command);

    if (result === 'not_found') {
      throw new PageNotFoundError();
    }
  }

  async publishPage(command: PublishPageCommand): Promise<PageLifecycle> {
    if (!command.confirmReady) {
      throw new ConfirmationRequiredError();
    }

    const page = await this.pagesRepository.findOwnedPage({
      creatorId: command.creatorId,
      pageId: command.pageId,
    });

    if (!page) {
      throw new PageNotFoundError();
    }

    this.assertTrustedTemplate(page);

    const isChooseYourHeart =
      page.template.registryKey === chooseYourHeartTemplate.registryKey;

    try {
      if (isChooseYourHeart) {
        if (!this.pageJourneyService) {
          throw new TemplateDefinitionUnavailableError();
        }
        await this.pageJourneyService.getOwned({
          creatorId: command.creatorId,
          pageId: command.pageId,
        });
      } else if (
        page.content.recipientName.trim().length === 0 ||
        page.content.mainMessage.trim().length === 0
      ) {
        throw new TemplateRequirementError();
      }

      const customSlug =
        command.customSlug === undefined || command.customSlug === null
          ? null
          : this.normalizeAndValidateSlug(command.customSlug);

      const lifecycle = this.mapLifecycleResult(
        await this.pagesRepository.publishPage({
          creatorId: command.creatorId,
          pageId: command.pageId,
          expectedContentVersion: page.contentVersion,
          customSlug,
        }),
      );

      if (isChooseYourHeart) {
        this.journeyMetrics?.record({
          event: 'journey_publish',
          templateKey: chooseYourHeartTemplate.renderer.key,
          outcome: 'published',
        });
      }

      return lifecycle;
    } catch (error: unknown) {
      if (isChooseYourHeart) {
        this.journeyMetrics?.record({
          event: 'journey_publish',
          templateKey: chooseYourHeartTemplate.renderer.key,
          outcome: journeyPublishMetricOutcome(error),
        });
      }
      throw error;
    }
  }

  async unpublishPage(command: UnpublishPageCommand): Promise<PageLifecycle> {
    if (!command.confirm) {
      throw new ConfirmationRequiredError();
    }

    const lifecycle = this.mapLifecycleResult(
      await this.pagesRepository.unpublishPage({
        creatorId: command.creatorId,
        pageId: command.pageId,
      }),
    );
    await this.pagePasswordService?.invalidatePageProofs(command.pageId);
    return lifecycle;
  }

  async archivePage(command: ArchivePageCommand): Promise<PageLifecycle> {
    const lifecycle = this.mapLifecycleResult(
      await this.pagesRepository.archivePage({
        creatorId: command.creatorId,
        pageId: command.pageId,
      }),
    );
    await this.pagePasswordService?.invalidatePageProofs(command.pageId);
    return lifecycle;
  }

  async restorePage(command: RestorePageCommand): Promise<PageLifecycle> {
    return this.mapLifecycleResult(
      await this.pagesRepository.restorePage({
        creatorId: command.creatorId,
        pageId: command.pageId,
      }),
    );
  }

  async changePublishedSlug(
    command: ChangePublishedSlugCommand,
  ): Promise<PageLifecycle> {
    const customSlug = this.normalizeAndValidateSlug(command.customSlug);

    return this.mapLifecycleResult(
      await this.pagesRepository.changePublishedSlug({
        creatorId: command.creatorId,
        pageId: command.pageId,
        customSlug,
      }),
    );
  }

  async getPublicPage(
    slug: string,
    cookieHeader?: string,
  ): Promise<PublicSecretLetterProjection | PageJourneyPublicPageProjection> {
    const normalizedSlug = normalizePublicSlug(slug);

    if (
      !publicSlugSchema.safeParse(normalizedSlug).success ||
      isReservedPublicSlug(normalizedSlug)
    ) {
      throw new PageNotFoundError();
    }

    let page: PublicPage | null;

    try {
      page = await this.pagesRepository.findPublicPageBySlug(normalizedSlug);
    } catch {
      throw new PublicPageReadUnavailableError();
    }

    if (!page) {
      throw new PageNotFoundError();
    }

    if (this.pagePasswordService) {
      let protection: Awaited<
        ReturnType<PagePasswordService['findPublicProtection']>
      >;
      try {
        protection =
          await this.pagePasswordService.findPublicProtection(normalizedSlug);
      } catch {
        throw new PublicPageReadUnavailableError();
      }

      if (protection) {
        let unlocked = false;
        try {
          unlocked = await this.pagePasswordService.verifyRequestCookie(
            protection.pageId,
            protection.passwordVersion,
            cookieHeader,
          );
        } catch (error: unknown) {
          if (error instanceof PagePasswordConfigurationError) {
            throw new PublicPageReadUnavailableError();
          }
          throw error;
        }

        if (!unlocked) {
          return publicSecretLetterLockedProjectionSchema.parse({
            state: 'LOCKED',
            displaySlug: page.displaySlug,
            canonicalUrl: this.publicUrl(page.displaySlug),
            template: page.template,
          });
        }
      }
    }

    const template = Object.values(templateRegistry).find(
      (candidate) =>
        candidate.renderer.key === page.template.key &&
        candidate.version === page.template.version,
    );

    if (!template) {
      throw new TemplateDefinitionUnavailableError();
    }

    const projection = {
      displaySlug: page.displaySlug,
      canonicalUrl: this.publicUrl(page.displaySlug),
      template: page.template,
      images: page.images ?? [],
      ...(page.response?.enabled ? { response: page.response } : {}),
      ...('recipientName' in page
        ? {
            recipientName: page.recipientName,
            mainMessage: page.mainMessage,
            sections: [],
          }
        : {
            publishedGraphVersion: page.publishedGraphVersion,
            rootQuestionKey: page.rootQuestionKey,
            maxDepth: page.maxDepth,
            questions: page.questions,
            outcomes: page.outcomes,
          }),
    };

    try {
      if ('publishedGraphVersion' in page) {
        return pageJourneyPublicPageProjectionSchema.parse(projection);
      }

      if (!page.response) {
        return projection as PublicSecretLetterProjection;
      }

      return publicSecretLetterProjectionSchema.parse({
        ...projection,
        recipientName: page.recipientName,
        mainMessage: page.mainMessage,
        sections: [],
      });
    } catch {
      throw new PublicPageReadUnavailableError();
    }
  }

  private assertTrustedTemplate(page: OwnerPage): void {
    const template = Object.values(templateRegistry).find(
      (candidate) =>
        candidate.registryKey === page.template.registryKey &&
        candidate.version === page.template.version,
    );

    if (!template) {
      throw new TemplateDefinitionUnavailableError();
    }
  }

  private normalizeAndValidateSlug(value: string): string {
    const normalized = normalizePublicSlug(value);

    if (
      !publicSlugSchema.safeParse(normalized).success ||
      isReservedPublicSlug(normalized)
    ) {
      throw new InvalidSlugError();
    }

    return normalized;
  }

  private mapLifecycleResult(
    result: PageLifecycleMutationResult,
  ): PageLifecycle {
    if (result.type === 'not_found') {
      throw new PageNotFoundError();
    }

    if (result.type === 'invalid_state') {
      throw new InvalidPageStateError();
    }

    if (result.type === 'slug_already_taken') {
      throw new SlugAlreadyTakenError();
    }

    if (result.type === 'slug_allocation_failed') {
      throw new SlugAllocationFailedError();
    }

    return {
      page: result.page,
      publishedAt: result.publishedAt,
      unpublishedAt: result.unpublishedAt,
    };
  }

  private publicUrl(slug: string): string {
    return new URL(`/p/${encodeURIComponent(slug)}`, this.appOrigin).toString();
  }
}
