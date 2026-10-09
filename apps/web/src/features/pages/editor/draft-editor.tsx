"use client";
import type { OwnerPageProjection } from "@letterly/contracts/pages";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { LoadingState } from "../../../components/loading-state";
import { getOwnerPage } from "../api/lifecycle";
import { type WebApiError } from "../../../lib/api/errors";
import { pageKeys } from "../api/query-keys";
import {
  webTemplateRegistrations,
  type WebTemplateId,
} from "../../../templates/registration";
import {
  createWebTemplateImplementationRegistry,
  type WebTemplateImplementation,
} from "../../../templates/implementation-registry";
import type { PageEditorProps } from "./editor-context";
import styles from "./draft-editor.module.css";

const editors = {
  "confession.secret-letter": {
    registryKey: "confession.secret-letter",
    version: 1,
    implementation: dynamic(() =>
      import("./secret-letter-draft-editor").then(
        (module) => module.SecretLetterDraftEditor,
      ),
    ),
  },
  "confession.choose-your-heart": {
    registryKey: "confession.choose-your-heart",
    version: 1,
    implementation: dynamic(() =>
      import("./choose-your-heart-workspace").then(
        (module) => module.ChooseYourHeartWorkspace,
      ),
    ),
  },
} satisfies Record<
  WebTemplateId,
  WebTemplateImplementation<ComponentType<PageEditorProps>>
>;
const resolveEditor = createWebTemplateImplementationRegistry(
  webTemplateRegistrations,
  editors,
);

export function DraftEditor({ pageId }: { pageId: string }): React.JSX.Element {
  const pageQuery = useQuery<OwnerPageProjection, WebApiError>({
    queryKey: pageKeys.detail(pageId),
    queryFn: ({ signal }) => getOwnerPage(pageId, { signal }),
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
  const resolved = resolveEditor({
    templateKey: page.template.key,
    registryKey: page.template.registryKey,
    version: page.template.version,
  });
  if (!resolved)
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
  const { registration, implementation: Editor } = resolved;
  return (
    <>
      {pageQuery.isError ? <OwnerPageError pageQuery={pageQuery} /> : null}
      <div className={styles.editorVisibility} hidden={pageQuery.isError}>
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
        <Button type="button" onClick={() => void pageQuery.refetch()}>
          Try again
        </Button>
        <Link className={styles.textLink} href="/dashboard/pages">
          Return to Pages
        </Link>
      </div>
    </main>
  );
}
