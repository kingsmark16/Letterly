"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { LoadingState } from "../../../components/loading-state";
import { ConfirmationDialog } from "../../../components/confirmation-dialog";
import {
  countGraphemes,
  SECRET_LETTER_TITLE_MAX_GRAPHEMES,
  truncateGraphemes,
} from "@letterly/templates/secret-letter";
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
import { EditorAnalytics } from "./editor-analytics";
import {
  ImageEditor,
  saveableImages,
  type EditablePageImage,
} from "./image-editor";
import { AudioEditor } from "./audio-editor";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
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
type ContentWorkspaceIconName = "words" | "photos" | "music" | "questions";

const contentWorkspaceOptions: ReadonlyArray<{
  id: ContentWorkspace;
  icon: ContentWorkspaceIconName;
  label: string;
}> = [
  { id: "basics", icon: "words", label: "Words" },
  { id: "memories", icon: "photos", label: "Photos" },
  { id: "music", icon: "music", label: "Music" },
  { id: "questions", icon: "questions", label: "Questions" },
];

function ContentWorkspaceIcon({
  icon,
}: {
  icon: ContentWorkspaceIconName;
}): React.JSX.Element {
  return (
    <svg
      aria-hidden="true"
      className={styles.workspaceTabIcon}
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {icon === "words" ? (
        <>
          <path d="m5 16.75-.75 3 3-.75L18.5 7.75a2.12 2.12 0 0 0-3-3L5 16.75Z" />
          <path d="m13.75 6.25 3 3" />
        </>
      ) : null}
      {icon === "photos" ? (
        <>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
          <circle cx="9" cy="10" r="1.5" />
          <path d="m5 17 4.25-4.25 3 3 2.5-2.5L19 17" />
        </>
      ) : null}
      {icon === "music" ? (
        <>
          <path d="M9 18V5.75l10-2V16" />
          <ellipse cx="6.5" cy="18.5" rx="2.5" ry="1.75" />
          <ellipse cx="16.5" cy="16.5" rx="2.5" ry="1.75" />
        </>
      ) : null}
      {icon === "questions" ? (
        <>
          <path d="M20 11.5a8 8 0 0 1-8 8H7l-3 1v-4.25A8 8 0 1 1 20 11.5Z" />
          <path d="M10 9.25a2 2 0 1 1 3.5 1.25c-.75.8-1.5 1.1-1.5 2.5" />
          <path d="M12 16h.01" />
        </>
      ) : null}
    </svg>
  );
}

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteMutation = useMutation<void, WebApiError>({
    mutationFn: () => deletePage(pageId),
    onSuccess: () => {
      setDeleteOpen(false);
      queryClient.removeQueries({ queryKey: pageKeys.detail(pageId) });
      void queryClient.invalidateQueries({ queryKey: pageKeys.all });
      router.push("/dashboard/pages");
    },
    onError: (error) => setErrorMessage(error.message),
  });

  function handleDelete(): void {
    setErrorMessage(null);
    deleteMutation.mutate();
  }

  return (
    <section
      className={`${styles.deletePanel} ${embedded ? styles.deletePanelEmbedded : ""}`}
      aria-labelledby={`delete-page-title${idSuffix}`}
    >
      {embedded ? (
        <span className={styles.deleteIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <path d="M3 6h18M8 6V4h8v2M5 6l1 15h12l1-15M10 11v5m4-5v5" />
          </svg>
        </span>
      ) : null}
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
        onClick={() => {
          setErrorMessage(null);
          setDeleteOpen(true);
        }}
      >
        {deleteMutation.isPending ? "Deleting..." : "Delete permanently"}
      </button>
      {errorMessage ? (
        <p className={styles.deleteError} role="alert">
          {errorMessage}
        </p>
      ) : null}
      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this letter permanently?"
        description="Your letter and its responses will be permanently removed, and its public link will stop working. This cannot be undone."
        confirmLabel="Delete permanently"
        cancelLabel="Keep letter"
        pendingLabel="Deleting..."
        pending={deleteMutation.isPending}
        error={errorMessage}
        onConfirm={handleDelete}
      />
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
  const [leaveOpen, setLeaveOpen] = useState(false);
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
      setStatusMessage("");
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
      setStatusMessage("");
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
  const {
    mutate: mutateSave,
    mutateAsync: mutateSaveAsync,
    isPending: isSaving,
  } = saveMutation;

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

  const handleRemoveAttachedImage = useCallback(
    async (imageId: string): Promise<void> => {
      if (isSaving) {
        throw new Error("Wait for the current save to finish, then try again.");
      }
      if (!online) {
        throw new Error(
          "Reconnect to the internet before removing this photo.",
        );
      }
      if (conflict) {
        throw new Error(
          "Resolve the save conflict before removing this photo.",
        );
      }

      const previousImages = imageDraftRef.current;
      const nextImages = previousImages.filter(
        (image) => image.imageId !== imageId,
      );
      if (nextImages.length === previousImages.length) return;

      const previousMediaDirty = mediaDirtyRef.current;
      imageDraftRef.current = nextImages;
      mediaDirtyRef.current = true;
      setMediaDirty(true);

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }

      let saved = false;
      try {
        await form.handleSubmit(
          async (values) => {
            await mutateSaveAsync({
              ...values,
              images: saveableImages(nextImages),
            });
            saved = true;
          },
          () => {
            setStatusMessage(
              "Review the required fields before removing this photo.",
            );
          },
        )();

        if (!saved) {
          throw new Error(
            "Complete the required fields before removing this photo.",
          );
        }
      } catch (error: unknown) {
        imageDraftRef.current = previousImages;
        mediaDirtyRef.current = previousMediaDirty;
        setMediaDirty(previousMediaDirty);
        throw error;
      }
    },
    [conflict, form, isSaving, mutateSaveAsync, online],
  );

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
    if (form.formState.isDirty || mediaDirty || journeyDirty) {
      event.preventDefault();
      setLeaveOpen(true);
      return;
    }

    router.prefetch("/dashboard/pages");
  }

  const requestedSection = searchParams.get("section");
  const activeSection: EditorSection =
    (requestedSection === "analytics" || requestedSection === "viewers") &&
    isPublished
      ? "analytics"
      : requestedSection === "content" ||
          requestedSection === "preview" ||
          requestedSection === "overview" ||
          requestedSection === "settings"
        ? requestedSection
        : "preview";
  const activeContentWorkspaceIndex = contentWorkspaceOptions.findIndex(
    (workspace) => workspace.id === activeContentWorkspace,
  );
  const previousContentWorkspace =
    contentWorkspaceOptions[activeContentWorkspaceIndex - 1]?.id ?? null;
  const nextContentWorkspace =
    contentWorkspaceOptions[activeContentWorkspaceIndex + 1]?.id ?? null;

  function changeSection(section: EditorSection): void {
    const nextParams = new URLSearchParams(searchParams.toString());
    if (section === "preview") {
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
      <LoadingState
        variant="page"
        id="dashboard-content"
        title="Opening your letter"
        description="Getting your saved words and memories ready."
      />
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
            Return to Pages
          </Link>
        </div>
      </main>
    );
  }

  const page = pageQuery.data;

  const leaveConfirmation = (
    <ConfirmationDialog
      open={leaveOpen}
      onOpenChange={setLeaveOpen}
      title="Leave with unsaved changes?"
      description="Your latest changes have not been saved. Leaving now may discard them."
      confirmLabel="Leave page"
      cancelLabel="Keep editing"
      destructive={false}
      onConfirm={() => {
        setLeaveOpen(false);
        router.push("/dashboard/pages");
      }}
    />
  );

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
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M19 12H5m7 7-7-7 7-7" />
              </svg>
              <span>Back</span>
            </Link>
          </div>
          <ChooseYourHeartEditor page={page} onDirtyChange={setJourneyDirty} />
          <DeletePageControl pageId={page.id} />
        </div>
        {leaveConfirmation}
      </main>
    );
  }

  const formError = saveMutation.error;
  const hasUnsavedChanges = form.formState.isDirty || mediaDirty;
  const saveStatus = conflict
    ? "Save conflict. Review your changes below."
    : !online
      ? "Offline. Changes have not saved."
      : isSaving
        ? "Saving changes…"
        : formError
          ? "Changes could not be saved."
          : hasUnsavedChanges
            ? isPublished
              ? "Unsaved changes. Save to update your public letter."
              : "Changes will save automatically."
            : "All changes saved.";
  const visibleStatusMessage =
    statusMessage === "Your changes are saved." ? "" : statusMessage;

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
  const titleRegistration = form.register("title");
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
  const currentQuestions = questionsQuery.data ?? [];
  const questionCount = currentQuestions.length;
  const choiceQuestionCount = currentQuestions.filter(
    (question) => question.type === "CHOICE",
  ).length;
  const choiceCount = currentQuestions.reduce(
    (total, question) =>
      total + (question.type === "CHOICE" ? question.choices.length : 0),
    0,
  );
  const includedReadyImages = previewImages.filter(
    (image) =>
      image.included &&
      image.state === "READY" &&
      Boolean(image.localUrl || image.mediaUrl),
  );
  const includedReadyImageCount = includedReadyImages.length;
  const photoCaptionCount = includedReadyImages.filter((image) =>
    Boolean(image.caption?.trim()),
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
    <main
      className={styles.page}
      data-editor-page="true"
      data-expanded-preview={activeSection === "preview" ? "true" : undefined}
      data-editor-workspace={activeContentWorkspace}
      data-editor-section={activeSection}
      id="dashboard-content"
    >
      <div className={styles.editorShell}>
        <h1 className="sr-only">Edit letter</h1>
        <p className="sr-only" role="status" aria-live="polite">
          {saveStatus}
        </p>
        <div className={styles.editorTopline}>
          <Link
            className={styles.backLink}
            href="/dashboard/pages"
            onClick={leaveEditor}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M19 12H5m7 7-7-7 7-7" />
            </svg>
            <span>Back</span>
          </Link>
          <EditorSectionNav
            activeSection={activeSection}
            onChange={changeSection}
            published={isPublished}
          />
        </div>

        <div
          className={`${styles.editorGrid} ${
            activeSection === "content" ? styles.editorGridWriting : ""
          }`}
        >
          <div className={styles.editorPane}>
            <div className={styles.editorContent}>
              {isPublished &&
              hasUnsavedChanges &&
              activeSection === "content" ? (
                <p className={styles.readOnlyNotice} role="status">
                  Your public letter stays as it is until you save these edits.
                </p>
              ) : null}

              <section
                id="editor-panel-content"
                className={`${styles.sectionPanel} ${styles.contentPanel}`}
                role="tabpanel"
                aria-labelledby="editor-tab-content"
                hidden={activeSection !== "content"}
              >
                <section
                  id="content-workspace"
                  aria-label="Letter content"
                  className={styles.contentWorkspace}
                >
                  <Tabs
                    value={activeContentWorkspace}
                    onValueChange={(value) => {
                      const workspace = contentWorkspaceOptions.find(
                        (option) => option.id === value,
                      );
                      if (workspace) {
                        setActiveContentWorkspace(workspace.id);
                      }
                    }}
                    className={styles.contentWorkspaceTabs}
                  >
                    <TabsList
                      className={styles.workspaceTabs}
                      aria-label="Letter content areas"
                    >
                      {contentWorkspaceOptions.map((workspace) => (
                        <TabsTrigger
                          key={workspace.id}
                          value={workspace.id}
                          className={styles.workspaceTab}
                        >
                          <ContentWorkspaceIcon icon={workspace.icon} />
                          <span className={styles.workspaceTabLabel}>
                            {workspace.label}
                          </span>
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <div className={`${styles.contentWorkspacePanels} min-h-0`}>
                      <TabsContent
                        value="basics"
                        forceMount
                        className={`${styles.workspacePanel} pt-1`}
                      >
                        <form
                          className={styles.contentWorkspaceForm}
                          onSubmit={(event) => event.preventDefault()}
                          noValidate
                        >
                          <section className={styles.contentSection}>
                            <div className={styles.fieldGroup}>
                              <div className={styles.fieldLabelRow}>
                                <label htmlFor="title">
                                  Title{" "}
                                  <span className={styles.fieldQualifier}>
                                    (optional)
                                  </span>
                                </label>
                                <span
                                  className={styles.fieldCounter}
                                  id="title-count"
                                >
                                  {countGraphemes(title)} /{" "}
                                  {SECRET_LETTER_TITLE_MAX_GRAPHEMES}
                                </span>
                              </div>
                              <input
                                id="title"
                                type="text"
                                autoComplete="off"
                                placeholder="For you, always"
                                aria-invalid={
                                  form.formState.errors.title ? true : undefined
                                }
                                aria-describedby={`title-help title-count${form.formState.errors.title ? " title-error" : ""}`}
                                {...titleRegistration}
                                onChange={(event) => {
                                  const input = event.currentTarget;
                                  const limitedTitle = truncateGraphemes(
                                    input.value,
                                    SECRET_LETTER_TITLE_MAX_GRAPHEMES,
                                  );

                                  if (limitedTitle !== input.value) {
                                    input.value = limitedTitle;
                                    input.setSelectionRange(
                                      limitedTitle.length,
                                      limitedTitle.length,
                                    );
                                  }

                                  void titleRegistration.onChange(event);
                                  scheduleAutosaveRef.current(true);
                                }}
                              />
                              <div className={styles.fieldMeta} id="title-help">
                                <span>
                                  Appears at the top. Leave blank to use the
                                  template title.
                                </span>
                              </div>
                              {form.formState.errors.title ? (
                                <p
                                  className={styles.fieldError}
                                  id="title-error"
                                >
                                  {form.formState.errors.title.message}
                                </p>
                              ) : null}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className={`${styles.fieldGroup} min-w-0`}>
                                <div className={styles.fieldLabelRow}>
                                  <label htmlFor="recipientName">
                                    To{" "}
                                    <span className={styles.fieldQualifier}>
                                      (required)
                                    </span>
                                  </label>
                                  <span
                                    className={styles.fieldCounter}
                                    id="recipientName-help"
                                  >
                                    {countGraphemes(recipientName)} / 120
                                  </span>
                                </div>
                                <input
                                  id="recipientName"
                                  type="text"
                                  autoComplete="off"
                                  placeholder="e.g. Maria"
                                  aria-invalid={
                                    form.formState.errors.recipientName
                                      ? true
                                      : undefined
                                  }
                                  aria-describedby={`recipientName-help${form.formState.errors.recipientName ? " recipientName-error" : ""}`}
                                  {...recipientRegistration}
                                />
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
                              <div className={`${styles.fieldGroup} min-w-0`}>
                                <div className={styles.fieldLabelRow}>
                                  <label htmlFor="creatorName">
                                    From{" "}
                                    <span className={styles.fieldQualifier}>
                                      (optional)
                                    </span>
                                  </label>
                                  <span
                                    className={styles.fieldCounter}
                                    id="creatorName-help"
                                  >
                                    {countGraphemes(creatorName)} / 120
                                  </span>
                                </div>
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
                                  aria-describedby={`creatorName-help${form.formState.errors.creatorName ? " creatorName-error" : ""}`}
                                  {...creatorRegistration}
                                />
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
                            <div
                              className={`${styles.contentSectionHeading} ${styles.messageSectionHeading}`}
                            >
                              <h2
                                id="message-section-title"
                                className={styles.messageSectionTitle}
                              >
                                Your message
                              </h2>
                              <span className={styles.fieldQualifier}>
                                (required)
                              </span>
                              <span
                                className={styles.fieldCounter}
                                id="mainMessage-help"
                              >
                                {countGraphemes(mainMessage)} / 20,000
                              </span>
                            </div>
                            <div className={styles.fieldGroup}>
                              <label htmlFor="mainMessage" className="sr-only">
                                Your message (required)
                              </label>
                              <div className={styles.messageEditor}>
                                <textarea
                                  id="mainMessage"
                                  rows={12}
                                  required
                                  placeholder="Dear…"
                                  aria-invalid={
                                    form.formState.errors.mainMessage
                                      ? true
                                      : undefined
                                  }
                                  aria-describedby={`mainMessage-help${form.formState.errors.mainMessage ? " mainMessage-error" : ""}`}
                                  {...messageRegistration}
                                />
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
                                Your writing is still here. Reloading the saved
                                letter will replace these unsaved changes.
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

                          {visibleStatusMessage ? (
                            <div className={styles.formFooter}>
                              <p
                                className={styles.statusMessage}
                                role="status"
                                aria-live="polite"
                              >
                                {visibleStatusMessage}
                              </p>
                            </div>
                          ) : null}
                        </form>
                      </TabsContent>

                      <TabsContent
                        value="memories"
                        forceMount
                        className={`${styles.workspacePanel} pt-1`}
                      >
                        <ImageEditor
                          key={page.id}
                          pageId={page.id}
                          savedVersion={page.contentVersion}
                          initialImages={page.images}
                          isSaving={isSaving}
                          onRemoveAttachedImage={handleRemoveAttachedImage}
                          onChange={handleImageChange}
                          onDirtyChange={handleMediaDirtyChange}
                          onBusyChange={handleImageBusyChange}
                        />
                      </TabsContent>

                      <TabsContent
                        value="music"
                        forceMount
                        className={`${styles.workspacePanel} pt-1`}
                      >
                        <AudioEditor
                          pageId={page.id}
                          initialAudio={page.audio}
                          initialAudioRetry={page.audioRetry}
                          initialAudioLink={page.audioLink}
                          audioSourceOptions={page.audioSourceOptions}
                          active={
                            activeSection === "content" &&
                            activeContentWorkspace === "music"
                          }
                        />
                      </TabsContent>

                      <TabsContent
                        value="questions"
                        forceMount
                        className={`${styles.workspacePanel} pt-1`}
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
                      </TabsContent>
                    </div>
                  </Tabs>
                  <div
                    className={styles.sectionStepNavigation}
                    role="group"
                    aria-label="Content navigation"
                  >
                    {previousContentWorkspace ? (
                      <button
                        className={styles.footerSecondary}
                        type="button"
                        onClick={() => {
                          setActiveContentWorkspace(previousContentWorkspace);
                        }}
                      >
                        Back
                      </button>
                    ) : null}
                    <button
                      className={
                        isPublished && hasUnsavedChanges
                          ? styles.footerSecondary
                          : styles.footerPrimary
                      }
                      type="button"
                      onClick={() => {
                        if (nextContentWorkspace) {
                          setActiveContentWorkspace(nextContentWorkspace);
                        } else {
                          changeSection("overview");
                        }
                      }}
                    >
                      {nextContentWorkspace ? "Next" : "Finish"}
                    </button>
                    {isPublished && hasUnsavedChanges ? (
                      <button
                        className={styles.footerPrimary}
                        type="button"
                        disabled={isSaving || !online || Boolean(conflict)}
                        aria-busy={isSaving}
                        onClick={submitSave}
                      >
                        {isSaving ? "Saving…" : "Save changes"}
                      </button>
                    ) : null}
                  </div>
                </section>
              </section>

              <section
                id="editor-panel-preview"
                className={`${styles.sectionPanel} ${styles.previewPanel}`}
                role="tabpanel"
                aria-labelledby="editor-tab-preview"
                hidden={activeSection !== "preview"}
              >
                {activeSection === "preview" ? (
                  <EditorLetterPreview
                    standalone
                    title={title}
                    recipientName={recipientName}
                    mainMessage={mainMessage}
                    creatorName={creatorName}
                    images={previewImages}
                    questions={currentQuestions}
                    audio={page.audio}
                    audioLink={page.audioLink}
                    pageId={page.id}
                  />
                ) : null}
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
                  photoCaptionCount={photoCaptionCount}
                  choiceQuestionCount={choiceQuestionCount}
                  choiceCount={choiceCount}
                  isDirty={hasUnsavedChanges}
                  isSaving={saveMutation.isPending}
                  onEditContent={() => {
                    setActiveContentWorkspace("basics");
                    changeSection("content");
                  }}
                  onChanged={() => {
                    void queryClient.invalidateQueries({
                      queryKey: pageKeys.detail(pageId),
                    });
                  }}
                />
              </section>

              {isPublished ? (
                <section
                  id="editor-panel-analytics"
                  className={styles.sectionPanel}
                  role="tabpanel"
                  aria-labelledby="editor-tab-analytics"
                  hidden={activeSection !== "analytics"}
                >
                  <EditorAnalytics
                    page={page}
                    active={activeSection === "analytics"}
                  />
                </section>
              ) : null}

              <section
                id="editor-panel-settings"
                className={styles.sectionPanel}
                role="tabpanel"
                aria-labelledby="editor-tab-settings"
                hidden={activeSection !== "settings"}
              >
                <EditorSettings
                  page={page}
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
          {activeSection === "content" ? (
            <div className={styles.inlinePreview}>
              <EditorLetterPreview
                title={title}
                recipientName={recipientName}
                mainMessage={mainMessage}
                creatorName={creatorName}
                images={previewImages}
                questions={currentQuestions}
                audio={page.audio}
                audioLink={page.audioLink}
                pageId={page.id}
              />
            </div>
          ) : null}
        </div>
      </div>
      {leaveConfirmation}
    </main>
  );
}
