"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminOverviewBucket } from "@letterly/contracts/admin-overview";
import {
  chartColors,
  exactCount,
  fullDate,
  shortDate,
  type OverviewTrend,
} from "./admin-overview-trends";

export function OverviewChart({
  buckets,
  trend,
}: {
  buckets: AdminOverviewBucket[];
  trend: OverviewTrend;
}) {
  const ceiling = Math.max(
    1,
    ...buckets.flatMap((bucket) =>
      bucket.available
        ? trend.series.map(({ key }) => Number(bucket[key]))
        : [],
    ),
  );
  const data = buckets.map((bucket) => ({
    date: bucket.date,
    ...Object.fromEntries(
      trend.series.map(({ key }) => [
        key,
        bucket.available ? Number(bucket[key]) / ceiling : null,
      ]),
    ),
  }));

  return (
    <div
      className="mt-4 h-44 w-full min-w-0 sm:h-52"
      data-testid="overview-chart"
      aria-hidden="true"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart
          data={data}
          accessibilityLayer={false}
          margin={{ top: 8, right: 14, bottom: 0, left: 14 }}
        >
          <CartesianGrid vertical={false} stroke="var(--admin-divider)" />
          <XAxis
            dataKey="date"
            tickFormatter={(date: string) => shortDate.format(new Date(date))}
            tick={{ fill: "#526071", fontSize: 12 }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis hide domain={[0, 1]} />
          <Tooltip
            content={({ active, label }) => {
              const bucket = buckets.find(({ date }) => date === label);
              if (!active || !bucket) return null;
              return (
                <div className="rounded-md border border-input bg-surface p-3 text-sm">
                  <p className="font-semibold">
                    {fullDate.format(new Date(bucket.date))} UTC
                    {bucket.partial ? " · Partial day" : ""}
                  </p>
                  {bucket.available ? (
                    trend.series.map(({ key, label }) => (
                      <p key={key}>
                        {label}: {exactCount.format(BigInt(bucket[key]))}
                      </p>
                    ))
                  ) : (
                    <p>Before coverage</p>
                  )}
                </div>
              );
            }}
          />
          {trend.series.map(({ key, label }, index) => (
            <Line
              key={key}
              name={label}
              dataKey={key}
              stroke={chartColors[index]}
              strokeWidth={2}
              strokeDasharray={index === 1 ? "5 4" : undefined}
              dot={buckets.filter((bucket) => bucket.available).length === 1}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
