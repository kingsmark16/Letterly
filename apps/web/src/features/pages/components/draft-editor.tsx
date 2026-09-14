"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { countGraphemes } from "@letterly/templates/secret-letter";
import {
  deletePage,
  getOwnerPage,
  listPageQuestions,
  savePage,
  type WebApiError,
} from "../../../lib/api-client";
import { pageKeys } from "../../../lib/page-keys";
import { QuestionEditor } from "./question-editor";
import { ChooseYourHeartEditor } from "./choose-your-heart-editor";
import { EditorSectionNav, type EditorSection } from "./editor-section-nav";
import { EditorLetterPreview } from "./editor-letter-preview";
import { EditorOverview } from "./editor-overview";
import { EditorSettings } from "./editor-settings";
import { EditorViewers } from "./editor-viewers";
import {
  ImageEditor,
  saveableImages,
  type EditablePageImage,
} from "./image-editor";
import { AudioEditor } from "./audio-editor";
import type {
  OwnerPageProjection,
  SavePageRequest,
} from "@letterly/contracts/pages";
import { savePageRequestSchema } from "@letterly/contracts/pages";
import styles from "./draft-editor.module.css";

interface DraftEditorProps {
  pageId: string;
}

type EditableSnapshot = Pick<
  SavePageRequest,
  "title" | "recipientName" | "mainMessage" | "creatorName"
>;

type ContentWorkspace = "basics" | "memories" | "music" | "questions";

const contentWorkspaceOptions: ReadonlyArray<{
  id: ContentWorkspace;
  label: string;
  step: string;
}> = [
  { id: "basics", label: "Letter basics", step: "01" },
  { id: "memories", label: "Memories", step: "02" },
  { id: "music", label: "Music", step: "03" },
  { id: "questions", label: "Questions", step: "04" },
];

const blankValues: SavePageRequest = {
  title: "",
  recipientName: "",
  mainMessage: "",
  creatorName: "",
  expectedContentVersion: 0,
};

function valuesFromPage(page: OwnerPageProjection): SavePageRequest {
  return {
    title: page.content.title ?? "",
    recipientName: page.content.recipientName,
    mainMessage: page.content.mainMessage,
    creatorName: page.content.creatorName ?? "",
    expectedContentVersion: page.contentVersion,
  };
}

function snapshotFromValues(values: SavePageRequest): EditableSnapshot {
  return {
    title: values.title,
    recipientName: values.recipientName,
    mainMessage: values.mainMessage,
    creatorName: values.creatorName,
  };
}

function ReadinessItem({
  complete,
  children,
}: {
  complete: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <span
      className={`${styles.readinessItem} ${complete ? styles.readinessComplete : ""}`}
    >
      <span className={styles.readinessIcon} aria-hidden="true">
        {complete ? "✓" : ""}
      </span>
      <span>{children}</span>
    </span>
  );
}

function snapshotsEqual(
  first: EditableSnapshot,
  second: EditableSnapshot,
): boolean {
  return (
    first.title === second.title &&
    first.recipientName === second.recipientName &&
    first.mainMessage === second.mainMessage &&
    first.creatorName === second.creatorName
  );
}

function imagePayloadsEqual(
  first: NonNullable<SavePageRequest["images"]>,
  second: NonNullable<SavePageRequest["images"]>,
): boolean {
  if (first.length !== second.length) return false;

  return first.every(
    (image, index) =>
      image.imageId === second[index]?.imageId &&
      image.sortOrder === second[index]?.sortOrder &&
      image.caption === second[index]?.caption,
  );
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function staleDetails(error: WebApiError): {
  currentContentVersion: number;
  currentUpdatedAt: string;
} | null {
  if (
    error.code !== "STALE_VERSION" ||
    !error.details ||
    !("currentContentVersion" in error.details) ||
    !("currentUpdatedAt" in error.details)
  ) {
    return null;
  }

  return {
    currentContentVersion: error.details.currentContentVersion,
    currentUpdatedAt: error.details.currentUpdatedAt ?? "",
  };
}

function DeletePageControl({
  pageId,
  idSuffix = "",
  embedded = false,
}: {
  pageId: string;
  idSuffix?: string;
  embedded?: boolean;
}): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deleteMutation = useMutation<void, WebApiError>({
    mutationFn: () => deletePage(pageId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: pageKeys.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: pageKeys.all });
      router.push("/dashboard/pages");
    },
    onError: (error) => setErrorMessage(error.message),
  });

  function handleDelete(): void {
    if (
      !window.confirm(
        "Delete this letter permanently? This action cannot be undone.",
      )
    ) {
      return;
    }

    setErrorMessage(null);
    deleteMutation.mutate();
  }

  return (
    <section
      className={`${styles.deletePanel} ${embedded ? styles.deletePanelEmbedded : ""}`}
      aria-labelledby={`delete-page-title${idSuffix}`}
    >
      <div>
        {!embedded ? <p className={styles.eyebrow}>Danger zone</p> : null}
        {embedded ? (
          <h4 id={`delete-page-title${idSuffix}`}>Delete this letter</h4>
        ) : (
          <h2 id={`delete-page-title${idSuffix}`}>Delete this letter</h2>
        )}
        <p>
          Permanently remove this letter and release its public link. This
          cannot be undone.
        </p>
      </div>
      <button
        className={styles.dangerButton}
        type="button"
        disabled={deleteMutation.isPending}
        aria-busy={deleteMutation.isPending}
        onClick={handleDelete}
      >
        {deleteMutation.isPending ? "Deleting..." : "Delete permanently"}
      </button>
      {errorMessage ? (
        <p className={styles.deleteError} role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

export function DraftEditor({ pageId }: DraftEditorProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [online, setOnline] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [conflict, setConflict] = useState<{
    currentContentVersion: number;
    currentUpdatedAt: string;
  } | null>(null);
  const [activeContentWorkspace, setActiveContentWorkspace] =
    useState<ContentWorkspace>("basics");
  const [mediaDirty, setMediaDirty] = useState(false);
  const [journeyDirty, setJourneyDirty] = useState(false);
  const imageDraftRef = useRef<EditablePageImage[]>([]);
  const mediaDirtyRef = useRef(false);
  const imageBusyRef = useRef(false);
  const onlineRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleAutosaveRef = useRef<(force?: boolean) => void>(
    () => undefined,
  );
  const submittedSnapshotRef = useRef<EditableSnapshot | null>(null);
  const submittedImagesRef = useRef<NonNullable<
    SavePageRequest["images"]
  > | null>(null);
  const loadedVersionRef = useRef<number | null>(null);
  const handleImageChange = useCallback((images: EditablePageImage[]) => {
    imageDraftRef.current = images;
    scheduleAutosaveRef.current();
  }, []);
  const handleMediaDirtyChange = useCallback((dirty: boolean) => {
    mediaDirtyRef.current = dirty;
    setMediaDirty(dirty);
  }, []);
  const handleImageBusyChange = useCallback((busy: boolean) => {
    imageBusyRef.current = busy;
    if (!busy) scheduleAutosaveRef.current();
  }, []);

  const pageQuery = useQuery<OwnerPageProjection, WebApiError>({
    queryKey: pageKeys.detail(pageId),
    queryFn: () => getOwnerPage(pageId),
  });
  const questionsQuery = useQuery({
    queryKey: ["questions", pageId],
    queryFn: () => listPageQuestions(pageId),
  });
  const isPublished = pageQuery.data?.status === "PUBLISHED";
  const form = useForm<SavePageRequest>({
    resolver: zodResolver(savePageRequestSchema),
    defaultValues: blankValues,
    mode: "onBlur",
  });
  const recipientName =
    useWatch({ control: form.control, name: "recipientName" }) ?? "";
  const title = useWatch({ control: form.control, name: "title" }) ?? "";
  const mainMessage =
    useWatch({ control: form.control, name: "mainMessage" }) ?? "";
  const creatorName =
    useWatch({ control: form.control, name: "creatorName" }) ?? "";
  const saveMutation = useMutation<
    OwnerPageProjection,
    WebApiError,
    SavePageRequest
  >({
    mutationFn: (values) => savePage(pageId, values),
    onMutate: (values) => {
      submittedSnapshotRef.current = snapshotFromValues(values);
      submittedImagesRef.current = values.images ?? [];
      setConflict(null);
      setStatusMessage("Saving your letter...");
    },
    onSuccess: (page) => {
      queryClient.setQueryData(pageKeys.detail(pageId), page);
      const currentImages = imageDraftRef.current;
      const submittedImages = submittedImagesRef.current ?? [];
      if (
        currentImages.every((image) => image.state === "READY") &&
        imagePayloadsEqual(saveableImages(currentImages), submittedImages)
      ) {
        mediaDirtyRef.current = false;
        setMediaDirty(false);
      }
      setStatusMessage(`Saved as version ${page.contentVersion}.`);
      if (!autosaveTimerRef.current) {
        autosaveTimerRef.current = setTimeout(() => {
          autosaveTimerRef.current = null;
          scheduleAutosaveRef.current();
        }, 0);
      }
    },
    onError: (error) => {
      const details = staleDetails(error);

      if (details) {
        setConflict(details);
        setStatusMessage("This letter changed elsewhere.");
        return;
      }

      setStatusMessage(error.message);
    },
  });
  const { mutate: mutateSave, isPending: isSaving } = saveMutation;

  const scheduleAutosave = useCallback(
    (force = false) => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      if (
        isPublished ||
        loadedVersionRef.current === null ||
        !onlineRef.current ||
        conflict ||
        isSaving ||
        imageBusyRef.current ||
        (!force && !form.formState.isDirty && !mediaDirtyRef.current)
      ) {
        return;
      }

      autosaveTimerRef.current = setTimeout(() => {
        autosaveTimerRef.current = null;
        if (
          isPublished ||
          loadedVersionRef.current === null ||
          !onlineRef.current ||
          conflict ||
          isSaving ||
          imageBusyRef.current
        ) {
          return;
        }

        void form.handleSubmit(
          (values) => {
            mutateSave({
              ...values,
              images: saveableImages(imageDraftRef.current),
            });
          },
          () => {
            setStatusMessage("Review the highlighted fields before saving.");
          },
        )();
      }, 700);
    },
    [conflict, form, isPublished, isSaving, mutateSave],
  );
  scheduleAutosaveRef.current = scheduleAutosave;

  useEffect(() => {
    function updateOnlineState(): void {
      const nextOnline = navigator.onLine;
      onlineRef.current = nextOnline;
      setOnline(nextOnline);
      if (nextOnline) scheduleAutosaveRef.current();
    }

    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  useEffect(() => {
    const page = pageQuery.data;

    if (!page || loadedVersionRef.current === page.contentVersion) {
      return;
    }

    const currentValues = form.getValues();
    const submittedSnapshot = submittedSnapshotRef.current;
    const shouldPreserveCurrentValues =
      form.formState.isDirty || mediaDirty || submittedSnapshot !== null;

    if (
      shouldPreserveCurrentValues &&
      (!submittedSnapshot ||
        !snapshotsEqual(snapshotFromValues(currentValues), submittedSnapshot))
    ) {
      form.reset(
        {
          ...currentValues,
          expectedContentVersion: page.contentVersion,
        },
        { keepDirty: true },
      );
    } else {
      form.reset(valuesFromPage(page));
    }

    submittedSnapshotRef.current = null;
    submittedImagesRef.current = null;
    loadedVersionRef.current = page.contentVersion;
  }, [form, mediaDirty, pageQuery.data]);

  useEffect(
    () => () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    function warnBeforeExit(event: BeforeUnloadEvent): void {
      if (
        (!form.formState.isDirty && !mediaDirty && !journeyDirty) ||
        saveMutation.isPending
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeExit);

    return () => window.removeEventListener("beforeunload", warnBeforeExit);
  }, [
    form.formState.isDirty,
    journeyDirty,
    mediaDirty,
    saveMutation.isPending,
  ]);

  async function reloadAfterConflict(): Promise<void> {
    const result = await pageQuery.refetch();

    if (!result.data) {
      return;
    }

    form.reset(valuesFromPage(result.data));
    setConflict(null);
    setStatusMessage("The latest saved version is loaded.");
  }

  function leaveEditor(event: React.MouseEvent<HTMLAnchorElement>): void {
    if (
      (form.formState.isDirty || mediaDirty || journeyDirty) &&
      !window.confirm("Leave while your changes are still unsaved?")
    ) {
      event.preventDefault();
      return;
    }

    router.prefetch("/dashboard/pages");
  }

  const requestedSection = searchParams.get("section");
  const activeSection: EditorSection =
    requestedSection === "overview" ||
    requestedSection === "viewers" ||
    requestedSection === "settings"
      ? requestedSection
      : "content";

  function changeSection(section: EditorSection): void {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (section === "content") {
      nextParams.delete("section");
    } else {
      nextParams.set("section", section);
    }

    const query = nextParams.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  if (pageQuery.isPending) {
    return (
      <main className={styles.page} aria-busy="true" id="dashboard-content">
        <div className={styles.loadingShell}>
          <p className={styles.eyebrow}>Your private page</p>
          <h1>Opening your letter…</h1>
          <div className={styles.loadingLine} />
          <div className={styles.loadingLineShort} />
        </div>
      </main>
    );
  }

  if (pageQuery.isError || !pageQuery.data) {
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
            Return to my pages
          </Link>
        </div>
      </main>
    );
  }

  const page = pageQuery.data;

  if (page.template.key === "choose-your-heart") {
    return (
      <main className={styles.page}>
        <div className={styles.editorShell}>
          <div className={styles.editorTopline}>
            <Link
              className={styles.backLink}
              href="/dashboard/pages"
              onClick={leaveEditor}
            >
              Back to my pages
            </Link>
            <span className={styles.editorRouteLabel}>Letter editor</span>
          </div>
          <ChooseYourHeartEditor page={page} onDirtyChange={setJourneyDirty} />
          <DeletePageControl pageId={page.id} />
        </div>
      </main>
    );
  }

  const formError = saveMutation.error;
  const hasUnsavedChanges = form.formState.isDirty || mediaDirty;

  function submitSave(): void {
    if (isSaving || conflict) return;

    if (!online) {
      setStatusMessage("You are offline. Reconnect before saving.");
      return;
    }

    void form.handleSubmit(
      (values) =>
        mutateSave({
          ...values,
          images: saveableImages(imageDraftRef.current),
        }),
      () => setStatusMessage("Review the highlighted fields before saving."),
    )();
  }

  const recipientRegistration = form.register("recipientName", {
    onChange: () => scheduleAutosaveRef.current(true),
  });
  const titleRegistration = form.register("title", {
    onChange: () => scheduleAutosaveRef.current(true),
  });
  const messageRegistration = form.register("mainMessage", {
    onChange: () => scheduleAutosaveRef.current(true),
  });
  const creatorRegistration = form.register("creatorName", {
    onChange: () => scheduleAutosaveRef.current(true),
  });
  const previewImages: EditablePageImage[] =
    imageDraftRef.current.length > 0
      ? imageDraftRef.current
      : page.images.map((image) => ({
          ...image,
          included: image.attached,
          caption: image.caption ?? "",
        }));
  const questionCount = questionsQuery.data?.length ?? 0;
  const includedReadyImageCount = previewImages.filter(
    (image) =>
      image.included &&
      image.state === "READY" &&
      Boolean(image.localUrl || image.mediaUrl),
  ).length;
  const questionReadiness = {
    questionCount,
    isLoading: questionsQuery.isPending && !questionsQuery.data,
    isError: questionsQuery.isError,
    isUpdating: questionsQuery.isFetching && Boolean(questionsQuery.data),
    onRetry: () => {
      void questionsQuery.refetch();
    },
  };

  return (
    <main className={styles.page} id="dashboard-content">
      <div className={styles.editorShell}>
        <div className={styles.editorTopline}>
          <Link
            className={styles.backLink}
            href="/dashboard/pages"
            onClick={leaveEditor}
          >
            Back to my pages
          </Link>
          <span className={styles.editorRouteLabel}>Letter editor</span>
        </div>
        <div
          className={`${styles.editorGrid} ${
            activeSection === "settings" ? styles.editorGridSettings : ""
          }`}
        >
          <section
            className={styles.editorPane}
            aria-labelledby="draft-heading"
          >
            <div className={styles.editorHeader}>
              <div className={styles.editorIntro}>
                <h1 id="draft-heading">
                  {activeSection === "overview"
                    ? "Review your letter"
                    : activeSection === "settings"
                      ? "Letter settings"
                      : "Create your letter"}
                </h1>
                <p className={styles.autoSaveStatus} role="status">
                  <span aria-hidden="true">✓</span>
                  {isPublished && activeSection !== "settings"
                    ? "Save changes manually"
                    : activeSection === "settings"
                      ? "All changes saved automatically"
                      : "Auto-saved just now"}
                </p>
              </div>
            </div>

            <div className={styles.editorControlsLayout}>
              <aside className={styles.editorSidebar}>
                <EditorSectionNav
                  activeSection={activeSection}
                  isPublished={isPublished}
                  onChange={changeSection}
                />
              </aside>
              <div className={styles.editorContent}>
                {isPublished && activeSection !== "settings" ? (
                  <p className={styles.readOnlyNotice} role="status">
                    This letter will stay published while you edit. Save changes
                    when you are ready to update the public version.
                  </p>
                ) : null}

                <section
                  id="editor-panel-content"
                  className={`${styles.sectionPanel} ${styles.contentPanel}`}
                  role="tabpanel"
                  aria-labelledby="editor-tab-content"
                  hidden={activeSection !== "content"}
                >
                  <Card
                    as="section"
                    id="content-workspace"
                    aria-labelledby="content-workspace-heading"
                    className="!min-h-0 !overflow-visible !rounded-large !bg-surface !p-3 !shadow-low sm:!p-4"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="mb-1 text-label font-bold uppercase tracking-[0.12em] text-wine">
                          Letter content
                        </p>
                        <h2
                          id="content-workspace-heading"
                          className="font-display text-heading-3 font-semibold tracking-[-0.03em] text-ink"
                        >
                          Build the feeling
                        </h2>
                        <p className="mt-1 max-w-[52ch] text-small leading-6 text-ink-muted">
                          Shape the words first, then add the details that make
                          the letter yours.
                        </p>
                      </div>
                      <span className="inline-flex min-h-8 items-center gap-2 rounded-small border border-border bg-surface-muted px-3 py-1.5 text-label font-bold text-ink-muted">
                        <span
                          className={`h-2 w-2 rounded-full ${isPublished ? "bg-wine" : "bg-olive"}`}
                          aria-hidden="true"
                        />
                        {isPublished ? "Published letter" : "Draft letter"}
                      </span>
                    </div>

                    <div
                      className="grid grid-cols-2 gap-2 rounded-medium border border-border bg-surface-muted p-2 sm:flex sm:flex-wrap"
                      role="tablist"
                      aria-label="Letter content areas"
                    >
                      {contentWorkspaceOptions.map((workspace) => {
                        const isActive =
                          workspace.id === activeContentWorkspace;
                        const workspaceTabId = `content-workspace-tab-${workspace.id}`;

                        return (
                          <Button
                            key={workspace.id}
                            id={workspaceTabId}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`content-workspace-panel-${workspace.id}`}
                            tabIndex={isActive ? 0 : -1}
                            variant={isActive ? "primary" : "secondary"}
                            className="!min-h-11 !min-w-0 !flex-1 !justify-start !rounded-small !px-3 !py-2 !text-left"
                            onClick={() =>
                              setActiveContentWorkspace(workspace.id)
                            }
                            onKeyDown={(event) => {
                              if (
                                event.key !== "ArrowRight" &&
                                event.key !== "ArrowLeft"
                              ) {
                                return;
                              }

                              event.preventDefault();
                              const currentIndex =
                                contentWorkspaceOptions.findIndex(
                                  (option) => option.id === workspace.id,
                                );
                              const offset =
                                event.key === "ArrowRight" ? 1 : -1;
                              const nextIndex =
                                (currentIndex +
                                  offset +
                                  contentWorkspaceOptions.length) %
                                contentWorkspaceOptions.length;
                              const nextWorkspace =
                                contentWorkspaceOptions[nextIndex];

                              if (!nextWorkspace) return;

                              setActiveContentWorkspace(nextWorkspace.id);
                              window.requestAnimationFrame(() => {
                                document
                                  .getElementById(
                                    `content-workspace-tab-${nextWorkspace.id}`,
                                  )
                                  ?.focus();
                              });
                            }}
                          >
                            <span
                              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[0.68rem] font-extrabold ${isActive ? "bg-white/20 text-surface" : "bg-surface-muted text-wine"}`}
                              aria-hidden="true"
                            >
                              {workspace.step}
                            </span>
                            <span className="truncate">{workspace.label}</span>
                          </Button>
                        );
                      })}
                    </div>

                    <div className="min-h-0">
                      <section
                        id="content-workspace-panel-basics"
                        className="pt-3"
                        role="tabpanel"
                        aria-labelledby="content-workspace-tab-basics"
                        hidden={activeContentWorkspace !== "basics"}
                      >
                        <form
                          className={styles.contentWorkspaceForm}
                          onSubmit={(event) => event.preventDefault()}
                          noValidate
                        >
                          <div className={styles.fieldGroup}>
                            <label htmlFor="title">
                              Letter title (optional)
                            </label>
                            <input
                              id="title"
                              type="text"
                              autoComplete="off"
                              placeholder="For you, always"
                              aria-invalid={
                                form.formState.errors.title ? true : undefined
                              }
                              aria-describedby="title-help title-error"
                              {...titleRegistration}
                            />
                            <div className={styles.fieldMeta} id="title-help">
                              <span>
                                Centered in the header. Leave blank for For you,
                                always
                              </span>
                              <span>{countGraphemes(title)} / 120</span>
                            </div>
                            {form.formState.errors.title ? (
                              <p className={styles.fieldError} id="title-error">
                                {form.formState.errors.title.message}
                              </p>
                            ) : null}
                          </div>
                          <section className={styles.contentSection}>
                            <div className={styles.contentSectionHeading}>
                              <span
                                className={styles.stepBadge}
                                aria-hidden="true"
                              >
                                1
                              </span>
                              <h2 id="recipient-section-title">Recipient</h2>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className={styles.fieldGroup}>
                                <label htmlFor="recipientName">
                                  Who is this letter for?
                                </label>
                                <input
                                  id="recipientName"
                                  type="text"
                                  autoComplete="off"
                                  placeholder="e.g. Maya, my future self, our family"
                                  aria-invalid={
                                    form.formState.errors.recipientName
                                      ? true
                                      : undefined
                                  }
                                  aria-describedby="recipientName-help recipientName-error"
                                  {...recipientRegistration}
                                />
                                <div
                                  className={styles.fieldMeta}
                                  id="recipientName-help"
                                >
                                  <span>Optional for now</span>
                                  <span>
                                    {countGraphemes(recipientName)} / 120
                                  </span>
                                </div>
                                {form.formState.errors.recipientName ? (
                                  <p
                                    className={styles.fieldError}
                                    id="recipientName-error"
                                  >
                                    {
                                      form.formState.errors.recipientName
                                        .message
                                    }
                                  </p>
                                ) : null}
                              </div>
                              <div className={styles.fieldGroup}>
                                <label htmlFor="creatorName">
                                  Your name (optional)
                                </label>
                                <input
                                  id="creatorName"
                                  type="text"
                                  autoComplete="name"
                                  placeholder="e.g. Mark"
                                  aria-invalid={
                                    form.formState.errors.creatorName
                                      ? true
                                      : undefined
                                  }
                                  aria-describedby="creatorName-help creatorName-error"
                                  {...creatorRegistration}
                                />
                                <div
                                  className={styles.fieldMeta}
                                  id="creatorName-help"
                                >
                                  <span>
                                    Shown in the closing: Yours, always, ...
                                  </span>
                                  <span>
                                    {countGraphemes(creatorName)} / 120
                                  </span>
                                </div>
                                {form.formState.errors.creatorName ? (
                                  <p
                                    className={styles.fieldError}
                                    id="creatorName-error"
                                  >
                                    {form.formState.errors.creatorName.message}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </section>

                          <section className={styles.contentSection}>
                            <div className={styles.contentSectionHeading}>
                              <span
                                className={styles.stepBadge}
                                aria-hidden="true"
                              >
                                2
                              </span>
                              <h2 id="message-section-title">Your message</h2>
                            </div>
                            <div className={styles.fieldGroup}>
                              <label htmlFor="mainMessage">Your message</label>
                              <div className={styles.messageEditor}>
                                <div
                                  className={styles.messageToolbar}
                                  aria-hidden="true"
                                >
                                  <span className={styles.toolbarStrong}>
                                    B
                                  </span>
                                  <span className={styles.toolbarItalic}>
                                    I
                                  </span>
                                  <span className={styles.toolbarUnderline}>
                                    U
                                  </span>
                                  <span className={styles.toolbarDivider} />
                                  <span>•</span>
                                  <span>☷</span>
                                  <span className={styles.toolbarDivider} />
                                  <span>↗</span>
                                  <span className={styles.toolbarSpacer} />
                                  <span>↶</span>
                                  <span>↷</span>
                                </div>
                                <textarea
                                  id="mainMessage"
                                  rows={8}
                                  aria-invalid={
                                    form.formState.errors.mainMessage
                                      ? true
                                      : undefined
                                  }
                                  aria-describedby="mainMessage-help mainMessage-error"
                                  {...messageRegistration}
                                />
                              </div>
                              <div
                                className={styles.fieldMeta}
                                id="mainMessage-help"
                              >
                                <span>Take all the room you need</span>
                                <span>
                                  {countGraphemes(mainMessage)} / 20,000
                                </span>
                              </div>
                              {form.formState.errors.mainMessage ? (
                                <p
                                  className={styles.fieldError}
                                  id="mainMessage-error"
                                >
                                  {form.formState.errors.mainMessage.message}
                                </p>
                              ) : null}
                            </div>
                          </section>

                          {conflict ? (
                            <div className={styles.conflict} role="alert">
                              <strong>This letter changed elsewhere.</strong>
                              <p>
                                The saved version is{" "}
                                {conflict.currentContentVersion}, updated{" "}
                                {formatUpdatedAt(conflict.currentUpdatedAt)}{" "}
                                UTC. Your current writing is still here.
                              </p>
                              <button
                                className={styles.secondaryButton}
                                type="button"
                                disabled={pageQuery.isFetching}
                                onClick={() => void reloadAfterConflict()}
                              >
                                {pageQuery.isFetching
                                  ? "Loading latest version..."
                                  : "Reload saved version"}
                              </button>
                            </div>
                          ) : null}

                          {formError && !conflict ? (
                            <div className={styles.errorMessage} role="alert">
                              <span>{formError.message}</span>
                              {formError.requestId ? (
                                <span>Request ID: {formError.requestId}</span>
                              ) : null}
                              <button
                                className={styles.secondaryButton}
                                type="button"
                                disabled={isSaving || !online}
                                onClick={submitSave}
                              >
                                Retry save
                              </button>
                            </div>
                          ) : null}

                          {!online ? (
                            <p className={styles.offlineMessage} role="status">
                              You are offline. Your writing remains in this page
                              and can be saved when you reconnect.
                            </p>
                          ) : null}

                          {statusMessage ? (
                            <div className={styles.formFooter}>
                              <p
                                className={styles.statusMessage}
                                role="status"
                                aria-live="polite"
                              >
                                {statusMessage}
                              </p>
                            </div>
                          ) : null}
                        </form>
                      </section>

                      <section
                        id="content-workspace-panel-memories"
                        className="pt-3"
                        role="tabpanel"
                        aria-labelledby="content-workspace-tab-memories"
                        hidden={activeContentWorkspace !== "memories"}
                      >
                        <ImageEditor
                          key={page.id}
                          pageId={page.id}
                          savedVersion={page.contentVersion}
                          initialImages={page.images}
                          onChange={handleImageChange}
                          onDirtyChange={handleMediaDirtyChange}
                          onBusyChange={handleImageBusyChange}
                        />
                      </section>

                      <section
                        id="content-workspace-panel-music"
                        className="pt-3"
                        role="tabpanel"
                        aria-labelledby="content-workspace-tab-music"
                        hidden={activeContentWorkspace !== "music"}
                      >
                        <AudioEditor
                          pageId={page.id}
                          initialAudio={page.audio}
                          initialAudioRetry={page.audioRetry}
                        />
                      </section>

                      <section
                        id="content-workspace-panel-questions"
                        className="pt-3"
                        role="tabpanel"
                        aria-labelledby="content-workspace-tab-questions"
                        hidden={activeContentWorkspace !== "questions"}
                      >
                        <QuestionEditor
                          pageId={page.id}
                          savedVersion={page.contentVersion}
                          onChanged={() => {
                            void queryClient.invalidateQueries({
                              queryKey: pageKeys.detail(pageId),
                            });
                          }}
                        />
                      </section>

                      <div
                        className={styles.readinessBar}
                        aria-label="Letter readiness"
                      >
                        <ReadinessItem complete={Boolean(recipientName.trim())}>
                          Recipient added
                        </ReadinessItem>
                        <ReadinessItem complete={Boolean(mainMessage.trim())}>
                          Message added
                        </ReadinessItem>
                        <ReadinessItem complete={questionCount > 0}>
                          {questionCount > 0
                            ? `${questionCount} visitor ${questionCount === 1 ? "question" : "questions"} added`
                            : "Add questions to enable private responses"}
                        </ReadinessItem>
                        <ReadinessItem complete={includedReadyImageCount > 0}>
                          {includedReadyImageCount > 0
                            ? `${includedReadyImageCount} ${includedReadyImageCount === 1 ? "memory" : "memories"} added`
                            : "Memories are optional"}
                        </ReadinessItem>
                      </div>
                    </div>
                  </Card>
                </section>

                <section
                  id="editor-panel-overview"
                  className={styles.sectionPanel}
                  role="tabpanel"
                  aria-labelledby="editor-tab-overview"
                  hidden={activeSection !== "overview"}
                >
                  <EditorOverview
                    page={page}
                    questionReadiness={questionReadiness}
                    title={title}
                    recipientName={recipientName}
                    mainMessage={mainMessage}
                    creatorName={creatorName}
                    imageCount={includedReadyImageCount}
                    isDirty={hasUnsavedChanges}
                    isSaving={saveMutation.isPending}
                    onEditContent={() => changeSection("content")}
                    onChanged={() => {
                      void queryClient.invalidateQueries({
                        queryKey: pageKeys.detail(pageId),
                      });
                    }}
                  />
                </section>

                <section
                  id="editor-panel-viewers"
                  className={styles.sectionPanel}
                  role="tabpanel"
                  aria-labelledby="editor-tab-viewers"
                  hidden={activeSection !== "viewers"}
                >
                  <EditorViewers
                    page={page}
                    active={activeSection === "viewers"}
                    questionReadiness={questionReadiness}
                  />
                </section>

                <section
                  id="editor-panel-settings"
                  className={styles.sectionPanel}
                  role="tabpanel"
                  aria-labelledby="editor-tab-settings"
                  hidden={activeSection !== "settings"}
                >
                  <EditorSettings
                    page={page}
                    questionReadiness={questionReadiness}
                    onChanged={() => {
                      void queryClient.invalidateQueries({
                        queryKey: pageKeys.detail(pageId),
                      });
                    }}
                    dangerZone={
                      <DeletePageControl
                        pageId={page.id}
                        idSuffix="-settings"
                        embedded
                      />
                    }
                  />
                </section>
              </div>
            </div>
          </section>
          {activeSection === "settings" ? null : (
            <EditorLetterPreview
              title={title}
              recipientName={recipientName}
              mainMessage={mainMessage}
              creatorName={creatorName}
              images={previewImages}
              questions={questionsQuery.data ?? []}
              audio={page.audio}
            />
          )}
        </div>

        <footer className={styles.footer}>
          <p className={styles.footerStatus}>
            <span aria-hidden="true">✓</span>
            {statusMessage ||
              (isPublished
                ? hasUnsavedChanges
                  ? "Unsaved changes"
                  : "Published and up to date"
                : activeSection === "settings"
                  ? "All changes saved"
                  : "Draft saved just now")}
          </p>
          <div className={styles.footerActions}>
            {activeSection === "overview" ? (
              <button
                className={styles.footerSecondary}
                type="button"
                onClick={() => changeSection("content")}
              >
                <span aria-hidden="true">←</span>
                Back to Content
              </button>
            ) : null}
            {activeSection === "settings" ? (
              <button
                className={styles.footerSecondary}
                type="button"
                onClick={() => changeSection("viewers")}
              >
                <span aria-hidden="true">{"\u2190"}</span>
                Back to Viewers
              </button>
            ) : null}
            {activeSection !== "settings" ? (
              <a className={styles.footerSecondary} href="#letter-preview">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M3 12s3.2-5 9-5 9 5 9 5-3.2 5-9 5-9-5-9-5Z" />
                  <circle cx="12" cy="12" r="2.25" />
                </svg>
                Preview
              </a>
            ) : null}
            {isPublished ? (
              <button
                className={styles.footerPrimary}
                type="button"
                disabled={
                  !hasUnsavedChanges || isSaving || !online || Boolean(conflict)
                }
                aria-busy={isSaving}
                onClick={submitSave}
              >
                {isSaving ? "Saving changes..." : "Save changes"}
              </button>
            ) : null}
            {activeSection === "overview" ? (
              page.status === "PUBLISHED" ? (
                <Link className={styles.footerPrimary} href={`/p/${page.slug}`}>
                  View public letter
                </Link>
              ) : (
                <button
                  className={styles.footerPrimary}
                  type="submit"
                  form="publish-letter-form"
                >
                  Publish letter
                </button>
              )
            ) : activeSection === "settings" && page.status === "PUBLISHED" ? (
              <Link className={styles.footerPrimary} href={`/p/${page.slug}`}>
                View published letter
              </Link>
            ) : (
              <button
                className={styles.footerPrimary}
                type="button"
                onClick={() => changeSection("overview")}
              >
                Continue to Overview
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </footer>
      </div>
    </main>
  );
}
