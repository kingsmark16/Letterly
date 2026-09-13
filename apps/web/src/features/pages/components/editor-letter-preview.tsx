"use client";

import type { OwnerPageAudio } from "@letterly/contracts/pages";
import type {
  EnabledPublicResponseDescription,
} from "@letterly/contracts/pages";
import type { PageQuestion } from "@letterly/contracts/questions";
import type { SecretLetterRenderModel } from "@letterly/templates";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { SecretLetterRenderer } from "../../../templates/secret-letter";
import type { EditablePageImage } from "./image-editor";
import { VisitorResponseForm } from "./visitor-response-form";

type PreviewViewport = "desktop" | "tablet" | "mobile";

const viewportOptions: Array<{
  id: PreviewViewport;
  label: string;
  description: string;
}> = [
  { id: "desktop", label: "Desktop", description: "Desktop canvas · 1040px" },
  { id: "tablet", label: "Tablet", description: "Tablet canvas · 768px" },
  { id: "mobile", label: "Mobile", description: "Mobile canvas · 390px" },
];

const viewportFrameClasses: Record<PreviewViewport, string> = {
  desktop: "w-[1040px]",
  tablet: "w-[48rem]",
  mobile: "w-[390px]",
};

const viewportWidths: Record<PreviewViewport, number> = {
  desktop: 1040,
  tablet: 768,
  mobile: 390,
};

const PREVIEW_RECIPIENT = "My Dearest";
const PREVIEW_MESSAGE = "Your heartfelt message will appear here.";

interface EditorLetterPreviewProps {
  title: string;
  recipientName: string;
  mainMessage: string;
  creatorName?: string;
  images: EditablePageImage[];
  questions: PageQuestion[];
  audio?: OwnerPageAudio;
}

function ViewportIcon({
  viewport,
}: {
  viewport: PreviewViewport;
}): React.JSX.Element {
  if (viewport === "desktop") {
    return (
      <svg
        className="h-4 w-4 fill-none stroke-current stroke-2"
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
        className="h-4 w-4 fill-none stroke-current stroke-2"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 6h6M11 18h2" />
      </svg>
    );
  }

  return (
    <svg
      className="h-4 w-4 fill-none stroke-current stroke-2"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function PreviewQuestionSummary({
  questionCount,
}: {
  questionCount: number;
}): React.JSX.Element {
  const questionLabel = `${questionCount} visitor question${questionCount === 1 ? "" : "s"}`;

  return (
    <div className="rounded-medium border border-border bg-surface px-5 py-6 text-center shadow-low">
      <p className="font-display text-heading-3 font-semibold leading-tight text-ink">
        {questionCount > 0
          ? `${questionLabel} ready`
          : "No visitor questions yet"}
      </p>
      <p className="mt-2 text-small leading-relaxed text-ink-muted">
        {questionCount > 0
          ? "Your recipient will see the interactive questions here."
          : "Add a question to preview the interactive response section."}
      </p>
    </div>
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
  title,
  recipientName,
  mainMessage,
  creatorName,
  images,
  questions,
  audio,
}: EditorLetterPreviewProps): React.JSX.Element {
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const previewStageRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);

  useEffect(() => {
    const stage = previewStageRef.current;
    if (!stage) return;

    const updateStageWidth = (): void => {
      setStageWidth(stage.clientWidth);
    };

    updateStageWidth();
    if (typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(updateStageWidth);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  const activeViewport =
    viewportOptions.find((option) => option.id === viewport) ??
    viewportOptions[0]!;

  const previewImages = images
    .filter(
      (image) =>
        Boolean(image.localUrl) ||
        (image.included && image.state === "READY" && Boolean(image.mediaUrl)),
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
    .slice(0, 10);

  const previewModel: SecretLetterRenderModel = {
    title: title.trim() || undefined,
    recipientName: recipientName.trim() || PREVIEW_RECIPIENT,
    mainMessage: mainMessage.trim() || PREVIEW_MESSAGE,
    creatorName: creatorName?.trim() || undefined,
    sections: [],
    images: previewImages,
  };
  const previewAudio =
    audio?.state === "READY" && audio.mediaUrl ? audio : undefined;
  const previewResponse = useMemo(
    () => previewResponseFromQuestions(questions),
    [questions],
  );
  const viewportWidth = viewportWidths[viewport];
  const availableStageWidth = Math.max(stageWidth - 32, 320);
  const previewScale = Math.min(1, availableStageWidth / viewportWidth);
  const frameWrapperStyle: CSSProperties = {
    width: `${viewportWidth * previewScale}px`,
  };
  const frameStyle: CSSProperties = {
    height: `${100 / previewScale}%`,
    transform: `scale(${previewScale})`,
    transformOrigin: "top left",
  };

  return (
    <aside
      id="letter-preview"
      className="sticky top-24 flex min-h-0 min-w-0 flex-col gap-3 self-start lg:h-[calc(100svh-7rem)] lg:max-h-[calc(100svh-7rem)]"
      aria-labelledby="letter-preview-heading"
    >
      <div className="flex min-h-12 items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <p
            id="letter-preview-heading"
            className="font-display text-heading-3 font-semibold leading-tight text-ink"
          >
            Live preview
          </p>
          <p className="mt-1 text-small text-ink-muted">
            {activeViewport.description}
          </p>
          <p className="sr-only" aria-live="polite">
            Showing the {activeViewport.label.toLowerCase()} letter preview.
          </p>
        </div>

        <div
          className="inline-flex shrink-0 items-center gap-1 rounded-small border border-border bg-surface p-1 shadow-low"
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
                aria-label={`${option.label} preview`}
                aria-pressed={isActive}
                data-active={isActive || undefined}
                className="grid min-h-11 min-w-11 place-items-center rounded-small border border-transparent px-2 text-ink-muted transition-[background-color,border-color,color,transform] duration-200 ease-standard hover:border-wine hover:text-wine focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.98] data-[active=true]:border-wine data-[active=true]:bg-surface-muted data-[active=true]:text-wine"
                onClick={() => setViewport(option.id)}
              >
                <ViewportIcon viewport={option.id} />
                <span className="sr-only">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex h-[min(36rem,calc(100svh-9rem))] min-h-0 min-w-0 flex-col overflow-hidden rounded-large border border-border bg-surface-muted p-3 shadow-medium sm:p-4 lg:h-auto lg:flex-1">
        <div
          ref={previewStageRef}
          className="flex min-h-0 min-w-0 flex-1 items-start justify-center overflow-hidden rounded-medium bg-canvas p-3 sm:p-4"
        >
          <div
            className="relative h-full shrink-0"
            style={frameWrapperStyle}
            data-preview-viewport={viewport}
          >
            <div
              className={`absolute left-0 top-0 h-full overflow-hidden rounded-medium border border-border bg-surface shadow-low ${viewportFrameClasses[viewport]}`}
              style={frameStyle}
            >
              <div
                ref={scrollContainerRef}
                className="h-full min-h-0 overflow-x-hidden overflow-y-auto [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset [&::-webkit-scrollbar]:hidden"
                role="region"
                aria-label="Letter preview content"
                tabIndex={0}
              >
                <SecretLetterRenderer
                  preview
                  autoOpen
                  model={previewModel}
                  previewScrollContainerRef={scrollContainerRef}
                  audioUrl={previewAudio?.mediaUrl ?? undefined}
                  audioTitle={previewAudio?.title}
                  audioDurationMilliseconds={previewAudio?.durationMilliseconds}
                >
                  {questions.length > 0 ? (
                    <VisitorResponseForm
                      preview
                      slug="editor-preview"
                      response={previewResponse}
                    />
                  ) : (
                    <PreviewQuestionSummary questionCount={0} />
                  )}
                </SecretLetterRenderer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
