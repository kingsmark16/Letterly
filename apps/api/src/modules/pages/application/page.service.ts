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
}
