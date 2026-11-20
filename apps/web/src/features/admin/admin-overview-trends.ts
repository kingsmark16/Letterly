import type { AdminOverviewBucket } from "@letterly/contracts/admin-overview";

type Series = {
  key: keyof Omit<AdminOverviewBucket, "date" | "available" | "partial">;
  label: string;
};

export const trends = [
  {
    title: "Creator signups",
    series: [{ key: "creatorSignups", label: "Creator signups" }],
  },
  {
    title: "Page creation and publishing",
    series: [
      { key: "pagesCreated", label: "Pages created" },
      { key: "publishActions", label: "Publish actions" },
    ],
  },
  {
    title: "Page views and daily visits",
    series: [
      { key: "pageViews", label: "Page views" },
      { key: "dailyPageVisits", label: "Daily page visits" },
    ],
  },
] satisfies { title: string; series: Series[] }[];

export type OverviewTrend = { title: string; series: Series[] };
export const exactCount = new Intl.NumberFormat("en-US");
export const chartColors = ["#1d4ed8", "#944313"] as const;
export const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
export const fullDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});
