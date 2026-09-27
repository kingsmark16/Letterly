"use client";

import type { OwnerPageAudio, PageAudioLink } from "@letterly/contracts/pages";
import type { EnabledPublicResponseDescription } from "@letterly/contracts/pages";
import type { PageQuestion } from "@letterly/contracts/questions";
import type { SecretLetterRenderModel } from "@letterly/templates";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import type { EditablePageImage } from "./image-editor";
import styles from "./editor-letter-preview.module.css";
import {
  editorLetterPreviewChannel,
  isEditorLetterPreviewReadyMessage,
  type EditorLetterPreviewPayload,
} from "./editor-letter-preview-protocol";

type PreviewViewport = "desktop" | "tablet" | "mobile";

const viewportOptions: Array<{
  id: PreviewViewport;
  label: string;
  description: string;
}> = [
  { id: "desktop", label: "Desktop", description: "1280 × 720 px" },
  { id: "tablet", label: "Tablet", description: "1024 × 768 px" },
  { id: "mobile", label: "Mobile", description: "390 × 748 px" },
];

const PREVIEW_ZOOM_FACTOR = 1.25;

const viewportDimensions: Record<
  PreviewViewport,
  {
    width: number;
    height: number;
    bezelX: number;
    bezelY: number;
    topChrome: number;
    bottomChrome: number;
  }
> = {
  desktop: {
    width: 1280,
    height: 720,
    bezelX: 1,
    bezelY: 1,
    topChrome: 44,
    bottomChrome: 0,
  },
  tablet: {
    width: 1024,
    height: 768,
    bezelX: 8,
    bezelY: 14,
    topChrome: 0,
    bottomChrome: 0,
  },
  mobile: {
    width: 390,
    height: 748,
    bezelX: 7,
    bezelY: 8,
    topChrome: 26,
    bottomChrome: 52,
  },
};

const PREVIEW_RECIPIENT = "My Dearest";
const PREVIEW_MESSAGE = "Your heartfelt message will appear here.";

function DesktopBrowserChrome(): React.JSX.Element {
  return (
    <div className={styles.desktopChrome} aria-hidden="true">
      <div className={styles.windowControls}>
        <span />
        <span />
        <span />
      </div>
      <div className={styles.addressBar}>
        <svg viewBox="0 0 16 16" focusable="false">
          <rect x="3.5" y="7" width="9" height="7" rx="1.5" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
        </svg>
        <span>Letterly preview</span>
      </div>
      <span className={styles.chromeMenu} />
    </div>
  );
}

function MobileStatusBar(): React.JSX.Element {
  return (
    <div className={styles.mobileStatusBar} aria-hidden="true">
      <span>9:41</span>
      <svg viewBox="0 0 42 16" focusable="false">
        <rect x="2" y="9" width="2" height="4" rx="0.5" />
        <rect x="7" y="6" width="2" height="7" rx="0.5" />
        <rect x="12" y="3" width="2" height="10" rx="0.5" />
        <path d="M19 6.2a8 8 0 0 1 11 0M21.5 9a4.5 4.5 0 0 1 6 0m-4.2 2.7a1.6 1.6 0 0 1 2.4 0" />
        <rect x="34" y="4" width="6" height="9" rx="1.5" />
        <path d="M36 2.5h2" />
      </svg>
    </div>
  );
}

function MobileBrowserChrome(): React.JSX.Element {
  return (
    <div className={styles.mobileBrowserChrome} aria-hidden="true">
      <span className={styles.browserBack}>
        <svg viewBox="0 0 20 20" focusable="false">
          <path d="m12.5 4.5-5.5 5.5 5.5 5.5" />
        </svg>
      </span>
      <div className={styles.mobileAddressBar}>
        <svg viewBox="0 0 16 16" focusable="false">
          <rect x="3.5" y="7" width="9" height="7" rx="1.5" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
        </svg>
        <span>Letterly preview</span>
      </div>
      <span className={styles.browserTabs}>
        <svg viewBox="0 0 20 20" focusable="false">
          <rect x="6.5" y="4.5" width="9" height="11" rx="1.5" />
          <path d="M4.5 7v8a1.5 1.5 0 0 0 1.5 1.5h7" />
        </svg>
      </span>
      <span className={styles.homeIndicator} />
    </div>
  );
}

interface EditorLetterPreviewProps {
  standalone?: boolean;
  title: string;
  recipientName: string;
  mainMessage: string;
  creatorName?: string;
  images: EditablePageImage[];
  questions: PageQuestion[];
  audio?: OwnerPageAudio;
  audioLink?: PageAudioLink;
  pageId: string;
}

function ViewportIcon({
  viewport,
}: {
  viewport: PreviewViewport;
}): React.JSX.Element {
  if (viewport === "desktop") {
    return (
      <svg
        className="h-3 w-3 fill-none stroke-current stroke-2"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 20h8M12 17v3" />
      </svg>
    );
  }

  if (viewport === "tablet") {
    return (
      <svg
        className="h-3 w-3 fill-none stroke-current stroke-2"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="3" y="7" width="18" height="10" rx="2" />
        <path d="M19 10.5v3" />
      </svg>
    );
  }

  return (
    <svg
      className="h-3 w-3 fill-none stroke-current stroke-2"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function previewResponseFromQuestions(
  questions: PageQuestion[],
): EnabledPublicResponseDescription {
  return {
    enabled: true,
    requiredAnswers: false,
    visitorMessageEnabled: false,
    visitorMessagePrompt: "Preview response",
    visitorMessagePrivacyText: "Preview only",
    visitorMessageMaxLength: 2000,
    textAnswerMaxLength: 2000,
    questions: questions.map((question) => ({
      id: question.id,
      type: question.type,
      prompt: question.prompt,
      displayOrder: question.displayOrder,
      choices: question.choices.map((choice) => ({
        id: choice.id,
        label: choice.label,
        displayOrder: choice.displayOrder,
      })),
    })),
  };
}

export function EditorLetterPreview({
  standalone = false,
  title,
  recipientName,
  mainMessage,
  creatorName,
  images,
  questions,
  audio,
  audioLink,
  pageId,
}: EditorLetterPreviewProps): React.JSX.Element {
  const [selectedViewport, setViewport] = useState<PreviewViewport | null>(
    null,
  );
  const previewStageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameReadyRef = useRef(false);
  const previewPayloadRef = useRef<EditorLetterPreviewPayload | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const stage = previewStageRef.current;
    if (!stage) return;

    const updateStageSize = (): void => {
      const padding = window.getComputedStyle(stage);
      const width =
        stage.clientWidth -
        Number.parseFloat(padding.paddingLeft) -
        Number.parseFloat(padding.paddingRight);
      const height =
        stage.clientHeight -
        Number.parseFloat(padding.paddingTop) -
        Number.parseFloat(padding.paddingBottom);
      setStageSize((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    updateStageSize();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateStageSize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const selectedViewportOrDefault =
    selectedViewport ??
    (stageSize.width === 0
      ? standalone
        ? "mobile"
        : "desktop"
      : stageSize.width < 540
        ? "mobile"
        : "desktop");
  const viewport = selectedViewportOrDefault;
  const activeViewport =
    viewportOptions.find((option) => option.id === viewport) ??
    viewportOptions[0]!;

  const previewImages = useMemo(
    () =>
      images
        .filter(
          (image) =>
            Boolean(image.localUrl) ||
            (image.included &&
              image.state === "READY" &&
              Boolean(image.mediaUrl)),
        )
        .flatMap((image) => {
          const mediaUrl = image.localUrl ?? image.mediaUrl;
          if (!mediaUrl) return [];

          return [
            {
              imageId: image.imageId,
              mediaUrl,
              caption: image.caption?.trim() || null,
            },
          ];
        })
        .slice(0, 10),
    [images],
  );

  const previewModel = useMemo<SecretLetterRenderModel>(
    () => ({
      title: title.trim() || undefined,
      recipientName: recipientName.trim() || PREVIEW_RECIPIENT,
      mainMessage: mainMessage.trim() || PREVIEW_MESSAGE,
      creatorName: creatorName?.trim() || undefined,
      sections: [],
      images: previewImages,
    }),
    [creatorName, mainMessage, previewImages, recipientName, title],
  );
  const previewAudio = useMemo(
    () =>
      audio?.state === "READY" && audio.mediaUrl
        ? {
            mediaUrl: audio.mediaUrl,
            title: audio.title,
            durationMilliseconds: audio.durationMilliseconds,
          }
        : null,
    [audio],
  );
  const previewResponse = useMemo(
    () =>
      questions.length > 0 ? previewResponseFromQuestions(questions) : null,
    [questions],
  );
  const previewPayload = useMemo<EditorLetterPreviewPayload>(
    () => ({
      model: previewModel,
      response: previewResponse,
      audio: previewAudio,
      audioLink: audioLink ?? null,
      audioMetadataUrl: audioLink
        ? `/api/v1/pages/${pageId}/audio/metadata`
        : null,
    }),
    [audioLink, pageId, previewAudio, previewModel, previewResponse],
  );
  previewPayloadRef.current = previewPayload;

  useEffect(() => {
    if (!frameReady) return;

    frameRef.current?.contentWindow?.postMessage(
      {
        channel: editorLetterPreviewChannel,
        type: "update",
        payload: previewPayload,
      },
      window.location.origin,
    );
  }, [frameReady, previewPayload]);

  useEffect(() => {
    function handleFrameMessage(event: MessageEvent<unknown>): void {
      const frameWindow = frameRef.current?.contentWindow;
      if (
        event.origin !== window.location.origin ||
        !frameWindow ||
        event.source !== frameWindow ||
        !isEditorLetterPreviewReadyMessage(event.data)
      ) {
        return;
      }

      if (frameReadyRef.current) {
        frameWindow.postMessage(
          {
            channel: editorLetterPreviewChannel,
            type: "update",
            payload: previewPayloadRef.current,
          },
          window.location.origin,
        );
        return;
      }

      frameReadyRef.current = true;
      setFrameReady(true);
    }

    window.addEventListener("message", handleFrameMessage);
    return () => window.removeEventListener("message", handleFrameMessage);
  }, []);

  const viewportDimensionsForSelection = viewportDimensions[viewport];
  const frameWidth =
    viewportDimensionsForSelection.width +
    viewportDimensionsForSelection.bezelX * 2 +
    2;
  const frameHeight =
    viewportDimensionsForSelection.height +
    viewportDimensionsForSelection.topChrome +
    viewportDimensionsForSelection.bottomChrome +
    viewportDimensionsForSelection.bezelY * 2 +
    2;
  const stageReady = stageSize.width > 0 && stageSize.height > 0;
  const availableStageWidth = Math.max(stageSize.width, 1);
  const availableStageHeight = Math.max(stageSize.height, 1);
  const previewScale = stageReady
    ? Math.min(
        PREVIEW_ZOOM_FACTOR,
        availableStageWidth / frameWidth,
        availableStageHeight / frameHeight,
      )
    : 0;
  const devicePlacementStyle: CSSProperties = {
    width: `${frameWidth * previewScale}px`,
    height: `${frameHeight * previewScale}px`,
  };
  const deviceFrameStyle: CSSProperties = {
    width: `${frameWidth}px`,
    height: `${frameHeight}px`,
    transform: `scale(${previewScale})`,
    transformOrigin: "top left",
  };
  const stagePadding = viewport === "mobile" ? "p-1 sm:p-2" : "p-2 sm:p-3";
  const previewFrameContainerClassName = standalone
    ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-large border border-border bg-surface-muted p-1 shadow-medium sm:p-2"
    : `flex h-[min(36rem,calc(100svh-9rem))] min-h-0 min-w-0 flex-col overflow-hidden rounded-large border border-border bg-surface-muted shadow-medium lg:h-auto lg:flex-1 ${stagePadding}`;

  return (
    <aside
      id="letter-preview"
      className={
        standalone
          ? "flex h-full min-h-0 min-w-0 flex-col gap-2"
          : `${styles.inlinePreviewAside} flex min-h-0 min-w-0 flex-col gap-2 self-start`
      }
      aria-labelledby="letter-preview-heading"
    >
      <div className="flex min-h-11 items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <p
            id="letter-preview-heading"
            className="font-display text-lg font-semibold leading-tight text-ink"
          >
            Live preview
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {activeViewport.description}
          </p>
          <p className="sr-only" aria-live="polite">
            Showing the {activeViewport.label.toLowerCase()} letter preview.
          </p>
        </div>

        <div className={styles.previewControls}>
          <div
            className={styles.viewportSelector}
            role="group"
            aria-label="Preview viewport"
          >
            {viewportOptions.map((option) => {
              const isActive = viewport === option.id;

              return (
                <button
                  key={option.id}
                  type="button"
                  title={`${option.label} preview`}
                  aria-label={`${option.label} preview, ${option.description}`}
                  aria-pressed={isActive}
                  data-active={isActive || undefined}
                  className={styles.viewportButton}
                  onClick={() => setViewport(option.id)}
                >
                  <ViewportIcon viewport={option.id} />
                  <span className="sr-only">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={previewFrameContainerClassName}>
        <div
          ref={previewStageRef}
          className={`${styles.previewStage} flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-medium bg-canvas ${stagePadding}`}
        >
          <div
            className={styles.devicePlacement}
            style={devicePlacementStyle}
            data-ready={stageReady || undefined}
          >
            <div
              className={styles.deviceFrame}
              data-device={viewport}
              style={deviceFrameStyle}
            >
              {viewport === "desktop" ? <DesktopBrowserChrome /> : null}
              {viewport === "mobile" ? <MobileStatusBar /> : null}

              <div
                className={styles.deviceScreen}
                data-device={viewport}
                style={{
                  width: `${viewportDimensionsForSelection.width}px`,
                  height: `${viewportDimensionsForSelection.height}px`,
                }}
              >
                <iframe
                  ref={frameRef}
                  className={styles.letterFrame}
                  title={`${activeViewport.label} letter preview`}
                  src="/editor-preview/secret-letter"
                  referrerPolicy="no-referrer"
                />
              </div>

              {viewport === "mobile" ? <MobileBrowserChrome /> : null}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
