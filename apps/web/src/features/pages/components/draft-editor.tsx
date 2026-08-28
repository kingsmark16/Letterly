"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@repo/ui/button";
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
import { PublishControls } from "./publish-controls";
import { QuestionEditor } from "./question-editor";
import { ChooseYourHeartEditor } from "./choose-your-heart-editor";
import { DashboardHeader } from "./dashboard-header";
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
import type {
  OwnerPageProjection,
  SavePageRequest,
} from "@letterly/contracts/pages";
import { savePageRequestSchema } from "@letterly/contracts/pages";
import styles from "./draft-editor.module.css";

interface DraftEditorProps {
  pageId: string;
}

type EditableSnapshot = Pick<SavePageRequest, "recipientName" | "mainMessage">;

const blankValues: SavePageRequest = {
  recipientName: "",
  mainMessage: "",
  expectedContentVersion: 0,
};

function valuesFromPage(page: OwnerPageProjection): SavePageRequest {
  return {
    recipientName: page.content.recipientName,
    mainMessage: page.content.mainMessage,
    expectedContentVersion: page.contentVersion,
  };
}

function snapshotFromValues(values: SavePageRequest): EditableSnapshot {
  return {
    recipientName: values.recipientName,
    mainMessage: values.mainMessage,
  };
}

function snapshotsEqual(
  first: EditableSnapshot,
  second: EditableSnapshot,
): boolean {
  return (
    first.recipientName === second.recipientName &&
    first.mainMessage === second.mainMessage
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
      router.push("/dashboard");
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
        <h2 id={`delete-page-title${idSuffix}`}>Delete this letter</h2>
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
  const mainMessage =
    useWatch({ control: form.control, name: "mainMessage" }) ?? "";
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
      !window.confirm("Leave while your changes are still saving?")
    ) {
      event.preventDefault();
      return;
    }

    router.prefetch("/");
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
      <main className={styles.page} aria-busy="true">
        <DashboardHeader />
        <div className={styles.loadingShell}>
          <p className={styles.eyebrow}>Your private page</p>
          <h1>Opening your letter...</h1>
          <div className={styles.loadingLine} />
          <div className={styles.loadingLineShort} />
        </div>
      </main>
    );
  }

  if (pageQuery.isError || !pageQuery.data) {
    const error = pageQuery.error;

    return (
      <main className={styles.page}>
        <DashboardHeader />
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
          <Link className={styles.textLink} href="/">
            Return home
          </Link>
        </div>
      </main>
    );
  }

  const page = pageQuery.data;

  if (page.template.key === "choose-your-heart") {
    return (
      <main className={styles.page}>
        <DashboardHeader
          contextAction={
            <Link href="/" onClick={leaveEditor}>
              Leave editor
            </Link>
          }
        />
        <div className={styles.editorShell}>
          <ChooseYourHeartEditor page={page} onDirtyChange={setJourneyDirty} />
          <DeletePageControl pageId={page.id} />
        </div>
      </main>
    );
  }

  const formError = saveMutation.error;
  const hasUnsavedChanges = form.formState.isDirty || mediaDirty;
  const recipientRegistration = form.register("recipientName", {
    onChange: () => scheduleAutosaveRef.current(true),
  });
  const messageRegistration = form.register("mainMessage", {
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

  return (
    <main className={styles.page}>
      <DashboardHeader
        contextAction={
          <Link href="/" onClick={leaveEditor}>
            Leave editor
          </Link>
        }
      />
      <div className={styles.editorShell}>
        <div className={styles.editorGrid}>
          <section
            className={styles.editorPane}
            aria-labelledby="draft-heading"
          >
            <h1 id="draft-heading" className="sr-only">
              {page.recipientLabel}
            </h1>

            <EditorSectionNav
              activeSection={activeSection}
              onChange={changeSection}
            />

            {isPublished ? (
              <p className={styles.readOnlyNotice} role="status">
                This letter is published and read only. Unpublish it to make
                changes.
              </p>
            ) : null}

            <section
              id="editor-panel-content"
              className={styles.sectionPanel}
              role="tabpanel"
              aria-labelledby="editor-tab-content"
              hidden={activeSection !== "content"}
            >
              <form onSubmit={(event) => event.preventDefault()} noValidate>
                <div className={styles.fieldGroup}>
                  <label htmlFor="recipientName">Who is this letter for?</label>
                  <input
                    id="recipientName"
                    type="text"
                    autoComplete="off"
                    readOnly={isPublished}
                    aria-readonly={isPublished}
                    aria-invalid={
                      form.formState.errors.recipientName ? true : undefined
                    }
                    aria-describedby="recipientName-help recipientName-error"
                    {...recipientRegistration}
                  />
                  <div className={styles.fieldMeta} id="recipientName-help">
                    <span>Optional for now</span>
                    <span>{countGraphemes(recipientName)} / 120</span>
                  </div>
                  {form.formState.errors.recipientName ? (
                    <p className={styles.fieldError} id="recipientName-error">
                      {form.formState.errors.recipientName.message}
                    </p>
                  ) : null}
                </div>

                <div className={styles.fieldGroup}>
                  <label htmlFor="mainMessage">Your message</label>
                  <textarea
                    id="mainMessage"
                    rows={12}
                    readOnly={isPublished}
                    aria-readonly={isPublished}
                    aria-invalid={
                      form.formState.errors.mainMessage ? true : undefined
                    }
                    aria-describedby="mainMessage-help mainMessage-error"
                    {...messageRegistration}
                  />
                  <div className={styles.fieldMeta} id="mainMessage-help">
                    <span>Take all the room you need</span>
                    <span>{countGraphemes(mainMessage)} / 20,000</span>
                  </div>
                  {form.formState.errors.mainMessage ? (
                    <p className={styles.fieldError} id="mainMessage-error">
                      {form.formState.errors.mainMessage.message}
                    </p>
                  ) : null}
                </div>

                {conflict ? (
                  <div className={styles.conflict} role="alert">
                    <strong>This letter changed elsewhere.</strong>
                    <p>
                      The saved version is {conflict.currentContentVersion},
                      updated {formatUpdatedAt(conflict.currentUpdatedAt)} UTC.
                      Your current writing is still here.
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
                      onClick={() => {
                        void form.handleSubmit(
                          (values) =>
                            mutateSave({
                              ...values,
                              images: saveableImages(imageDraftRef.current),
                            }),
                          () =>
                            setStatusMessage(
                              "Review the highlighted fields before saving.",
                            ),
                        )();
                      }}
                    >
                      Retry save
                    </button>
                  </div>
                ) : null}

                {!online ? (
                  <p className={styles.offlineMessage} role="status">
                    You are offline. Your writing remains in this page and will
                    save automatically when you reconnect.
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

              <ImageEditor
                key={page.id}
                pageId={page.id}
                savedVersion={page.contentVersion}
                initialImages={page.images}
                onChange={handleImageChange}
                onDirtyChange={handleMediaDirtyChange}
                onBusyChange={handleImageBusyChange}
                readOnly={isPublished}
              />

              <QuestionEditor
                pageId={page.id}
                savedVersion={page.contentVersion}
                onChanged={() => {
                  void queryClient.invalidateQueries({
                    queryKey: pageKeys.detail(pageId),
                  });
                }}
                readOnly={isPublished}
              />

              <PublishControls
                page={page}
                isDirty={hasUnsavedChanges}
                isSaving={saveMutation.isPending}
                recipientName={recipientName}
                mainMessage={mainMessage}
                onChanged={() => {
                  void queryClient.invalidateQueries({
                    queryKey: pageKeys.detail(pageId),
                  });
                }}
              />
            </section>

            <section
              id="editor-panel-overview"
              className={styles.sectionPanel}
              role="tabpanel"
              aria-labelledby="editor-tab-overview"
              hidden={activeSection !== "overview"}
            >
              <EditorOverview page={page} />
            </section>

            <section
              id="editor-panel-viewers"
              className={styles.sectionPanel}
              role="tabpanel"
              aria-labelledby="editor-tab-viewers"
              hidden={activeSection !== "viewers"}
            >
              <EditorViewers page={page} active={activeSection === "viewers"} />
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
                dangerZone={
                  <DeletePageControl
                    pageId={page.id}
                    idSuffix="-settings"
                    embedded
                  />
                }
              />
            </section>
          </section>
          <EditorLetterPreview
            recipientName={recipientName}
            mainMessage={mainMessage}
            images={previewImages}
            questionCount={questionCount}
          />
        </div>

        <footer className={styles.footer}>
          <span>Private by default.</span>
          <span>Your letter stays under your control.</span>
        </footer>
      </div>
    </main>
  );
}
