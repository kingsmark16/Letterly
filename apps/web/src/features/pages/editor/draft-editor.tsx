"use client";
import type { OwnerPageProjection } from "@letterly/contracts/pages";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { LoadingState } from "../../../components/loading-state";
import { getOwnerPage, type WebApiError } from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import {
  getWebTemplate,
  type WebTemplateId,
} from "../../../templates/registration";
import type { PageEditorProps } from "./editor-context";
import styles from "./draft-editor.module.css";

const editors = {
  "confession.secret-letter": dynamic(() =>
    import("./secret-letter-draft-editor").then(
      (module) => module.SecretLetterDraftEditor,
    ),
  ),
  "confession.choose-your-heart": dynamic(() =>
    import("./choose-your-heart-workspace").then(
      (module) => module.ChooseYourHeartWorkspace,
    ),
  ),
} satisfies Record<WebTemplateId, ComponentType<PageEditorProps>>;

export function DraftEditor({ pageId }: { pageId: string }): React.JSX.Element {
  const pageQuery = useQuery<OwnerPageProjection, WebApiError>({
    queryKey: pageKeys.detail(pageId),
    queryFn: () => getOwnerPage(pageId),
  });
  if (pageQuery.isPending) {
    return (
      <LoadingState
        variant="page"
        id="dashboard-content"
        title="Opening your letter"
        description="Getting your saved words and memories ready."
      />
    );
  }

  if (!pageQuery.data) return <OwnerPageError pageQuery={pageQuery} />;

  const page = pageQuery.data;
  const registration = getWebTemplate({
    templateKey: page.template.key,
    registryKey: page.template.registryKey,
    version: page.template.version,
  });
  if (!registration)
    return (
      <main className={styles.page} id="dashboard-content">
        <div className={styles.errorShell} role="alert">
          <p className={styles.eyebrow}>This page is unavailable</p>
          <h1>This design version is unavailable.</h1>
          <p>Return to Pages and try again shortly.</p>
          <Link className={styles.textLink} href="/dashboard/pages">
            Return to Pages
          </Link>
        </div>
      </main>
    );
  const Editor = editors[registration.id];
  return (
    <>
      {pageQuery.isError ? <OwnerPageError pageQuery={pageQuery} /> : null}
      <div hidden={pageQuery.isError}>
        <Editor
          key={`${page.id}:${registration.id}:${registration.version}`}
          pageQuery={{ ...pageQuery, data: page }}
        />
      </div>
    </>
  );
}

function OwnerPageError({
  pageQuery,
}: {
  pageQuery: UseQueryResult<OwnerPageProjection, WebApiError>;
}): React.JSX.Element {
  const error = pageQuery.error;

  return (
    <main className={styles.page} id="dashboard-content">
      <div className={styles.errorShell} role="alert">
        <p className={styles.eyebrow}>This page is unavailable</p>
        <h1>We could not open this letter.</h1>
        <p>{error?.message ?? "Please try again."}</p>
        {error?.requestId ? <p>Request ID: {error.requestId}</p> : null}
        <Button
          className={styles.primaryButton}
          type="button"
          onClick={() => void pageQuery.refetch()}
        >
          Try again
        </Button>
        <Link className={styles.textLink} href="/dashboard/pages">
          Return to Pages
        </Link>
      </div>
    </main>
  );
}
