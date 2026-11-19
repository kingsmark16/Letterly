"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import {
  adminOverviewQuerySchema,
  adminOverviewResponseSchema,
  type AdminOverview,
  type AdminOverviewPeriod,
} from "@letterly/contracts/admin-overview";
import { apiClient, request } from "@/lib/api/transport";
import {
  chartColors,
  exactCount,
  fullDate,
  trends,
  type OverviewTrend,
} from "./admin-overview-trends";
import styles from "./admin-theme.module.css";

const Chart = dynamic(
  () =>
    import("./admin-overview-chart").then(({ OverviewChart }) => OverviewChart),
  {
    ssr: false,
    loading: () => <div className="h-44 sm:h-52" aria-hidden="true" />,
  },
);
const periods = [7, 30, 90] as const;
const utcTimestamp = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function Count({ value }: { value: string }) {
  return (
    <span className="break-all tabular-nums">
      {exactCount.format(BigInt(value))}
    </span>
  );
}

function Workload({ workload }: Pick<AdminOverview, "workload">) {
  const entries = [
    {
      name: "Open reports",
      count: workload.openReports,
      href: "/admin/moderation/reports?status=OPEN",
    },
    {
      name: "Requested appeals",
      count: workload.requestedAppeals,
      href: "/admin/moderation/appeals?status=REQUESTED",
    },
    {
      name: "Unfinished deletions",
      count: workload.unfinishedDeletions,
      href: "/admin/deletions",
    },
    {
      name: "Deletions needing attention",
      count: workload.deletionsNeedingAttention,
      href: "/admin/deletions?state=NEEDS_ATTENTION",
    },
  ];
  return (
    <section className={styles.panel} aria-labelledby="workload-title">
      <h2 id="workload-title" className="text-xl font-semibold">
        Work needing attention
      </h2>
      <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        {entries.map(({ name, count, href }) => (
          <li
            key={name}
            className="border-t border-[var(--admin-divider)] pt-3"
          >
            <p className="text-2xl font-semibold">
              <Count value={count} />
            </p>
            <Link
              className="inline-flex min-h-11 items-center text-wine underline"
              href={href}
            >
              {name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PlatformTotals({
  creators,
  pages,
}: Pick<AdminOverview, "creators" | "pages">) {
  const names = {
    DRAFT: "Draft",
    PUBLISHED: "Published",
    UNPUBLISHED: "Unpublished",
    ARCHIVED: "Archived",
  };
  return (
    <section className={styles.panel} aria-labelledby="platform-totals-title">
      <h2 id="platform-totals-title" className="text-xl font-semibold">
        Current platform totals
      </h2>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        {[
          { label: "Creators", totals: creators },
          { label: "Pages", totals: pages },
        ].map(({ label, totals }) => (
          <div
            key={label}
            className="border-t border-[var(--admin-divider)] pt-3"
          >
            <h3 className="font-semibold">{label}</h3>
            <p className="mt-1 text-2xl font-semibold">
              <Count value={totals.total} />
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              <Count value={totals.active} /> active ·{" "}
              <Count value={totals.disabled} /> disabled
            </p>
          </div>
        ))}
      </div>
      <table className="mt-6 w-full table-fixed text-left text-sm">
        <caption className="pb-2 text-left font-semibold">
          Pages by publication state
        </caption>
        <thead>
          <tr className="border-b border-[var(--admin-divider)]">
            <th scope="col" className="w-2/5 py-2">
              Publication state
            </th>
            <th scope="col">Active</th>
            <th scope="col">Disabled</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(pages.byPublication).map(([state, counts]) => (
            <tr
              key={state}
              className="border-b border-[var(--admin-divider)] last:border-b-0"
            >
              <th scope="row" className="py-2 pr-2 font-medium">
                {names[state as keyof typeof names]}
              </th>
              <td className="px-1">
                <Count value={counts.active} />
              </td>
              <td className="px-1">
                <Count value={counts.disabled} />
              </td>
              <td className="px-1">
                <Count value={counts.total} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TrendPanel({
  trend,
  buckets,
}: {
  trend: OverviewTrend;
  buckets: AdminOverview["buckets"];
}) {
  const covered = buckets.filter((bucket) => bucket.available);
  return (
    <section className={styles.panel} aria-label={trend.title}>
      <h3 className="text-lg font-semibold">{trend.title}</h3>
      <ul aria-label="Chart legend" className="mt-3 flex flex-wrap gap-4">
        {trend.series.map(({ key, label }, index) => {
          const total = covered.reduce(
            (sum, row) => sum + BigInt(row[key]),
            0n,
          );
          return (
            <li key={key} className="min-w-0">
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <span
                  aria-hidden="true"
                  className="w-5 border-t-2"
                  style={{
                    borderColor: chartColors[index],
                    borderTopStyle: index ? "dashed" : "solid",
                  }}
                />
                {label}
              </p>
              <p className="mt-1 text-xl font-semibold">
                {exactCount.format(total)}
              </p>
            </li>
          );
        })}
      </ul>
      <Chart trend={trend} buckets={buckets} />
      <details className="mt-4 border-t border-[var(--admin-divider)] pt-1">
        <summary className="min-h-11 cursor-pointer py-3 font-semibold">
          View daily data
        </summary>
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">
            {trend.title}, exact daily counts in UTC
          </caption>
          <thead>
            <tr className="border-b border-[var(--admin-divider)]">
              <th scope="col" className="w-2/5 py-2">
                Date (UTC)
              </th>
              {trend.series.map(({ key, label }) => (
                <th className="p-1" key={key} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr
                key={bucket.date}
                className="border-b border-[var(--admin-divider)] last:border-b-0"
              >
                <th scope="row" className="py-2 pr-2 font-medium">
                  <time dateTime={bucket.date}>
                    {fullDate.format(new Date(bucket.date))}
                  </time>
                  {bucket.partial ? (
                    <span className="block text-xs text-ink-muted">
                      Partial day
                    </span>
                  ) : null}
                </th>
                {trend.series.map(({ key }) => (
                  <td className="p-1" key={key}>
                    {bucket.available ? (
                      <Count value={bucket[key]} />
                    ) : (
                      "Unavailable"
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}

export function AdminOverviewConsole() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.getAll("period");
  const parsed = adminOverviewQuerySchema.safeParse({
    period: raw.length > 1 ? raw : raw[0],
  });
  const period = parsed.success ? parsed.data.period : 30;
  const query = useQuery({
    queryKey: ["admin-overview", period],
    enabled: parsed.success,
    queryFn: ({ signal }) =>
      request(
        () => apiClient.get("/admin/overview", { params: { period }, signal }),
        adminOverviewResponseSchema,
      ),
    retry: false,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
  const data = query.data;
  const selectPeriod = (next: AdminOverviewPeriod) => {
    router.replace(`${pathname}?period=${next}`, { scroll: false });
  };

  return (
    <main
      id="main-content"
      className="mx-auto grid w-full min-w-0 max-w-7xl gap-6 p-4 md:p-6 lg:p-8"
    >
      <header>
        <h1 className="text-3xl font-semibold">Overview</h1>
        {data && !query.error ? (
          <p className="mt-2 text-sm text-ink-muted">
            As of{" "}
            <time dateTime={data.asOf}>
              {utcTimestamp.format(new Date(data.asOf))} UTC
            </time>
          </p>
        ) : null}
      </header>
      {!parsed.success ? (
        <section className={styles.panel} role="alert">
          <p>Choose a supported activity period.</p>
          <Button className="mt-4" onClick={() => selectPeriod(30)}>
            Show 30 days
          </Button>
        </section>
      ) : query.error ? (
        <section className={styles.panel} role="alert">
          <h2 className="text-xl font-semibold">Could not load the overview</h2>
          <p className="mt-2">Try again to refresh workload and activity.</p>
          <Button
            className="mt-4"
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            Retry overview
          </Button>
        </section>
      ) : !data ? (
        <p className={styles.panel} role="status" aria-busy="true">
          Loading overview…
        </p>
      ) : (
        <>
          <Workload workload={data.workload} />
          <PlatformTotals creators={data.creators} pages={data.pages} />
          <section
            className="grid min-w-0 gap-4"
            aria-labelledby="activity-title"
          >
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="activity-title" className="text-xl font-semibold">
                  Activity trends
                </h2>
                <p className="mt-2 max-w-prose text-sm text-ink-muted">
                  Daily visits count a browser once per page each UTC day. Views
                  include repeat visits.
                </p>
              </div>
              <div
                role="group"
                aria-label="Activity period"
                className="flex flex-wrap gap-2"
              >
                {periods.map((days) => (
                  <Button
                    key={days}
                    type="button"
                    variant={days === period ? "primary" : "secondary"}
                    aria-pressed={days === period}
                    onClick={() => selectPeriod(days)}
                  >
                    {days} days
                  </Button>
                ))}
              </div>
            </header>
            {data.coverageStartedAt ? (
              <>
                <p className="text-sm text-ink-muted">
                  Coverage began{" "}
                  <time dateTime={data.coverageStartedAt}>
                    {utcTimestamp.format(new Date(data.coverageStartedAt))} UTC
                  </time>
                  . Today and the first coverage day are partial. Totals use the
                  available days in this period.
                </p>
                {trends.map((trend) => (
                  <TrendPanel
                    key={trend.title}
                    trend={trend}
                    buckets={data.buckets}
                  />
                ))}
              </>
            ) : (
              <p className={styles.panel} role="status">
                History is unavailable until activity capture starts.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
