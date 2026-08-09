import { Inject, Injectable } from '@nestjs/common';
import { PAGES_REPOSITORY } from './pages.repository';
import type { PagesRepository } from './pages.repository';
import { TEMPLATE_VERSION_READER } from './template-version.reader';
import type { TemplateVersionReader } from './template-version.reader';
import type { OwnerPage } from '../domain/page.types';
import {
  secretLetterContentSchema,
  secretLetterSettingsSchema,
  templateRegistry,
} from '@letterly/templates';

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
  expectedContentVersion: number;
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

@Injectable()
export class PageService {
  constructor(
    @Inject(PAGES_REPOSITORY)
    private readonly pagesRepository: PagesRepository,
    @Inject(TEMPLATE_VERSION_READER)
    private readonly templateVersionReader: TemplateVersionReader,
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

    const content = secretLetterContentSchema.parse({
      ...template.defaultContent,
      recipientName:
        command.recipientName ?? template.defaultContent.recipientName,
      mainMessage: command.mainMessage ?? template.defaultContent.mainMessage,
    });

    const settings = secretLetterSettingsSchema.parse(template.defaultSettings);

    return this.pagesRepository.createDraft({
      creatorId: command.creatorId,
      templateVersionId: templateVersion.id,
      content,
      settings,
    });
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
}
