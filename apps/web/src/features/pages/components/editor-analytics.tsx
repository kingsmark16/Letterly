"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OwnerPageProjection } from "@letterly/contracts/pages";
import type { PageAnalyticsPeriod } from "@letterly/contracts/analytics";
import type {
  OwnerSubmissionDetail,
  OwnerSubmissionSummary,
} from "@letterly/contracts/submissions";
import Link from "next/link";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../../../components/ui/chart";
import {
  getPageAnalytics,
  listSubmissions,
  markSubmissionRead,
  WebApiError,
} from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import styles from "./editor-analytics.module.css";
import { SubmissionResponseDialog } from "./submission-response-dialog";

const chartConfig = {
  views: { label: "Views", color: "#0072b2" },
  visitors: { label: "Visitors", color: "#b36b00" },
  responses: { label: "Responses", color: "#00845a" },
} satisfies ChartConfig;

const timeChartConfig = {
  averageActiveSeconds: {
    label: "Avg. visible time",
    color: "var(--letterly-wine)",
  },
} satisfies ChartConfig;

const RECENT_RESPONSE_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

function ResponsePlaceholderRows(): React.JSX.Element {
  return (
    <div aria-hidden="true" className={styles.replyList}>
      {[0, 1, 2].map((row) => (
        <div key={row} className={styles.loadingReply}>
          <div className={styles.loadingReplyText}>
            <span
              className={`${styles.skeleton} ${styles.skeletonReplyTitle}`}
            />
            <span
              className={`${styles.skeleton} ${styles.skeletonReplyDetail}`}
            />
          </div>
          <span className={`${styles.skeleton} ${styles.skeletonReplyDate}`} />
        </div>
      ))}
    </div>
  );
}

function ResponseLoading(): React.JSX.Element {
  return (
    <div className={styles.loadingResponses} aria-busy="true">
      <p className={styles.loadingMessage} role="status">
        <span className={styles.loadingSpinner} aria-hidden="true" />
        Loading responses...
      </p>
      <ResponsePlaceholderRows />
    </div>
  );
}

function ActivityLoading(): React.JSX.Element {
  return (
    <div
      className={styles.loadingOverview}
      aria-busy="true"
      aria-label="Loading overview activity"
    >
      <p className={styles.loadingMessage} role="status">
        <span className={styles.loadingSpinner} aria-hidden="true" />
        Loading activity...
      </p>
      <div aria-hidden="true">
        <div className={styles.stats}>
          {["Views", "Visitors", "Responses", "Unread"].map((label) => (
            <div className={styles.stat} key={label}>
              <span>{label}</span>
              <span className={`${styles.skeleton} ${styles.skeletonValue}`} />
              <span
                className={`${styles.skeleton} ${styles.skeletonCaption}`}
              />
            </div>
          ))}
        </div>
        <div className={styles.contentGrid}>
          {["Activity", "Visible time"].map((title) => (
            <div className={styles.activity} key={title}>
              <div className={styles.sectionHeading}>
                <div>
                  <h3>{title}</h3>
                  <span
                    className={`${styles.skeleton} ${styles.skeletonDescription}`}
                  />
                </div>
              </div>
              <div className={styles.skeletonLegend}>
                <span className={styles.skeleton} />
                <span className={styles.skeleton} />
                <span className={styles.skeleton} />
              </div>
              <div className={`${styles.skeleton} ${styles.skeletonChart}`} />
            </div>
          ))}
          <div className={styles.replies}>
            <div className={styles.sectionHeading}>
              <h3>Recent responses</h3>
            </div>
            <span
              className={`${styles.skeleton} ${styles.skeletonDescription}`}
            />
            <ResponsePlaceholderRows />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatResponseDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeResponseDate(value: string): string {
  const difference = Date.now() - new Date(value).getTime();
  const isFuture = difference < 0;
  const elapsedSeconds = Math.floor(Math.abs(difference) / 1000);
  if (elapsedSeconds < 60) return isFuture ? "in a moment" : "just now";

  const units = [
    { seconds: 31_536_000, label: "year" },
    { seconds: 2_592_000, label: "month" },
    { seconds: 604_800, label: "week" },
    { seconds: 86_400, label: "day" },
    { seconds: 3_600, label: "hr" },
    { seconds: 60, label: "min" },
  ];
  const unit = units.find(({ seconds }) => elapsedSeconds >= seconds);
  if (!unit) return "just now";

  const amount = Math.floor(elapsedSeconds / unit.seconds);
  const relative = `${amount} ${unit.label}${unit.label.length > 2 && amount !== 1 ? "s" : ""}`;
  return isFuture ? `in ${relative}` : `${relative} ago`;
}

function formatActiveTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function EditorAnalytics({
  page,
  active,
}: {
  page: OwnerPageProjection;
  active: boolean;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [days, setDays] = useState<PageAnalyticsPeriod>(30);
  const [replyFilter, setReplyFilter] = useState<"all" | "unread">("all");
  const [selectedResponse, setSelectedResponse] =
    useState<OwnerSubmissionSummary | null>(null);
  const analyticsQuery = useQuery({
    queryKey: pageKeys.analytics(page.id, days),
    queryFn: () => getPageAnalytics(page.id, days),
    enabled: active,
  });
  const submissionsQuery = useQuery({
    queryKey: pageKeys.submissions(page.id, replyFilter),
    queryFn: () => listSubmissions(page.id, { filter: replyFilter, size: 5 }),
    enabled: active,
  });
  const markReadMutation = useMutation({
    mutationFn: (submissionId: string) =>
      markSubmissionRead(page.id, submissionId),
    onSuccess: (_result, submissionId) => {
      setSelectedResponse((current) =>
        current?.id === submissionId
          ? { ...current, readState: "READ" }
          : current,
      );
      queryClient.setQueryData<OwnerSubmissionDetail>(
        ["submission", page.id, submissionId],
        (detail) => (detail ? { ...detail, readState: "READ" } : detail),
      );
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissions(page.id, "all"),
      });
      void queryClient.invalidateQueries({
        queryKey: pageKeys.submissions(page.id, "unread"),
      });
      void queryClient.invalidateQueries({
        queryKey: ["pages", "analytics", page.id],
      });
    },
  });
  const inboxPath = `/dashboard/pages/${page.id}/responses`;
  const filteredInboxPath =
    replyFilter === "unread" ? `${inboxPath}?filter=unread` : inboxPath;
  const analytics = analyticsQuery.data;
  const now = Date.now();
  const recentResponseCutoff = now - RECENT_RESPONSE_WINDOW_MS;
  const responses = submissionsQuery.data?.items ?? [];
  const recentResponses = responses.filter((response) => {
    const submittedAt = Date.parse(response.submittedAt);
    return (
      Number.isFinite(submittedAt) &&
      submittedAt >= recentResponseCutoff &&
      submittedAt <= now
    );
  });
  const selectedReadStatus = selectedResponse
    ? selectedResponse.readState === "READ"
      ? "read"
      : markReadMutation.isPending &&
          markReadMutation.variables === selectedResponse.id
        ? "pending"
        : markReadMutation.isError &&
            markReadMutation.variables === selectedResponse.id
          ? "error"
          : "unread"
    : null;
  const selectedReadError =
    selectedReadStatus === "error"
      ? markReadMutation.error instanceof WebApiError
        ? markReadMutation.error.message
        : "We could not mark this response as read. Please try again."
      : null;

  function openResponse(response: OwnerSubmissionSummary): void {
    setSelectedResponse(response);
    if (response.readState === "UNREAD") {
      markReadMutation.mutate(response.id);
    }
  }

  return (
    <div className={styles.overview}>
      <header className={styles.heading}>
        <div>
          <h2>Overview</h2>
          <p>See how people are reading and responding to your letter.</p>
        </div>
        <div
          className={styles.filter}
          role="group"
          aria-label="Activity period"
        >
          {([7, 30, 90] as const).map((period) => (
            <button
              key={period}
              type="button"
              aria-pressed={days === period}
              onClick={() => setDays(period)}
            >
              {period} days
            </button>
          ))}
        </div>
      </header>

      {analyticsQuery.isPending ? (
        <ActivityLoading />
      ) : analyticsQuery.isError ? (
        <div className={styles.state} role="alert">
          <strong>Activity could not be loaded.</strong>
          <span>{(analyticsQuery.error as WebApiError).message}</span>
          <button type="button" onClick={() => void analyticsQuery.refetch()}>
            Try again
          </button>
        </div>
      ) : analytics ? (
        <>
          <section className={styles.stats} aria-label="Letter activity totals">
            <div className={styles.stat}>
              <span>Views</span>
              <strong>{analytics.views.toLocaleString()}</strong>
              <small>Letter opens · last {days} days</small>
            </div>
            <div className={styles.stat}>
              <span>Visitors</span>
              <strong>{analytics.visitors.toLocaleString()}</strong>
              <small>Unique browsers · last {days} days</small>
            </div>
            <div className={styles.stat}>
              <span>Responses</span>
              <strong>{analytics.totalResponses.toLocaleString()}</strong>
              <small>Last {days} days</small>
            </div>
            <div className={styles.stat}>
              <span>Unread</span>
              <strong>{analytics.unreadResponses.toLocaleString()}</strong>
              <small>All time</small>
            </div>
          </section>

          <div className={styles.contentGrid}>
            <section
              className={styles.activity}
              aria-labelledby="activity-title"
            >
              <div className={styles.sectionHeading}>
                <div>
                  <h3 id="activity-title">Activity</h3>
                  <p>
                    Letter opens, visitors, and replies over the last {days}{" "}
                    days
                  </p>
                </div>
              </div>
              <div className={styles.legend} aria-hidden="true">
                <span>
                  <i className={styles.viewKey} /> Views
                </span>
                <span>
                  <i className={styles.visitorKey} /> Visitors
                </span>
                <span>
                  <i className={styles.responseKey} /> Responses
                </span>
              </div>
              {analytics.views === 0 &&
              analytics.activity.every((day) => day.responses === 0) ? (
                <p className={styles.emptyChart}>
                  Activity will appear here as people open and respond to your
                  letter.
                </p>
              ) : (
                <ChartContainer config={chartConfig} className={styles.chart}>
                  <AreaChart
                    accessibilityLayer
                    data={analytics.activity}
                    margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--letterly-border)"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDay}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={25}
                      fontSize={11}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => formatDay(String(label))}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="views"
                      stroke="var(--color-views)"
                      fill="var(--color-views)"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      stroke="var(--color-visitors)"
                      fillOpacity={0}
                      strokeWidth={2}
                      strokeDasharray="6 3"
                    />
                    <Area
                      type="monotone"
                      dataKey="responses"
                      stroke="var(--color-responses)"
                      fillOpacity={0}
                      strokeWidth={2}
                      strokeDasharray="2 3"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </section>

            <section className={styles.timePanel} aria-labelledby="time-title">
              <div className={styles.sectionHeading}>
                <div>
                  <h3 id="time-title">Time on page</h3>
                  <p>Daily visible time · last {days} days</p>
                </div>
                <div className={styles.timeSummary}>
                  <strong>
                    {analytics.averageActiveSeconds === null
                      ? "—"
                      : formatActiveTime(analytics.averageActiveSeconds)}
                  </strong>
                  <small>Overall average</small>
                </div>
              </div>
              <div className={styles.legend} aria-hidden="true">
                <span>
                  <i className={styles.timeKey} /> Daily average
                </span>
              </div>
              {analytics.measuredViews === 0 ? (
                <p className={styles.emptyChart}>
                  Time on page will appear after a reader spends at least one
                  second with the letter open.
                </p>
              ) : (
                <ChartContainer
                  config={timeChartConfig}
                  className={styles.chart}
                >
                  <LineChart
                    accessibilityLayer
                    data={analytics.activity}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      vertical={false}
                      stroke="var(--letterly-border)"
                    />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDay}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={25}
                      fontSize={11}
                    />
                    <YAxis
                      allowDecimals={false}
                      tickFormatter={formatActiveTime}
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) => formatDay(String(label))}
                          formatter={(value) => formatActiveTime(Number(value))}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="averageActiveSeconds"
                      stroke="var(--color-averageActiveSeconds)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </section>

            <section className={styles.replies} aria-labelledby="replies-title">
              <div className={styles.sectionHeading}>
                <div>
                  <h3 id="replies-title">Recent responses</h3>
                  <p>
                    Replies from the past five days. Only you can read them.
                  </p>
                </div>
                <Link href={filteredInboxPath}>
                  See all <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div
                className={styles.filter}
                role="group"
                aria-label="Filter recent responses"
              >
                {(["all", "unread"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    aria-pressed={replyFilter === filter}
                    onClick={() => setReplyFilter(filter)}
                  >
                    {filter === "all" ? "All" : "Unread"}
                  </button>
                ))}
              </div>
              {submissionsQuery.isPending ? (
                <ResponseLoading />
              ) : submissionsQuery.isError ? (
                <div className={styles.replyState} role="alert">
                  <strong>Responses could not be loaded.</strong>
                  <button
                    type="button"
                    onClick={() => void submissionsQuery.refetch()}
                  >
                    Try again
                  </button>
                </div>
              ) : recentResponses.length === 0 ? (
                <p className={styles.replyState}>
                  {replyFilter === "unread"
                    ? "No unread responses from the past five days."
                    : responses.length > 0
                      ? "No responses from the past five days."
                      : "No responses yet. New replies will appear here."}
                </p>
              ) : (
                <ul className={styles.replyList}>
                  {recentResponses.map((response) => (
                    <li key={response.id}>
                      <button
                        type="button"
                        onClick={() => openResponse(response)}
                        className={styles.replyLink}
                      >
                        <span className={styles.replyText}>
                          <strong>Anonymous response</strong>
                          <span>
                            {response.answerCount}{" "}
                            {response.answerCount === 1 ? "answer" : "answers"}
                            {response.hasVisitorMessage
                              ? " · private message"
                              : ""}
                          </span>
                        </span>
                        <span className={styles.replyMeta}>
                          {response.readState === "UNREAD" ? (
                            <em>Unread</em>
                          ) : null}
                          <time
                            dateTime={response.submittedAt}
                            title={formatResponseDate(response.submittedAt)}
                            aria-label={formatResponseDate(
                              response.submittedAt,
                            )}
                          >
                            {formatRelativeResponseDate(response.submittedAt)}
                          </time>
                        </span>
                        <span className={styles.replyArrow} aria-hidden="true">
                          →
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      ) : null}
      <SubmissionResponseDialog
        pageId={page.id}
        responseId={selectedResponse?.id ?? null}
        readStatus={selectedReadStatus}
        readError={selectedReadError}
        onRetryRead={() => {
          if (selectedResponse) {
            markReadMutation.mutate(selectedResponse.id);
          }
        }}
        onClose={() => setSelectedResponse(null)}
      />
    </div>
  );
}
