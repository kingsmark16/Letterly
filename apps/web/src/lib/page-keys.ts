export const pageKeys = {
  all: ["pages"] as const,
  list: (creatorId: string) => ["pages", "list", creatorId] as const,
  detail: (pageId: string) => ["pages", "detail", pageId] as const,
  submissions: (pageId: string, filter: "all" | "unread") =>
    ["pages", "submissions", pageId, filter] as const,
};
