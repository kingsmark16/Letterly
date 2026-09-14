"use client";

import type { PageListResponse } from "@letterly/contracts/pages";
import { useQueries, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  listPages,
  listSubmissions,
  WebApiError,
} from "../../../lib/api-client";
import { authClient } from "../../../lib/auth-client";
import { createSignInPath } from "../../../lib/return-path";
import {
  DashboardOverview,
  type DashboardCatalog,
  type RecentResponse,
} from "./dashboard-overview";

type DashboardHomeProps = {
  catalog: DashboardCatalog | null;
  catalogError?: boolean;
};

const pageQuerySize = 50;
const recentResponsePageLimit = 4;

function getFirstName(name: string): string {
  return name.trim().split(/\s+/u)[0] || "there";
}

function getSafeErrorMessage(error: unknown): string {
  if (error instanceof WebApiError && error.message) {
    return error.message;
  }

  return "Try again in a moment.";
}

function DashboardLoading(): React.JSX.Element {
  return (
    <main
      aria-busy="true"
      className="min-h-full min-w-0 overflow-x-clip bg-canvas"
      id="dashboard-content"
    >
      <div className="mx-auto max-w-[var(--letterly-container-max)] px-4 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-9 xl:px-10">
        <Card className="border-0 bg-surface shadow-low">
          <CardContent className="grid gap-5 p-6 sm:p-8">
            <span className="h-4 w-24 animate-pulse rounded-round bg-surface-muted motion-reduce:animate-none" />
            <span className="h-12 max-w-[32rem] animate-pulse rounded-small bg-surface-muted motion-reduce:animate-none" />
            <span className="h-5 max-w-[38rem] animate-pulse rounded-small bg-surface-muted motion-reduce:animate-none" />
            <span className="h-11 w-36 animate-pulse rounded-small bg-surface-muted motion-reduce:animate-none" />
          </CardContent>
        </Card>
        <p className="sr-only" role="status">
          Loading your dashboard.
        </p>
      </div>
    </main>
  );
}

function DashboardSignIn(): React.JSX.Element {
  return (
    <main
      className="min-h-full min-w-0 overflow-x-clip bg-canvas"
      id="dashboard-content"
    >
      <div className="mx-auto max-w-[var(--letterly-container-max)] px-4 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-9 xl:px-10">
        <Card className="border-0 bg-surface shadow-low">
          <CardContent className="grid gap-4 p-6 sm:p-8">
            <p className="text-label font-bold uppercase tracking-[0.12em] text-wine">
              Your workspace
            </p>
            <h1 className="max-w-[34rem] font-display text-heading-2 font-semibold tracking-[-0.05em]">
              Sign in to keep writing.
            </h1>
            <p className="max-w-[38rem] text-body text-ink-muted">
              Your pages and private replies are waiting for you.
            </p>
            <div>
              <Button
                asChild
                className="!min-h-[var(--letterly-target-min)] !rounded-small !bg-wine !px-4 !text-small !font-bold !text-surface hover:!bg-wine-hover"
                size="lg"
              >
                <Link href={createSignInPath("/dashboard")}>Sign in</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
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
      responseQueries[index]?.data?.items.forEach((response) => {
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

  const responseQueriesPending =
    recentPages.length > 0 && responseQueries.some((query) => query.isPending);
  const responseQueriesError = responseQueries.some((query) => query.isError);

  if (session.isPending) {
    return <DashboardLoading />;
  }

  if (!session.data) {
    return <DashboardSignIn />;
  }

  return (
    <DashboardOverview
      catalog={{
        categories: catalog?.categories ?? [],
        templates: catalog?.templates ?? [],
      }}
      catalogError={catalogError}
      displayName={getFirstName(session.data.user.name)}
      onRetryPages={() => void pagesQuery.refetch()}
      pages={pageItems ?? []}
      pagesErrorMessage={
        pagesQuery.isError ? getSafeErrorMessage(pagesQuery.error) : null
      }
      pagesPending={pagesQuery.isPending}
      recentResponses={recentResponses}
      responseQueriesError={responseQueriesError}
      responseQueriesPending={responseQueriesPending}
    />
  );
}
