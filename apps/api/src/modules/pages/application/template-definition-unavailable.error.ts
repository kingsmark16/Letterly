export class TemplateDefinitionUnavailableError extends Error {
  constructor() {
    super('Template definition unavailable');
    this.name = 'TemplateDefinitionUnavailableError';
  }
}
