"use client";

import type {
  CategoryCatalogItem,
  TemplateCatalogItem,
} from "@letterly/contracts/catalog";
import type { PageSummary } from "@letterly/contracts/pages";
import type { OwnerSubmissionSummary } from "@letterly/contracts/submissions";
import Link from "next/link";
import type { ReactNode } from "react";
import { TemplatePreviewDialog } from "../../../components/template-preview-dialog";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { capabilityLabels, getTemplateIntro } from "../../catalog/catalog-copy";
import { createTemplateStartPath } from "../../../lib/return-path";
import { DashboardMotion } from "./dashboard-motion";
import { DashboardIcon } from "./dashboard-icons";

export type DashboardCatalog = {
  categories: CategoryCatalogItem[];
  templates: TemplateCatalogItem[];
};

export type RecentResponse = OwnerSubmissionSummary & {
  pageId: string;
  pageTitle: string;
};

type DashboardStatus = PageSummary["status"];

export type DashboardOverviewProps = {
  catalog: DashboardCatalog;
  catalogError: boolean;
  displayName: string;
  onRetryPages: () => void;
  onRetryResponses: () => void;
  pages: PageSummary[];
  pagesErrorMessage: string | null;
  pagesPending: boolean;
  recentResponses: RecentResponse[];
  responseQueriesError: boolean;
  responseQueriesPending: boolean;
};

const statusCopy: Record<DashboardStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  UNPUBLISHED: "Unpublished",
  ARCHIVED: "Archived",
};

const statusClasses: Record<DashboardStatus, string> = {
  DRAFT: "text-warning",
  PUBLISHED: "text-olive",
  UNPUBLISHED: "text-ink-muted",
  ARCHIVED: "text-error",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function pluralize(
  value: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return value === 1 ? singular : plural;
}

function getCategoryName(
  categories: CategoryCatalogItem[],
  categoryKey: string,
): string {
  return (
    categories.find((category) => category.key === categoryKey)?.name ??
    "Letterly"
  );
}

function PageStatus({
  status,
}: {
  status: DashboardStatus;
}): React.JSX.Element {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-label font-bold ${statusClasses[status]}`}
    >
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-round ${status === "PUBLISHED" ? "bg-olive" : status === "ARCHIVED" ? "bg-error" : status === "DRAFT" ? "bg-warning" : "bg-ink-muted"}`}
      />
      {statusCopy[status]}
    </span>
  );
}

function SectionHeading({
  action,
  eyebrow,
  id,
  title,
}: {
  action?: ReactNode;
  eyebrow: string;
  id: string;
  title: string;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
          {eyebrow}
        </p>
        <h2
          className="mt-1.5 font-display text-heading-2 font-semibold tracking-[-0.055em]"
          id={id}
        >
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

function DashboardOverviewHeader({
  displayName,
}: {
  displayName: string;
}): React.JSX.Element {
  return (
    <header
      className="flex flex-wrap items-end justify-between gap-5"
      data-dashboard-reveal
      id="dashboard-overview"
    >
      <div className="max-w-[38rem]">
        <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
          Overview
        </p>
        <h1 className="mt-1.5 font-display text-balance text-heading-1 font-semibold tracking-[-0.06em]">
          Welcome back, {displayName}.
        </h1>
        <p className="mt-2 text-small text-ink-muted">
          Choose what to work on next.
        </p>
      </div>
      <Button
        asChild
        className="!min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-4 !text-small !font-bold !text-surface hover:!bg-wine-hover"
        size="lg"
      >
        <Link href="/templates">
          <DashboardIcon className="size-4" name="plus" />
          Create a page
        </Link>
      </Button>
    </header>
  );
}

function PaperPreview({ recipientLabel }: { recipientLabel: string }) {
  return (
    <div
      aria-hidden="true"
      className="relative min-h-48 overflow-hidden bg-surface-muted sm:min-h-56"
    >
      <div className="absolute inset-x-8 top-8 rotate-[-4deg] rounded-medium bg-surface p-5 shadow-low sm:inset-x-12 sm:top-10 sm:p-6">
        <span className="block h-1.5 w-14 rounded-round bg-rose/60" />
        <span className="mt-5 block truncate font-display text-heading-3 font-semibold tracking-[-0.04em] text-ink">
          {recipientLabel}
        </span>
        <span className="mt-4 block h-1.5 w-24 rounded-round bg-wine/20" />
        <span className="mt-2 block h-1.5 w-36 max-w-full rounded-round bg-border/70" />
        <div className="mt-6 flex items-center justify-between text-label text-ink-muted">
          <span>Letterly</span>
          <DashboardIcon className="size-4 text-rose" name="heart" />
        </div>
      </div>
    </div>
  );
}

function ContinuePageCard({
  errorMessage,
  isError,
  isPending,
  onRetry,
  page,
}: {
  errorMessage: string | null;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  page?: PageSummary;
}): React.JSX.Element {
  if (isPending) {
    return (
      <section
        aria-busy="true"
        aria-label="Continue working on your latest page"
        data-dashboard-reveal
      >
        <div className="grid overflow-hidden rounded-large bg-surface shadow-low lg:grid-cols-[minmax(0,1.1fr)_minmax(15rem,0.8fr)]">
          <div className="grid content-center gap-4 p-6 sm:p-8">
            <span className="h-3 w-28 animate-pulse rounded-round bg-surface-muted motion-reduce:animate-none" />
            <span className="h-10 w-4/5 animate-pulse rounded-small bg-surface-muted motion-reduce:animate-none" />
            <span className="h-4 w-2/5 animate-pulse rounded-round bg-surface-muted motion-reduce:animate-none" />
            <p className="sr-only" role="status">
              Finding your latest page.
            </p>
          </div>
          <div className="min-h-48 animate-pulse bg-surface-muted motion-reduce:animate-none sm:min-h-56" />
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section aria-labelledby="continue-title" data-dashboard-reveal>
        <div
          className="rounded-large border border-error/40 bg-surface-muted p-6 sm:p-8"
          role="alert"
        >
          <p className="text-label font-bold uppercase tracking-[0.12em] text-error">
            Page unavailable
          </p>
          <h2
            className="mt-1.5 font-display text-heading-3 font-semibold"
            id="continue-title"
          >
            We could not find your latest page.
          </h2>
          <p className="mt-2 max-w-[34rem] text-small text-ink-muted">
            {errorMessage ?? "Try again in a moment."}
          </p>
          <Button
            className="mt-4 !min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-4 !text-label !font-bold !text-surface hover:!bg-wine-hover"
            onClick={onRetry}
            size="sm"
            type="button"
          >
            Try again
          </Button>
        </div>
      </section>
    );
  }

  if (!page) {
    return (
      <section aria-labelledby="continue-title" data-dashboard-reveal>
        <div className="grid overflow-hidden rounded-large bg-surface shadow-low lg:grid-cols-[minmax(0,1.1fr)_minmax(15rem,0.8fr)]">
          <div className="grid content-center gap-4 p-6 sm:p-8">
            <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
              Start here
            </p>
            <h2
              className="max-w-[28rem] font-display text-balance text-heading-2 font-semibold leading-[1.05] tracking-[-0.055em]"
              id="continue-title"
            >
              Give your words a place to land.
            </h2>
            <p className="max-w-[32rem] text-small text-ink-muted">
              Choose a template and keep it private while you write.
            </p>
            <div>
              <Button
                asChild
                className="!min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-4 !text-small !font-bold !text-surface hover:!bg-wine-hover"
                size="lg"
              >
                <Link href="/templates">
                  Browse templates
                  <DashboardIcon className="size-4" name="arrow-up-right" />
                </Link>
              </Button>
            </div>
          </div>
          <PaperPreview recipientLabel="A page for someone special" />
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="continue-title" data-dashboard-reveal>
      <Card className="overflow-hidden border-0 bg-surface p-0 shadow-low">
        <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(15rem,0.8fr)]">
          <CardHeader className="grid content-center gap-3 p-6 sm:p-8">
            <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
              Continue writing
            </p>
            <CardTitle
              as="h2"
              className="max-w-[30rem] text-balance text-heading-2 leading-[1.05] tracking-[-0.055em]"
              id="continue-title"
            >
              {page.recipientLabel}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
              <span>{page.template.name}</span>
              <span aria-hidden="true">·</span>
              <PageStatus status={page.status} />
              <span aria-hidden="true">·</span>
              <span>
                Edited <time dateTime={page.updatedAt}>{formatDate(page.updatedAt)}</time>
              </span>
            </CardDescription>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="!min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-4 !text-small !font-bold !text-surface hover:!bg-wine-hover"
                size="lg"
              >
                <Link href={`/dashboard/pages/${page.id}/edit`}>Open editor</Link>
              </Button>
              <Link
                className="inline-flex min-h-[var(--letterly-target-min)] items-center gap-1.5 rounded-small px-2 text-small font-bold text-wine underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-[var(--letterly-motion-fast)] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
                href={`/dashboard/pages/${page.id}/responses`}
              >
                View replies
                <DashboardIcon className="size-3.5" name="arrow-up-right" />
              </Link>
            </div>
          </CardHeader>
          <PaperPreview recipientLabel={page.recipientLabel} />
        </div>
      </Card>
    </section>
  );
}

function PageRow({ page }: { page: PageSummary }): React.JSX.Element {
  return (
    <li>
      <div className="flex flex-col gap-3 rounded-medium px-3 py-3 transition-colors duration-[var(--letterly-motion-fast)] hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-small bg-surface-muted text-wine"
          >
            <DashboardIcon className="size-4" name="pages" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-label font-bold uppercase tracking-[0.11em] text-ink-muted">
              {page.template.name}
            </p>
            <h3 className="mt-0.5 truncate font-display text-heading-3 font-semibold tracking-[-0.04em] text-ink">
              {page.recipientLabel}
            </h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-muted">
              <PageStatus status={page.status} />
              <span aria-hidden="true">·</span>
              <time dateTime={page.updatedAt}>{formatDate(page.updatedAt)}</time>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <Button
            asChild
            className="!min-h-[var(--letterly-target-min)] !rounded-small !bg-surface-muted !px-3 !text-label !font-bold !text-ink hover:!bg-surface hover:!text-wine"
            size="sm"
          >
            <Link href={`/dashboard/pages/${page.id}/edit`}>Open editor</Link>
          </Button>
          <Link
            className="inline-flex min-h-[var(--letterly-target-min)] items-center gap-1.5 rounded-small px-2 text-label font-bold text-wine underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-[var(--letterly-motion-fast)] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            href={`/dashboard/pages/${page.id}/responses`}
          >
            Replies
            <DashboardIcon className="size-3.5" name="arrow-up-right" />
          </Link>
        </div>
      </div>
    </li>
  );
}

function PageListSection({
  errorMessage,
  isError,
  isPending,
  onRetry,
  pages,
}: {
  errorMessage: string | null;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  pages: PageSummary[];
}): React.JSX.Element {
  return (
    <section aria-labelledby="pages-title" data-dashboard-reveal>
      <Card className="border-0 bg-surface p-0 shadow-none">
        <CardHeader className="p-0">
          <SectionHeading
            action={
              <Link
                className="inline-flex min-h-[var(--letterly-target-min)] shrink-0 items-center gap-1.5 rounded-small px-2 text-small font-bold text-wine underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-[var(--letterly-motion-fast)] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
                href="/dashboard/pages"
              >
                View all
                <DashboardIcon className="size-3.5" name="arrow-up-right" />
              </Link>
            }
            eyebrow="Your workspace"
            id="pages-title"
            title="My pages"
          />
        </CardHeader>
        <CardContent className="mt-4 p-0">
          {isPending ? (
            <div aria-busy="true" aria-live="polite" className="grid gap-2">
              {["one", "two", "three"].map((item) => (
                <div className="flex items-center gap-3 px-3 py-3" key={item}>
                  <span className="size-9 animate-pulse rounded-small bg-surface-muted motion-reduce:animate-none" />
                  <span className="grid flex-1 gap-2">
                    <span className="h-3 w-1/4 animate-pulse rounded-round bg-surface-muted motion-reduce:animate-none" />
                    <span className="h-5 w-2/5 animate-pulse rounded-small bg-surface-muted motion-reduce:animate-none" />
                  </span>
                </div>
              ))}
              <p className="sr-only" role="status">
                Finding your latest pages.
              </p>
            </div>
          ) : isError ? (
            <div
              className="rounded-medium border border-error/40 bg-surface-muted p-5"
              role="alert"
            >
              <p className="text-label font-bold uppercase tracking-[0.12em] text-error">
                Pages unavailable
              </p>
              <h3 className="mt-1.5 font-display text-heading-3 font-semibold">
                We could not load your pages.
              </h3>
              <p className="mt-2 text-small text-ink-muted">
                {errorMessage ?? "Try again in a moment."}
              </p>
              <Button
                className="mt-4 !min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-3 !text-label !font-bold !text-surface hover:!bg-wine-hover"
                onClick={onRetry}
                size="sm"
                type="button"
              >
                Try again
              </Button>
            </div>
          ) : pages.length === 0 ? (
            <div className="rounded-medium bg-surface-muted p-5">
              <div className="grid size-9 place-items-center rounded-round bg-rose/20 text-wine">
                <DashboardIcon className="size-4" name="pen" />
              </div>
              <h3 className="mt-4 font-display text-heading-3 font-semibold tracking-[-0.04em]">
                No pages yet.
              </h3>
              <p className="mt-1.5 text-small text-ink-muted">
                Start with a template when you are ready.
              </p>
              <Button
                asChild
                className="mt-4 !min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-4 !text-small !font-bold !text-surface hover:!bg-wine-hover"
                size="lg"
              >
                <Link href="/templates">Browse templates</Link>
              </Button>
            </div>
          ) : (
            <ul aria-label="Your latest pages" className="grid gap-1">
              {pages.slice(0, 4).map((page) => (
                <PageRow key={page.id} page={page} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function ResponseRow({
  response,
}: {
  response: RecentResponse;
}): React.JSX.Element {
  const isUnread = response.readState === "UNREAD";
  const responseLabel = isUnread ? "Unread reply" : "Read reply";

  return (
    <li>
      <Link
        className="group flex min-h-[var(--letterly-target-min)] items-start gap-3 rounded-medium px-3 py-3 transition-colors duration-[var(--letterly-motion-fast)] hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
        href={`/dashboard/pages/${response.pageId}/responses?selected=${encodeURIComponent(response.id)}`}
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-round ${isUnread ? "bg-wine text-surface" : "bg-surface-muted text-ink-muted"}`}
        >
          <DashboardIcon className="size-4" name="inbox" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span
              className={`text-small font-bold ${isUnread ? "text-wine" : "text-ink"}`}
            >
              {responseLabel}
            </span>
            <time
              className="text-label text-ink-muted"
              dateTime={response.submittedAt}
            >
              {formatDate(response.submittedAt)}
            </time>
          </span>
          <span className="mt-0.5 block truncate text-small text-ink-muted">
            {response.pageTitle}
          </span>
          <span className="mt-0.5 block text-label text-ink-muted">
            {response.answerCount} {pluralize(response.answerCount, "answer")}
            {response.hasVisitorMessage ? " · Private message" : ""}
          </span>
        </span>
        <DashboardIcon
          className="mt-1 size-4 shrink-0 text-ink-muted transition-transform duration-[var(--letterly-motion-fast)] group-hover:translate-x-0.5 group-hover:text-wine"
          name="arrow-up-right"
        />
      </Link>
    </li>
  );
}

function ResponseListSection({
  hasPages,
  isError,
  isPending,
  onRetry,
  recentResponses,
}: {
  hasPages: boolean;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  recentResponses: RecentResponse[];
}): React.JSX.Element {
  return (
    <section
      aria-labelledby="recent-responses-title"
      data-dashboard-reveal
      id="recent-responses"
    >
      <Card className="border-0 bg-surface-muted p-0 shadow-none">
        <CardHeader className="p-5 sm:p-6">
          <SectionHeading
            eyebrow="Your inbox"
            id="recent-responses-title"
            title="Recent replies"
          />
        </CardHeader>
        <CardContent className="p-5 pt-0 sm:p-6 sm:pt-0">
          {isPending ? (
            <div aria-busy="true" aria-live="polite" className="grid gap-2">
              {["one", "two"].map((item) => (
                <div
                  className="flex items-center gap-3 rounded-medium bg-surface p-3"
                  key={item}
                >
                  <span className="size-8 animate-pulse rounded-round bg-border motion-reduce:animate-none" />
                  <span className="grid flex-1 gap-2">
                    <span className="h-4 w-1/3 animate-pulse rounded-round bg-border motion-reduce:animate-none" />
                    <span className="h-3 w-2/3 animate-pulse rounded-round bg-border motion-reduce:animate-none" />
                  </span>
                </div>
              ))}
              <p className="sr-only" role="status">
                Checking for recent replies.
              </p>
            </div>
          ) : isError && recentResponses.length === 0 ? (
            <div
              className="rounded-medium border border-error/40 bg-surface p-4"
              role="alert"
            >
              <p className="text-label font-bold uppercase tracking-[0.12em] text-error">
                Replies unavailable
              </p>
              <h3 className="mt-1.5 font-display text-heading-3 font-semibold">
                We could not check your replies.
              </h3>
              <p className="mt-1.5 text-small text-ink-muted">
                Try loading your replies again.
              </p>
              <Button
                className="mt-4 !min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-3 !text-label !font-bold !text-surface hover:!bg-wine-hover"
                onClick={onRetry}
                size="sm"
                type="button"
              >
                Try again
              </Button>
            </div>
          ) : recentResponses.length === 0 ? (
            <div className="rounded-medium bg-surface p-4">
              <div className="grid size-8 place-items-center rounded-round bg-rose/20 text-wine">
                <DashboardIcon className="size-4" name="inbox" />
              </div>
              <h3 className="mt-3 font-display text-heading-3 font-semibold tracking-[-0.04em]">
                No replies yet.
              </h3>
              <p className="mt-1.5 text-small text-ink-muted">
                {hasPages
                  ? "Visitor replies will appear here."
                  : "Create a page to make room for one."}
              </p>
            </div>
          ) : (
            <div className="grid gap-1">
              {isError ? (
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-small text-warning" role="status">
                    Some replies are unavailable right now.
                  </p>
                  <Button
                    className="!min-h-[var(--letterly-target-min)] !rounded-small !bg-surface !px-3 !text-label !font-bold !text-wine hover:!bg-surface-muted"
                    onClick={onRetry}
                    size="sm"
                    type="button"
                  >
                    Try again
                  </Button>
                </div>
              ) : null}
              <ul aria-label="Recent replies" className="grid gap-1">
                {recentResponses.map((response) => (
                  <ResponseRow
                    key={`${response.pageId}-${response.id}`}
                    response={response}
                  />
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function PrivacyNote(): React.JSX.Element {
  return (
    <aside
      aria-labelledby="privacy-note-title"
      className="rounded-medium bg-rose/10 p-5 sm:p-6"
      data-dashboard-reveal
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-round bg-surface text-wine">
          <DashboardIcon className="size-4" name="lock" />
        </span>
        <div>
          <p className="text-label font-bold uppercase tracking-[0.12em] text-wine">
            Private by default
          </p>
          <h2
            className="mt-1 font-display text-heading-3 font-semibold tracking-[-0.04em]"
            id="privacy-note-title"
          >
            You choose when to share.
          </h2>
        </div>
      </div>
      <Link
        className="mt-4 inline-flex min-h-[var(--letterly-target-min)] items-center gap-2 text-small font-bold text-wine underline decoration-rose underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
        href="/privacy"
      >
        Privacy and safety
        <DashboardIcon className="size-4" name="arrow-up-right" />
      </Link>
    </aside>
  );
}

function TemplateArtwork({
  template,
}: {
  template: TemplateCatalogItem;
}): React.JSX.Element {
  const isJourney = template.key === "choose-your-heart";

  return (
    <div
      aria-hidden="true"
      className={`relative min-h-32 overflow-hidden p-5 ${isJourney ? "bg-rose/10" : "bg-surface-muted"}`}
    >
      {isJourney ? (
        <div className="absolute right-6 top-6 grid grid-cols-2 gap-2">
          {(["bg-wine", "bg-rose", "bg-surface", "bg-olive"] as const).map(
            (colorClass, index) => (
              <span
                className={`grid size-8 place-items-center rounded-round ${colorClass} ${index === 0 ? "text-surface" : "text-ink"}`}
                key={colorClass}
              >
                {index === 0 ? (
                  <DashboardIcon className="size-4" name="heart" />
                ) : null}
              </span>
            ),
          )}
        </div>
      ) : (
        <div className="absolute right-8 top-6 h-20 w-32 rotate-[-5deg] rounded-small bg-surface p-4 shadow-low">
          <span className="block h-1.5 w-10 rounded-round bg-rose/60" />
          <span className="mt-3 block h-1.5 w-20 rounded-round bg-border/70" />
          <span className="mt-2 block h-1.5 w-14 rounded-round bg-border/70" />
          <span className="absolute bottom-3 right-4 font-display text-heading-3 text-wine">
            L
          </span>
        </div>
      )}
      <div className="relative z-10 grid max-w-[12rem] gap-2">
        <span className="text-label font-bold uppercase tracking-[0.14em] text-ink-muted">
          Letterly template
        </span>
        <span className="font-display text-heading-3 font-semibold leading-[1.05] tracking-[-0.05em] text-ink">
          {template.name}
        </span>
      </div>
    </div>
  );
}

function TemplateCard({
  categoryName,
  template,
}: {
  categoryName: string;
  template: TemplateCatalogItem;
}): React.JSX.Element {
  const version = template.versions.at(-1);
  const capabilities = version?.capabilities ?? [];
  const startHref = version ? createTemplateStartPath(version.id) : "/sign-in";

  return (
    <Card className="group overflow-hidden border-0 bg-surface p-0 shadow-low transition-[box-shadow,transform] duration-[var(--letterly-motion-standard)] hover:-translate-y-0.5 hover:shadow-medium motion-reduce:transition-none">
      <TemplateArtwork template={template} />
      <CardHeader className="gap-2 p-5 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-0 bg-surface-muted px-2 py-1 text-label font-bold text-wine">
            {categoryName}
          </Badge>
          <span className="text-label text-ink-muted">
            {capabilities.length} {pluralize(capabilities.length, "feature", "features")}
          </span>
        </div>
        <CardTitle>{template.name}</CardTitle>
        <CardDescription className="leading-[var(--letterly-text-small-line-height)]">
          {getTemplateIntro(template.key, template.description)}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 p-5 pt-0">
        {capabilities.length > 0 ? (
          <ul
            aria-label={`Capabilities for ${template.name}`}
            className="flex flex-wrap gap-x-3 gap-y-1.5"
          >
            {capabilities.slice(0, 5).map((capability) => (
              <li
                className="inline-flex items-center gap-1.5 text-label text-ink-muted"
                key={capability}
              >
                <span aria-hidden="true" className="size-1 rounded-round bg-rose" />
                {capabilityLabels[capability] ?? capability}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <TemplatePreviewDialog
            capabilities={capabilities}
            description={
              template.description ?? "A personal way to say what matters."
            }
            startHref={startHref}
            templateKey={template.key}
            templateName={template.name}
          />
          <Button
            asChild
            className="!min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-3 !text-label !font-bold !text-surface hover:!bg-wine-hover"
            size="sm"
          >
            <Link href={startHref}>
              Use template
              <DashboardIcon className="size-3.5" name="arrow-up-right" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type TemplateRailProps = DashboardCatalog & {
  catalogError: boolean;
};

function TemplateRail({
  catalogError,
  categories,
  templates,
}: TemplateRailProps): React.JSX.Element {
  return (
    <section aria-labelledby="templates-title" data-dashboard-reveal>
      <SectionHeading
        action={
          <Link
            className="inline-flex min-h-[var(--letterly-target-min)] items-center gap-1.5 rounded-small px-2 text-small font-bold text-wine underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-[var(--letterly-motion-fast)] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
            href="/templates"
          >
            Explore templates
            <DashboardIcon className="size-3.5" name="arrow-up-right" />
          </Link>
        }
        eyebrow="Start something new"
        id="templates-title"
        title="Choose a template"
      />

      <div className="mt-4">
        {catalogError ? (
          <div
            className="rounded-medium border border-error/40 bg-surface-muted p-5"
            role="alert"
          >
            <p className="text-label font-bold uppercase tracking-[0.12em] text-error">
              Catalog unavailable
            </p>
            <h3 className="mt-1.5 font-display text-heading-3 font-semibold">
              We could not load templates.
            </h3>
            <p className="mt-1.5 text-small text-ink-muted">
              Try the template collection again in a moment.
            </p>
            <Button
              asChild
              className="mt-4 !min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-3 !text-label !font-bold !text-surface hover:!bg-wine-hover"
              size="sm"
            >
              <Link href="/templates">Try again</Link>
            </Button>
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-medium bg-surface-muted p-5" role="status">
            <p className="text-label font-bold uppercase tracking-[0.12em] text-wine">
              No templates yet
            </p>
            <p className="mt-1.5 text-small text-ink-muted">
              Return to the collection soon.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.slice(0, 4).map((template) => (
              <TemplateCard
                categoryName={getCategoryName(categories, template.categoryKey)}
                key={template.id}
                template={template}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function DashboardOverview({
  catalog,
  catalogError,
  displayName,
  onRetryPages,
  onRetryResponses,
  pages,
  pagesErrorMessage,
  pagesPending,
  recentResponses,
  responseQueriesError,
  responseQueriesPending,
}: DashboardOverviewProps): React.JSX.Element {
  return (
    <main
      className="min-h-full min-w-0 overflow-x-clip bg-canvas"
      id="dashboard-content"
    >
      <DashboardMotion>
        <div className="mx-auto max-w-[var(--letterly-container-max)] px-4 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-9 xl:px-10">
          <DashboardOverviewHeader displayName={displayName} />

          <div className="mt-6">
            <ContinuePageCard
              errorMessage={pagesErrorMessage}
              isError={Boolean(pagesErrorMessage)}
              isPending={pagesPending}
              onRetry={onRetryPages}
              page={pages[0]}
            />
          </div>

          <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_minmax(18rem,0.82fr)]">
            <PageListSection
              errorMessage={pagesErrorMessage}
              isError={Boolean(pagesErrorMessage)}
              isPending={pagesPending}
              onRetry={onRetryPages}
              pages={pages}
            />
            <div className="grid content-start gap-5">
              <ResponseListSection
                hasPages={pages.length > 0}
                isError={responseQueriesError}
                isPending={responseQueriesPending}
                onRetry={onRetryResponses}
                recentResponses={recentResponses}
              />
              <PrivacyNote />
            </div>
          </div>

          <div className="mt-9">
            <TemplateRail
              catalogError={catalogError}
              categories={catalog.categories}
              templates={catalog.templates}
            />
          </div>
        </div>
      </DashboardMotion>
    </main>
  );
}
