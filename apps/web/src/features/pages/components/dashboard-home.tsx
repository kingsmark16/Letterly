"use client";

import type {
  CategoryCatalogItem,
  TemplateCatalogItem,
} from "@letterly/contracts/catalog";
import type { PageListResponse, PageSummary } from "@letterly/contracts/pages";
import type { OwnerSubmissionSummary } from "@letterly/contracts/submissions";
import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
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
import { Separator } from "../../../components/ui/separator";
import { capabilityLabels, getTemplateIntro } from "../../catalog/catalog-copy";
import {
  listPages,
  listSubmissions,
  type WebApiError,
} from "../../../lib/api-client";
import { authClient } from "../../../lib/auth-client";
import {
  createSignInPath,
  createTemplateStartPath,
} from "../../../lib/return-path";
import { DashboardIcon } from "./dashboard-icons";

type DashboardCatalog = {
  categories: CategoryCatalogItem[];
  templates: TemplateCatalogItem[];
};

type DashboardHomeProps = {
  catalog: DashboardCatalog | null;
  catalogError?: boolean;
};

type DashboardStatus = PageSummary["status"];

type RecentResponse = OwnerSubmissionSummary & {
  pageId: string;
  pageTitle: string;
};

const pageQuerySize = 50;
const recentResponsePageLimit = 4;

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

function getFirstName(name: string): string {
  return name.trim().split(/\s+/u)[0] || "there";
}

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

function StatCard({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <div className="grid min-h-32 content-between gap-4 bg-surface p-5 sm:p-6">
      <p className="text-label font-bold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <div>
        <p className="font-display text-heading-2 font-semibold tabular-nums tracking-[-0.05em] text-ink">
          {value}
        </p>
        <p className="mt-1 text-label text-ink-muted">{detail}</p>
      </div>
    </div>
  );
}

function PageRow({ page }: { page: PageSummary }): React.JSX.Element {
  return (
    <li className="flex flex-col gap-4 border-t border-border py-5 first:border-t-0 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-small bg-surface-muted text-wine"
        >
          <DashboardIcon className="size-[1.125rem]" name="pages" />
        </span>
        <div className="min-w-0">
          <p className="text-label font-bold uppercase tracking-[0.12em] text-ink-muted">
            {page.template.name}
          </p>
          <h3 className="mt-1 truncate font-display text-heading-3 font-semibold tracking-[-0.04em] text-ink">
            {page.recipientLabel}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-label text-ink-muted">
            <PageStatus status={page.status} />
            <span aria-hidden="true">·</span>
            <span>
              Edited{" "}
              <time dateTime={page.updatedAt}>
                {formatDate(page.updatedAt)}
              </time>
            </span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
        <Button
          asChild
          className="!min-h-[var(--letterly-target-min)] !rounded-small !border-border !bg-surface !px-3 !text-label !font-bold !text-ink hover:!border-wine hover:!text-wine"
          size="sm"
          variant="outline"
        >
          <Link href={`/dashboard/pages/${page.id}/edit`}>Open editor</Link>
        </Button>
        <Link
          className="inline-flex min-h-[var(--letterly-target-min)] items-center gap-1.5 rounded-small px-2 text-label font-bold text-wine underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-[var(--letterly-motion-fast)] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
          href={`/dashboard/pages/${page.id}/responses`}
        >
          Responses
          <DashboardIcon className="size-3.5" name="arrow-up-right" />
        </Link>
      </div>
    </li>
  );
}

function ResponseRow({
  response,
}: {
  response: RecentResponse;
}): React.JSX.Element {
  const responseLabel =
    response.readState === "UNREAD" ? "New reply" : "Read reply";

  return (
    <li>
      <Link
        className="group flex min-h-[var(--letterly-target-min)] items-start gap-3 rounded-medium px-3 py-3 transition-colors duration-[var(--letterly-motion-fast)] hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
        href={`/dashboard/pages/${response.pageId}/responses?selected=${encodeURIComponent(response.id)}`}
      >
        <span
          aria-hidden="true"
          className={`mt-1 grid size-8 shrink-0 place-items-center rounded-round ${response.readState === "UNREAD" ? "bg-wine text-surface" : "bg-surface-muted text-ink-muted"}`}
        >
          <DashboardIcon className="size-4" name="inbox" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span
              className={`text-small font-bold ${response.readState === "UNREAD" ? "text-wine" : "text-ink"}`}
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
          <span className="mt-1 block truncate text-small text-ink-muted">
            {response.pageTitle}
          </span>
          <span className="mt-1 block text-label text-ink-muted">
            {response.answerCount} {pluralize(response.answerCount, "answer")}
            {response.hasVisitorMessage ? " · Private message" : ""}
          </span>
        </span>
        <DashboardIcon
          className="mt-1.5 size-4 shrink-0 text-ink-muted transition-transform duration-[var(--letterly-motion-fast)] group-hover:translate-x-0.5 group-hover:text-wine"
          name="arrow-up-right"
        />
      </Link>
    </li>
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
      className={`relative min-h-40 overflow-hidden border-b border-border p-5 ${isJourney ? "bg-rose/15" : "bg-sand/30"}`}
    >
      {isJourney ? (
        <div className="absolute right-6 top-6 grid grid-cols-2 gap-2">
          {(["bg-wine", "bg-rose", "bg-sand", "bg-olive"] as const).map(
            (colorClass, index) => (
              <span
                className={`grid size-10 place-items-center rounded-round border border-surface/70 ${colorClass} ${index === 0 ? "text-surface" : "text-ink"}`}
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
        <div className="absolute right-7 top-6 h-24 w-36 rotate-[-5deg] border border-border bg-surface shadow-low">
          <div className="absolute inset-x-4 top-4 h-px bg-border" />
          <div className="absolute inset-x-4 top-8 h-px bg-border" />
          <div className="absolute bottom-4 left-4 h-1.5 w-12 rounded-round bg-rose" />
          <span className="absolute bottom-3 right-4 font-display text-heading-3 text-wine">
            L
          </span>
        </div>
      )}
      <div className="relative z-10 grid max-w-[12rem] gap-2">
        <span className="text-label font-bold uppercase tracking-[0.14em] text-ink-muted">
          Letterly template
        </span>
        <span className="font-display text-heading-2 font-semibold leading-[1.05] tracking-[-0.05em] text-ink">
          {template.name}
        </span>
        <span className="mt-2 h-px w-10 bg-wine" />
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
    <Card className="group overflow-hidden p-0 shadow-none transition-[border-color,box-shadow] duration-[var(--letterly-motion-standard)] hover:border-wine hover:shadow-low motion-reduce:transition-none">
      <TemplateArtwork template={template} />
      <CardHeader className="gap-3 pb-4">
        <div className="flex items-center justify-between gap-3 text-label font-bold uppercase tracking-[0.12em] text-ink-muted">
          <span className="text-wine">{categoryName}</span>
          <span>
            {capabilities.length}{" "}
            {pluralize(capabilities.length, "feature", "features")}
          </span>
        </div>
        <CardTitle>{template.name}</CardTitle>
        <CardDescription className="max-w-[36rem] leading-[var(--letterly-text-body-line-height)]">
          {getTemplateIntro(template.key, template.description)}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 pt-0">
        {capabilities.length > 0 ? (
          <ul
            aria-label={`Capabilities for ${template.name}`}
            className="flex flex-wrap gap-2"
          >
            {capabilities.slice(0, 5).map((capability) => (
              <li key={capability}>
                <Badge
                  className="rounded-small border-border bg-surface-muted px-2.5 py-1 text-label font-semibold text-ink-muted"
                  variant="outline"
                >
                  {capabilityLabels[capability] ?? capability}
                </Badge>
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

function DashboardLoading(): React.JSX.Element {
  return (
    <main
      aria-busy="true"
      className="min-h-screen bg-canvas px-4 py-6 text-ink sm:px-7 lg:px-8"
      id="dashboard-content"
    >
      <section
        aria-live="polite"
        className="mx-auto mt-8 max-w-2xl rounded-large border border-border bg-surface p-6 shadow-low sm:p-8"
      >
        <div className="grid gap-4">
          <span className="h-3 w-28 animate-pulse rounded-round bg-surface-muted" />
          <span className="h-10 w-4/5 animate-pulse rounded-small bg-surface-muted" />
          <span className="h-5 w-full animate-pulse rounded-small bg-surface-muted" />
          <span className="h-5 w-2/3 animate-pulse rounded-small bg-surface-muted" />
        </div>
        <p className="sr-only" role="status">
          Opening your private workspace.
        </p>
      </section>
    </main>
  );
}

function DashboardSignIn(): React.JSX.Element {
  return (
    <main
      className="min-h-screen bg-canvas px-4 py-6 text-ink sm:px-7 lg:px-8"
      id="dashboard-content"
    >
      <div className="grid min-h-[calc(100svh-12rem)] place-items-center py-10">
        <section
          aria-labelledby="dashboard-sign-in-title"
          className="w-full max-w-xl rounded-large border border-border bg-surface p-6 shadow-low sm:p-8"
        >
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
            Your private workspace
          </p>
          <h1
            className="mt-3 font-display text-balance text-heading-1 font-semibold tracking-[-0.05em]"
            id="dashboard-sign-in-title"
          >
            Sign in to open your pages.
          </h1>
          <p className="mt-4 max-w-[38rem] text-body-large leading-[var(--letterly-text-body-large-line-height)] text-ink-muted">
            Keep drafts, choose a template, and continue writing in your own
            quiet space.
          </p>
          <Button
            asChild
            className="mt-7 !min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-5 !text-small !font-bold !text-surface hover:!bg-wine-hover"
            size="lg"
          >
            <Link href={createSignInPath("/dashboard")}>
              Continue to sign in
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}

export function DashboardHome({
  catalog,
  catalogError = false,
}: DashboardHomeProps): React.JSX.Element {
  const session = authClient.useSession();
  const creatorId = session.data?.user.id ?? null;
  const pagesQuery = useQuery<PageListResponse>({
    queryKey: ["dashboard-home", creatorId],
    queryFn: () => listPages({ size: pageQuerySize }),
    enabled: Boolean(creatorId),
  });
  const pageItems = pagesQuery.data?.items;
  const recentPages = useMemo(
    () => pageItems?.slice(0, recentResponsePageLimit) ?? [],
    [pageItems],
  );
  const responseQueries = useQueries({
    queries: recentPages.map((page) => ({
      queryKey: ["dashboard-home-responses", page.id],
      queryFn: () => listSubmissions(page.id, { filter: "all", size: 3 }),
      enabled: Boolean(creatorId),
    })),
  });

  const recentResponses = useMemo(() => {
    const responses: RecentResponse[] = [];

    recentPages.forEach((page, index) => {
      const responseQuery = responseQueries[index];

      responseQuery?.data?.items.forEach((response) => {
        responses.push({
          ...response,
          pageId: page.id,
          pageTitle: page.recipientLabel,
        });
      });
    });

    return responses
      .sort(
        (left, right) =>
          new Date(right.submittedAt).getTime() -
          new Date(left.submittedAt).getTime(),
      )
      .slice(0, 4);
  }, [recentPages, responseQueries]);

  const unreadResponseCount = responseQueries.reduce(
    (total, responseQuery) => total + (responseQuery.data?.unreadCount ?? 0),
    0,
  );
  const responseQueriesPending =
    recentPages.length > 0 && responseQueries.some((query) => query.isPending);
  const responseQueriesError = responseQueries.some((query) => query.isError);

  if (session.isPending) {
    return <DashboardLoading />;
  }

  if (!session.data) {
    return <DashboardSignIn />;
  }

  const displayName = getFirstName(session.data.user.name);
  const categories = catalog?.categories ?? [];
  const templates = catalog?.templates ?? [];
  const pages = pageItems ?? [];
  const publishedCount = pages.filter(
    (page) => page.status === "PUBLISHED",
  ).length;
  const draftCount = pages.filter((page) => page.status === "DRAFT").length;
  const pageCountLabel = pagesQuery.data?.nextCursor
    ? `${pageQuerySize}+`
    : String(pages.length);
  const pagesAreReady = pagesQuery.isSuccess;

  return (
    <main
      className="min-h-full min-w-0 overflow-x-clip bg-canvas"
      id="dashboard-content"
    >
      <div className="mx-auto max-w-[var(--letterly-container-max)] px-4 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-10 xl:px-10">
        <header
          className="flex flex-wrap items-end justify-between gap-5"
          id="dashboard-overview"
        >
          <div className="max-w-[44rem]">
            <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
              Overview
            </p>
            <h1 className="mt-2 font-display text-balance text-heading-1 font-semibold tracking-[-0.06em]">
              Good to see you, {displayName}.
            </h1>
            <p className="mt-3 max-w-[40rem] text-body-large leading-[var(--letterly-text-body-large-line-height)] text-ink-muted">
              Create a personal page for the words, memories, and questions that
              deserve more than an ordinary message.
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

        <section
          aria-labelledby="workspace-prompt-title"
          className="mt-8 grid overflow-hidden rounded-large border border-border bg-surface shadow-low lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]"
        >
          <div className="grid content-center gap-5 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-label font-bold uppercase tracking-[0.14em] text-wine">
              <DashboardIcon className="size-4" name="heart" />A place for what
              matters
            </div>
            <h2
              className="max-w-[25rem] font-display text-balance text-heading-2 font-semibold leading-[1.04] tracking-[-0.055em]"
              id="workspace-prompt-title"
            >
              Make a little room for the words you want someone to keep.
            </h2>
            <p className="max-w-[35rem] text-body leading-[var(--letterly-text-body-line-height)] text-ink-muted">
              Start with a shape that fits the moment. You can keep it private
              while you write, then share it when it feels ready.
            </p>
            <div>
              <Button
                asChild
                className="!min-h-[var(--letterly-target-min)] !rounded-small !border !border-border !bg-surface-muted !px-4 !text-small !font-bold !text-ink hover:!bg-surface"
                size="lg"
              >
                <Link href="/templates">
                  Choose a template
                  <DashboardIcon className="size-4" name="arrow-up-right" />
                </Link>
              </Button>
            </div>
          </div>
          <div
            aria-hidden="true"
            className="relative min-h-64 overflow-hidden bg-rose/10 p-6 sm:min-h-72 sm:p-8"
          >
            <div className="absolute inset-x-10 top-12 rotate-[-4deg] border border-border bg-surface p-5 text-ink shadow-low sm:inset-x-14 sm:top-16 sm:p-6">
              <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                Private page
              </p>
              <p className="mt-5 font-display text-heading-3 font-semibold leading-[1.05] tracking-[-0.04em]">
                Say what your heart has been holding.
              </p>
              <span className="mt-6 block h-px w-14 bg-wine" />
              <div className="mt-5 grid gap-2">
                <span className="h-px w-full bg-border" />
                <span className="h-px w-4/5 bg-border" />
                <span className="h-px w-3/5 bg-border" />
              </div>
              <div className="mt-6 flex items-center justify-between text-label text-ink-muted">
                <span>Letterly</span>
                <DashboardIcon className="size-4 text-rose" name="heart" />
              </div>
            </div>
          </div>
        </section>

        <section
          aria-label="Workspace summary"
          className="mt-5 grid overflow-hidden rounded-large border border-border bg-border sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            detail={
              pagesQuery.isPending
                ? "Loading saved pages…"
                : pagesQuery.isError
                  ? "Unavailable right now"
                  : "Saved in your workspace"
            }
            label="Pages"
            value={pagesAreReady ? pageCountLabel : "—"}
          />
          <StatCard
            detail={
              pagesQuery.isError ? "Unavailable right now" : "Ready to share"
            }
            label="Published"
            value={pagesAreReady ? String(publishedCount) : "—"}
          />
          <StatCard
            detail={
              pagesQuery.isError
                ? "Unavailable right now"
                : "Still taking shape"
            }
            label="Drafts"
            value={pagesAreReady ? String(draftCount) : "—"}
          />
          <StatCard
            detail={
              responseQueriesPending
                ? "Checking recent pages"
                : "Across recent pages"
            }
            label="Unread replies"
            value={responseQueriesPending ? "—" : String(unreadResponseCount)}
          />
        </section>

        <div className="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1.22fr)_minmax(19rem,0.78fr)]">
          <section aria-labelledby="pages-title">
            <Card className="overflow-hidden p-0 shadow-none">
              <CardHeader className="flex-row items-end justify-between gap-4 border-b border-border pb-5 sm:pb-6">
                <div>
                  <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                    Keep going
                  </p>
                  <CardTitle as="h2" className="mt-2" id="pages-title">
                    My pages
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Your latest work, ready whenever you are.
                  </CardDescription>
                </div>
                <Link
                  className="inline-flex min-h-[var(--letterly-target-min)] shrink-0 items-center gap-1.5 rounded-small px-2 text-small font-bold text-wine underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-[var(--letterly-motion-fast)] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
                  href="/dashboard/pages"
                >
                  View all
                  <DashboardIcon className="size-3.5" name="arrow-up-right" />
                </Link>
              </CardHeader>
              <CardContent className="p-5 sm:p-6">
                {pagesQuery.isPending ? (
                  <div
                    aria-busy="true"
                    aria-live="polite"
                    className="grid gap-3"
                  >
                    {["one", "two", "three"].map((item) => (
                      <div
                        className="flex items-center gap-3 border-t border-border py-4 first:border-t-0"
                        key={item}
                      >
                        <span className="size-10 animate-pulse rounded-small bg-surface-muted" />
                        <span className="grid flex-1 gap-2">
                          <span className="h-3 w-1/4 animate-pulse rounded-round bg-surface-muted" />
                          <span className="h-5 w-2/5 animate-pulse rounded-small bg-surface-muted" />
                        </span>
                      </div>
                    ))}
                    <p className="sr-only" role="status">
                      Finding your latest pages.
                    </p>
                  </div>
                ) : pagesQuery.isError ? (
                  <div
                    className="rounded-medium border border-error/40 bg-surface-muted p-5"
                    role="alert"
                  >
                    <p className="text-label font-bold uppercase tracking-[0.12em] text-error">
                      Pages unavailable
                    </p>
                    <h3 className="mt-2 font-display text-heading-3 font-semibold">
                      We could not load your pages.
                    </h3>
                    <p className="mt-2 text-small leading-[var(--letterly-text-small-line-height)] text-ink-muted">
                      {(pagesQuery.error as WebApiError).message}
                    </p>
                    <Button
                      className="mt-4 !min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-3 !text-label !font-bold !text-surface hover:!bg-wine-hover"
                      onClick={() => void pagesQuery.refetch()}
                      size="sm"
                      type="button"
                    >
                      Try again
                    </Button>
                  </div>
                ) : pages.length === 0 ? (
                  <div className="rounded-medium border border-dashed border-border bg-surface-muted p-6 sm:p-7">
                    <div className="grid size-10 place-items-center rounded-round bg-rose/20 text-wine">
                      <DashboardIcon className="size-5" name="pen" />
                    </div>
                    <h3 className="mt-5 font-display text-heading-3 font-semibold tracking-[-0.04em]">
                      Your first page starts with a feeling.
                    </h3>
                    <p className="mt-2 max-w-[34rem] text-small leading-[var(--letterly-text-small-line-height)] text-ink-muted">
                      Choose a template, write what matters, and keep the page
                      private while it takes shape.
                    </p>
                    <Button
                      asChild
                      className="mt-5 !min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-4 !text-small !font-bold !text-surface hover:!bg-wine-hover"
                      size="lg"
                    >
                      <Link href="/templates">Browse templates</Link>
                    </Button>
                  </div>
                ) : (
                  <ul aria-label="Your latest pages">
                    {pages.slice(0, 4).map((page) => (
                      <PageRow key={page.id} page={page} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="privacy-title" id="privacy">
            <Card className="h-full overflow-hidden border-rose/30 bg-rose/10 shadow-none">
              <CardHeader className="gap-4 p-6 sm:p-7">
                <div className="flex size-11 items-center justify-center rounded-round bg-surface text-wine">
                  <DashboardIcon className="size-5" name="lock" />
                </div>
                <div>
                  <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                    Your privacy, your choice
                  </p>
                  <CardTitle
                    as="h2"
                    className="mt-3 text-ink"
                    id="privacy-title"
                  >
                    Your words stay in your hands.
                  </CardTitle>
                </div>
                <CardDescription className="text-ink-muted">
                  You choose when a page becomes shareable. Nothing is published
                  for you.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 p-6 pt-0 sm:p-7 sm:pt-0">
                <ul className="grid gap-3 text-small leading-[var(--letterly-text-small-line-height)] text-ink-muted">
                  <li className="flex items-start gap-2.5">
                    <DashboardIcon
                      className="mt-0.5 size-4 shrink-0 text-wine"
                      name="check"
                    />
                    Drafts remain private while you create.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <DashboardIcon
                      className="mt-0.5 size-4 shrink-0 text-wine"
                      name="check"
                    />
                    Preview before you publish and share.
                  </li>
                  <li className="flex items-start gap-2.5">
                    <DashboardIcon
                      className="mt-0.5 size-4 shrink-0 text-wine"
                      name="check"
                    />
                    Visitor replies stay private to you.
                  </li>
                </ul>
                <Separator className="bg-border" />
                <Link
                  className="inline-flex min-h-[var(--letterly-target-min)] items-center gap-2 text-small font-bold text-wine underline decoration-rose underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
                  href="/privacy"
                >
                  Read privacy and safety
                  <DashboardIcon className="size-4" name="arrow-up-right" />
                </Link>
              </CardContent>
            </Card>
          </section>
        </div>

        <section
          aria-labelledby="recent-responses-title"
          className="mt-6 scroll-mt-6"
          id="recent-responses"
        >
          <Card className="overflow-hidden p-0 shadow-none">
            <CardHeader className="flex-row items-end justify-between gap-4 border-b border-border pb-5 sm:pb-6">
              <div>
                <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                  Make room for a response
                </p>
                <CardTitle as="h2" className="mt-2" id="recent-responses-title">
                  Recent replies
                </CardTitle>
                <CardDescription className="mt-1">
                  Private replies from visitors to your latest pages.
                </CardDescription>
              </div>
              <span className="hidden text-label text-ink-muted sm:inline">
                Latest pages
              </span>
            </CardHeader>
            <CardContent className="p-5 sm:p-6">
              {responseQueriesPending ? (
                <div aria-busy="true" aria-live="polite" className="grid gap-3">
                  {["one", "two"].map((item) => (
                    <div
                      className="flex items-center gap-3 rounded-medium bg-surface-muted p-3"
                      key={item}
                    >
                      <span className="size-8 animate-pulse rounded-round bg-border" />
                      <span className="grid flex-1 gap-2">
                        <span className="h-4 w-1/3 animate-pulse rounded-round bg-border" />
                        <span className="h-3 w-2/3 animate-pulse rounded-round bg-border" />
                      </span>
                    </div>
                  ))}
                  <p className="sr-only" role="status">
                    Checking for recent replies.
                  </p>
                </div>
              ) : responseQueriesError && recentResponses.length === 0 ? (
                <div
                  className="rounded-medium border border-error/40 bg-surface-muted p-5"
                  role="alert"
                >
                  <p className="text-label font-bold uppercase tracking-[0.12em] text-error">
                    Replies unavailable
                  </p>
                  <h3 className="mt-2 font-display text-heading-3 font-semibold">
                    We could not check your recent replies.
                  </h3>
                  <p className="mt-2 text-small leading-[var(--letterly-text-small-line-height)] text-ink-muted">
                    Open a page inbox to try again, or come back in a moment.
                  </p>
                </div>
              ) : recentResponses.length === 0 ? (
                <div className="rounded-medium border border-dashed border-border bg-surface-muted p-6 sm:p-7">
                  <div className="grid size-10 place-items-center rounded-round bg-rose/20 text-wine">
                    <DashboardIcon className="size-5" name="inbox" />
                  </div>
                  <h3 className="mt-5 font-display text-heading-3 font-semibold tracking-[-0.04em]">
                    Your private inbox is waiting.
                  </h3>
                  <p className="mt-2 max-w-[42rem] text-small leading-[var(--letterly-text-small-line-height)] text-ink-muted">
                    When a visitor replies to one of your pages, their message
                    will appear here for you alone.
                  </p>
                  {pages.length === 0 ? (
                    <Button
                      asChild
                      className="mt-5 !min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-4 !text-small !font-bold !text-surface hover:!bg-wine-hover"
                      size="lg"
                    >
                      <Link href="/templates">Create a page</Link>
                    </Button>
                  ) : null}
                </div>
              ) : (
                <>
                  {responseQueriesError ? (
                    <p className="mb-4 text-small text-warning" role="status">
                      Some recent page replies are unavailable right now.
                    </p>
                  ) : null}
                  <ul aria-label="Recent replies" className="grid gap-1">
                    {recentResponses.map((response) => (
                      <ResponseRow
                        key={`${response.pageId}-${response.id}`}
                        response={response}
                      />
                    ))}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="templates-title" className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
                Find your starting point
              </p>
              <h2
                className="mt-2 font-display text-heading-2 font-semibold tracking-[-0.055em]"
                id="templates-title"
              >
                Choose a shape for what&apos;s next.
              </h2>
              <p className="mt-2 max-w-[38rem] text-body text-ink-muted">
                Each template gives your words a different way to arrive.
              </p>
            </div>
            <Link
              className="inline-flex min-h-[var(--letterly-target-min)] items-center gap-1.5 rounded-small px-2 text-small font-bold text-wine underline decoration-transparent underline-offset-4 transition-[color,text-decoration-color] duration-[var(--letterly-motion-fast)] hover:decoration-current focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine"
              href="/templates"
            >
              Explore templates
              <DashboardIcon className="size-3.5" name="arrow-up-right" />
            </Link>
          </div>

          <div className="mt-5">
            {catalogError ? (
              <div
                className="rounded-large border border-error/40 bg-surface p-6"
                role="alert"
              >
                <p className="text-label font-bold uppercase tracking-[0.12em] text-error">
                  Catalog unavailable
                </p>
                <h3 className="mt-2 font-display text-heading-3 font-semibold">
                  We are preparing the right words.
                </h3>
                <p className="mt-2 text-small leading-[var(--letterly-text-small-line-height)] text-ink-muted">
                  Try the template collection again in a moment.
                </p>
                <Button
                  asChild
                  className="mt-4 !min-h-[var(--letterly-target-min)] !rounded-small !border-border !bg-surface !px-3 !text-label !font-bold !text-ink hover:!border-wine hover:!text-wine"
                  size="sm"
                  variant="outline"
                >
                  <Link href="/templates">Try again</Link>
                </Button>
              </div>
            ) : templates.length === 0 ? (
              <div
                className="rounded-large border border-dashed border-border bg-surface p-6"
                role="status"
              >
                <p className="text-label font-bold uppercase tracking-[0.12em] text-wine">
                  Nothing here yet
                </p>
                <h3 className="mt-2 font-display text-heading-3 font-semibold">
                  Something thoughtful is on its way.
                </h3>
                <p className="mt-2 text-small leading-[var(--letterly-text-small-line-height)] text-ink-muted">
                  Return to the collection soon to see the latest Letterly
                  templates.
                </p>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                {templates.slice(0, 4).map((template) => (
                  <TemplateCard
                    categoryName={getCategoryName(
                      categories,
                      template.categoryKey,
                    )}
                    key={template.id}
                    template={template}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
