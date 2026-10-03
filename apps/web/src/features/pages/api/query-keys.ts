export const pageKeys = {
  all: ["pages"] as const,
  list: (creatorId: string) => ["pages", "list", creatorId] as const,
  detail: (pageId: string) => ["pages", "detail", pageId] as const,
  analytics: (pageId: string, days: 7 | 30 | 90) =>
    ["pages", "analytics", pageId, days] as const,
  submissions: (pageId: string, filter: "all" | "unread") =>
    ["pages", "submissions", pageId, filter] as const,
  submissionFeed: (pageId: string, filter: "all" | "unread") =>
    ["pages", "submission-feed", pageId, filter] as const,
};
