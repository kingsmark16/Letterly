export const pageKeys = {
  all: ['pages'] as const,
  list: (creatorId: string) => ['pages', 'list', creatorId] as const,
  detail: (pageId: string) => ['pages', 'detail', pageId] as const,
};
