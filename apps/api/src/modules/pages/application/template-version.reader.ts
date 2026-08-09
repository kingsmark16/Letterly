export const TEMPLATE_VERSION_READER = Symbol('TEMPLATE_VERSION_READER');

export interface ActiveTemplateVersion {
  id: string;
  version: number;
  registryKey: string;
}

export interface TemplateVersionReader {
  findActiveById(id: string): Promise<ActiveTemplateVersion | null>;
}
