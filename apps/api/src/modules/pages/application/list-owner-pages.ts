import { templateRegistry } from '@letterly/templates';
import type {
  ListPagesInput,
  ListPagesResult,
  PagesRepository,
} from './pages.repository';
import { TemplateDefinitionUnavailableError } from './template-definition-unavailable.error';

export class ListOwnerPages {
  constructor(
    private readonly pagesRepository: Pick<PagesRepository, 'listPages'>,
  ) {}

  async execute(command: ListPagesInput): Promise<ListPagesResult> {
    const result = await this.pagesRepository.listPages(command);

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
}
