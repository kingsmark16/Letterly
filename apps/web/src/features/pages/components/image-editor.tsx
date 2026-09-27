"use client";

import {
  completeImageUpload,
  prepareImageUpload,
  removeImageUpload,
  retryImageUpload,
  sha256Base64,
  uploadImageSource,
  WebApiError,
} from "../../../lib/api-client";
import type {
  OwnerPageImage,
  SavePageRequest,
} from "@letterly/contracts/pages";
import {
  countGraphemes,
  hasAtMostGraphemes,
} from "@letterly/templates/graphemes";
import { IMAGE_CAPTION_MAX_GRAPHEMES } from "@letterly/templates/media";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./image-editor.module.css";

const MAX_SOURCE_BYTES = 10_485_760;
const MAX_IMAGES = 10;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type EditablePageImage = OwnerPageImage & {
  included: boolean;
  localUrl?: string;
  file?: File;
  replacementFor?: string;
};

const PREVIEW_LOAD_ATTEMPTS = 3;
const PREVIEW_RETRY_BASE_DELAY_MS = 250;

function retryableMediaUrl(source: string, attempt: number): string {
  if (attempt === 0 || !source.startsWith("/")) return source;

  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}previewAttempt=${attempt}`;
}

function ResilientImagePreview({
  localUrl,
  mediaUrl,
}: {
  localUrl?: string;
  mediaUrl: string | null;
}): React.JSX.Element {
  const initialSource = localUrl ?? mediaUrl;
  const [source, setSource] = useState(initialSource);
  const [attempt, setAttempt] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    },
    [],
  );

  if (!source) {
    return (
      <span className="px-4 text-center text-small text-ink-muted">
        Image preview unavailable
      </span>
    );
  }

  return (
    <Image
      key={`${source}:${attempt}`}
      className="h-full w-full object-cover"
      src={retryableMediaUrl(source, attempt)}
      alt=""
      fill
      sizes="(max-width: 640px) 76vw, (max-width: 1200px) 38vw, 520px"
      unoptimized
      onLoad={() => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      }}
      onError={() => {
        if (source === localUrl && mediaUrl) {
          setSource(mediaUrl);
          setAttempt(0);
          return;
        }

        if (attempt + 1 >= PREVIEW_LOAD_ATTEMPTS) return;

        retryTimeoutRef.current = setTimeout(
          () => {
            setAttempt((current) => current + 1);
            retryTimeoutRef.current = null;
          },
          PREVIEW_RETRY_BASE_DELAY_MS * 2 ** attempt,
        );
      }}
    />
  );
}

export function saveableImages(
  images: EditablePageImage[],
): NonNullable<SavePageRequest["images"]> {
  return [...images]
    .filter((image) => image.included && image.state === "READY")
    .sort((first, second) => {
      const firstOrder = first.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const secondOrder = second.sortOrder ?? Number.MAX_SAFE_INTEGER;
      return firstOrder - secondOrder;
    })
    .map((image, sortOrder) => ({
      imageId: image.imageId,
      sortOrder,
      ...(image.caption?.trim() ? { caption: image.caption.trim() } : {}),
    }));
}

function sameImagePayload(
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

function fromOwnerImage(image: OwnerPageImage): EditablePageImage {
  return {
    ...image,
    included: image.attached,
    caption: image.caption ?? "",
  };
}

function displayState(image: EditablePageImage): string {
  if (image.state === "READY" && image.included) return "";
  if (image.state === "READY" && image.attached) return "Removed from letter";
  if (image.state === "READY") return "Ready to add";
  if (image.state === "FAILED") return "Upload needs attention";
  if (image.state === "UPLOADING") return "Uploading";
  if (image.state === "VERIFYING" || image.state === "SANITIZING") {
    return "Checking image";
  }
  return "Expired";
}

interface ImageEditorProps {
  pageId: string;
  savedVersion: number;
  initialImages: OwnerPageImage[];
  readOnly?: boolean;
  isSaving: boolean;
  onRemoveAttachedImage: (imageId: string) => Promise<void>;
  onChange: (images: EditablePageImage[]) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}

type ImageUploadPhase = "preparing" | "uploading" | "verifying";

interface ImageUploadProgress {
  fileName: string;
  phase: ImageUploadPhase;
  percentage: number;
}

export function ImageEditor({
  pageId,
  savedVersion,
  initialImages,
  readOnly = false,
  isSaving,
  onRemoveAttachedImage,
  onChange,
  onDirtyChange,
  onBusyChange,
}: ImageEditorProps): React.JSX.Element {
  const [images, setImages] = useState<EditablePageImage[]>(() =>
    initialImages.map(fromOwnerImage),
  );
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] =
    useState<ImageUploadProgress | null>(null);
  const [removingImageId, setRemovingImageId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const controlsLocked = busy || isSaving || removingImageId !== null;
  const imagesRef = useRef(images);
  const dirtyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedVersionRef = useRef(savedVersion);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    dirtyRef.current = false;
    onDirtyChange(false);
  }, [onDirtyChange, readOnly]);

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  useEffect(() => {
    onChange(images);
  }, [images, onChange]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    if (savedVersionRef.current === savedVersion) return;

    savedVersionRef.current = savedVersion;
    const next = initialImages.map(fromOwnerImage);

    if (
      dirtyRef.current &&
      (imagesRef.current.some((image) => image.state !== "READY") ||
        !sameImagePayload(
          saveableImages(imagesRef.current),
          saveableImages(next),
        ))
    ) {
      return;
    }

    for (const current of imagesRef.current) {
      if (current.localUrl) URL.revokeObjectURL(current.localUrl);
    }

    imagesRef.current = next;
    setImages(next);
    dirtyRef.current = false;
    onDirtyChange(false);
  }, [initialImages, onDirtyChange, savedVersion]);

  useEffect(
    () => () => {
      for (const image of imagesRef.current) {
        if (image.localUrl) URL.revokeObjectURL(image.localUrl);
      }
    },
    [],
  );

  function updateImages(
    updater: (current: EditablePageImage[]) => EditablePageImage[],
    dirty = true,
  ): void {
    if (readOnly && dirty) return;

    if (dirty) {
      dirtyRef.current = true;
      onDirtyChange(true);
    }

    setImages((current) => {
      const next = updater(current);
      imagesRef.current = next;
      return next;
    });
  }

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return "Choose a JPEG, PNG, or WebP image.";
    }

    if (file.size > MAX_SOURCE_BYTES) {
      return "Each image must be 10 MiB or smaller.";
    }

    return null;
  }

  async function uploadFile(
    file: File,
    replacementFor?: string,
  ): Promise<void> {
    if (readOnly || controlsLocked) return;

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const currentIncluded = imagesRef.current.filter(
      (image) => image.included && image.state === "READY",
    ).length;
    if (!replacementFor && currentIncluded >= MAX_IMAGES) {
      setErrorMessage("A letter can include up to 10 images.");
      return;
    }

    setBusy(true);
    setUploadProgress({
      fileName: file.name,
      phase: "preparing",
      percentage: 0,
    });
    setErrorMessage(null);

    try {
      const sha256 = await sha256Base64(file);
      const prepared = await prepareImageUpload(pageId, {
        contentType: file.type as "image/jpeg" | "image/png" | "image/webp",
        byteSize: file.size,
        sha256,
        ...(replacementFor ? { replaceImageId: replacementFor } : {}),
      });
      const localUrl = URL.createObjectURL(file);
      const preparedImage: EditablePageImage = {
        imageId: prepared.imageId,
        state: "UPLOADING",
        attached: false,
        sortOrder: null,
        mediaUrl: null,
        caption: "",
        failureCode: null,
        expiresAt: prepared.uploadExpiresAt,
        included: false,
        localUrl,
        file,
        ...(replacementFor ? { replacementFor } : {}),
      };

      setActiveImageId(prepared.imageId);
      updateImages((current) => [...current, preparedImage]);
      setUploadProgress({
        fileName: file.name,
        phase: "uploading",
        percentage: 0,
      });
      await uploadImageSource({
        uploadUrl: prepared.uploadUrl,
        requiredHeaders: prepared.requiredHeaders,
        file,
        onProgress: (percentage) =>
          setUploadProgress({
            fileName: file.name,
            phase: "uploading",
            percentage,
          }),
      });
      setUploadProgress({
        fileName: file.name,
        phase: "verifying",
        percentage: 100,
      });
      const completed = await completeImageUpload(pageId, prepared.imageId);

      updateImages((current) =>
        current.map((image) => {
          if (image.imageId === prepared.imageId) {
            return {
              ...image,
              state: completed.state,
              mediaUrl: completed.mediaUrl,
              width: completed.width,
              height: completed.height,
              failureCode: completed.failureCode,
              included: completed.state === "READY",
            };
          }

          if (
            replacementFor &&
            image.imageId === replacementFor &&
            completed.state === "READY"
          ) {
            return { ...image, included: false };
          }

          return image;
        }),
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "The image could not be uploaded.";
      setErrorMessage(message);
      if (error instanceof WebApiError && error.code === "IMAGE_PROCESSING") {
        return;
      }

      updateImages((current) =>
        current.map((image) =>
          image.file === file && image.state !== "READY"
            ? { ...image, state: "FAILED", failureCode: "UPLOAD_FAILED" }
            : image,
        ),
      );
    } finally {
      setUploadProgress(null);
      setBusy(false);
    }
  }

  async function retryFile(image: EditablePageImage): Promise<void> {
    if (readOnly || controlsLocked) return;

    if (!image.file) {
      setErrorMessage("Choose the image again to retry this upload.");
      return;
    }

    setBusy(true);
    setUploadProgress({
      fileName: image.file.name,
      phase: "preparing",
      percentage: 0,
    });
    setErrorMessage(null);
    try {
      const retried = await retryImageUpload(pageId, image.imageId);
      setUploadProgress({
        fileName: image.file.name,
        phase: "uploading",
        percentage: 0,
      });
      await uploadImageSource({
        uploadUrl: retried.uploadUrl,
        requiredHeaders: retried.requiredHeaders,
        file: image.file,
        onProgress: (percentage) =>
          setUploadProgress({
            fileName: image.file?.name ?? "photo",
            phase: "uploading",
            percentage,
          }),
      });
      setUploadProgress({
        fileName: image.file.name,
        phase: "verifying",
        percentage: 100,
      });
      const completed = await completeImageUpload(pageId, image.imageId);
      updateImages((current) =>
        current.map((currentImage) =>
          currentImage.imageId === image.imageId
            ? {
                ...currentImage,
                state: completed.state,
                mediaUrl: completed.mediaUrl,
                width: completed.width,
                height: completed.height,
                failureCode: completed.failureCode,
                included: completed.state === "READY",
              }
            : currentImage,
        ),
      );
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The image could not be retried.",
      );
      updateImages((current) =>
        current.map((currentImage) =>
          currentImage.imageId === image.imageId
            ? { ...currentImage, state: "FAILED", failureCode: "UPLOAD_FAILED" }
            : currentImage,
        ),
      );
    } finally {
      setUploadProgress(null);
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | File[]): void {
    if (readOnly || controlsLocked) return;

    const selected = Array.from(files);
    void (async () => {
      for (const file of selected) await uploadFile(file);
    })();
  }

  async function removeImage(image: EditablePageImage): Promise<void> {
    if (readOnly || controlsLocked) return;

    setRemovingImageId(image.imageId);
    setErrorMessage(null);

    try {
      if (image.attached) {
        await onRemoveAttachedImage(image.imageId);
        dirtyRef.current = false;
        onDirtyChange(false);
      } else if (!image.imageId.startsWith("local-")) {
        await removeImageUpload(pageId, image.imageId);
      }

      updateImages(
        (current) =>
          current.filter(
            (currentImage) => currentImage.imageId !== image.imageId,
          ),
        !image.attached,
      );

      if (image.localUrl) URL.revokeObjectURL(image.localUrl);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The image could not be removed.",
      );
    } finally {
      setRemovingImageId(null);
    }
  }

  function sortableImages(): EditablePageImage[] {
    return imagesRef.current
      .filter((image) => image.included && image.state === "READY")
      .sort(
        (first, second) => (first.sortOrder ?? 99) - (second.sortOrder ?? 99),
      );
  }

  function reorderImages(sourceImageId: string, targetImageId: string): void {
    if (readOnly || controlsLocked) return;

    if (sourceImageId === targetImageId) return;

    const ordered = sortableImages();
    const sourceIndex = ordered.findIndex(
      (image) => image.imageId === sourceImageId,
    );
    const targetIndex = ordered.findIndex(
      (image) => image.imageId === targetImageId,
    );

    if (sourceIndex < 0 || targetIndex < 0) return;

    const reordered = [...ordered];
    const [moved] = reordered.splice(sourceIndex, 1);
    if (moved) reordered.splice(targetIndex, 0, moved);
    const orderById = new Map(
      reordered.map((image, sortOrder) => [image.imageId, sortOrder]),
    );

    updateImages((current) =>
      current.map((image) =>
        orderById.has(image.imageId)
          ? { ...image, sortOrder: orderById.get(image.imageId) ?? null }
          : image,
      ),
    );
  }

  function moveImageByOffset(imageId: string, offset: -1 | 1): void {
    if (readOnly || controlsLocked) return;

    const ordered = sortableImages();
    const index = ordered.findIndex((image) => image.imageId === imageId);
    const target = ordered[index + offset];

    if (!target) return;
    reorderImages(imageId, target.imageId);
  }

  function isSortableImage(image: EditablePageImage): boolean {
    return image.included && image.state === "READY";
  }

  function clearDragState(): void {
    setDraggedImageId(null);
    setDragOverImageId(null);
  }

  const visibleImages = [...images].sort((first, second) => {
    if (first.included !== second.included) return first.included ? -1 : 1;
    return (first.sortOrder ?? 99) - (second.sortOrder ?? 99);
  });
  const includedImageCount = images.filter((image) => image.included).length;
  const canAddImages = !readOnly && includedImageCount < MAX_IMAGES;
  const selectedIndex = visibleImages.findIndex(
    (image) => image.imageId === activeImageId,
  );
  const activeIndex =
    selectedIndex >= 0 ? selectedIndex : Math.floor(visibleImages.length / 2);
  const activePhoto = visibleImages[activeIndex];
  const activePhotoIsRemoving = activePhoto?.imageId === removingImageId;
  const carouselImages = visibleImages
    .map((image, index) => {
      let offset = index - activeIndex;
      if (offset > Math.floor(visibleImages.length / 2)) {
        offset -= visibleImages.length;
      } else if (offset < -Math.floor(visibleImages.length / 2)) {
        offset += visibleImages.length;
      }
      return { image, index, offset };
    })
    .filter(({ offset }) => Math.abs(offset) <= 2)
    .sort((first, second) => first.offset - second.offset);

  function showImageAt(index: number): void {
    if (visibleImages.length === 0) return;
    const nextIndex = (index + visibleImages.length) % visibleImages.length;
    setActiveImageId(visibleImages[nextIndex]?.imageId ?? null);
  }

  return (
    <section
      className={styles.panel}
      aria-labelledby="image-editor-title"
      onDragOver={(event) => {
        if (controlsLocked) return;
        if (!Array.from(event.dataTransfer.types).includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        if (controlsLocked) return;
        if (event.dataTransfer.files.length === 0) return;
        event.preventDefault();
        handleFiles(event.dataTransfer.files);
      }}
    >
      <div className={styles.heading}>
        <div className={styles.sectionHeading}>
          <div className={styles.titleRow}>
            <div className={styles.titleLabel}>
              <h2 id="image-editor-title" className={styles.title}>
                Add Photos
              </h2>
              <span className={styles.optional}>(optional)</span>
            </div>
            <span
              className={styles.count}
              aria-label={`${includedImageCount} of ${MAX_IMAGES} photos`}
            >
              {includedImageCount} / {MAX_IMAGES} photos
            </span>
          </div>
          {readOnly ? (
            <p className={styles.description}>Photos included in this letter.</p>
          ) : null}
        </div>
        <div className={styles.headingActions}>
          {!readOnly ? (
            <div className={styles.uploadGroup}>
              <button
                className={styles.addPhotosButton}
                type="button"
                disabled={controlsLocked || !canAddImages}
                aria-describedby="photo-upload-help"
                onClick={() => inputRef.current?.click()}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M12 16V3m0 0L7.5 7.5M12 3l4.5 4.5M4 16.5v3A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-3" />
                </svg>
                Upload Photos
              </button>
              <p id="photo-upload-help" className={styles.uploadHelp}>
                {canAddImages
                  ? "Choose or drag and drop JPG, PNG, or WebP files (max 10 MiB each)."
                  : "Remove a photo to upload another. The limit is 10 photos."}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {!readOnly ? (
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          tabIndex={-1}
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={controlsLocked || !canAddImages}
          aria-label="Upload photos"
          onChange={(event) => {
            if (event.target.files) handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      ) : null}

      {errorMessage ? (
        <p className={styles.errorMessage} role="alert">
          {errorMessage}
        </p>
      ) : null}

      {uploadProgress ? (
        <div className={styles.uploadProgress}>
          <div className={styles.uploadProgressHeader}>
            <span
              className={styles.uploadProgressStatus}
              role="status"
              aria-live="polite"
            >
              {uploadProgress.phase === "preparing"
                ? "Preparing photo"
                : uploadProgress.phase === "uploading"
                  ? "Uploading photo"
                  : "Finishing upload"}{" "}
              <span className={styles.uploadProgressFile}>
                {uploadProgress.fileName}
              </span>
            </span>
            {uploadProgress.phase === "uploading" ? (
              <span aria-hidden="true">{uploadProgress.percentage}%</span>
            ) : null}
          </div>
          <div
            className={styles.uploadProgressTrack}
            role="progressbar"
            aria-label={"Photo upload progress for " + uploadProgress.fileName}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={
              uploadProgress.phase === "uploading"
                ? uploadProgress.percentage
                : undefined
            }
          >
            <span
              data-indeterminate={
                uploadProgress.phase !== "uploading" || undefined
              }
              style={
                uploadProgress.phase === "uploading"
                  ? { width: uploadProgress.percentage + "%" }
                  : undefined
              }
            />
          </div>
        </div>
      ) : null}

      {visibleImages.length === 0 ? (
        <div className={styles.emptyMessage}>
          <svg aria-hidden="true" viewBox="0 0 48 48">
            <rect x="5" y="8" width="38" height="32" rx="5" />
            <circle cx="16" cy="18" r="3" />
            <path d="m8 34 11-10 7 6 6-7 8 9" />
          </svg>
          <p>No photos yet</p>
          <span>
            {readOnly
              ? "This letter has no photos."
              : "Upload a photo to start your letter's gallery."}
          </span>
        </div>
      ) : (
        <div
          className={styles.carousel}
          role="region"
          aria-roledescription="carousel"
          aria-label="Letter photos"
        >
          <p id="image-reorder-help" className="sr-only">
            {readOnly
              ? "Published photos are locked until this letter is unpublished."
              : "Use the photo arrows to navigate. Drag photos to reorder, or focus the selected photo and use the up and down arrow keys to move it."}
          </p>
          <p className="sr-only" aria-live="polite">
            Photo {activeIndex + 1} of {visibleImages.length}
          </p>
          <div
            className={styles.carouselStage}
            onTouchStart={(event) => {
              if (
                event.target instanceof Element &&
                event.target.closest("button, input, label, textarea")
              ) {
                touchStartXRef.current = null;
                return;
              }
              touchStartXRef.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const start = touchStartXRef.current;
              touchStartXRef.current = null;
              if (start === null || controlsLocked) return;
              const end = event.changedTouches[0]?.clientX;
              if (end === undefined) return;
              const distance = end - start;
              if (Math.abs(distance) > 48) {
                showImageAt(activeIndex + (distance < 0 ? 1 : -1));
              }
            }}
          >
            <ol
              className={styles.carouselTrack}
              aria-describedby="image-reorder-help"
            >
              {carouselImages.map(({ image, index, offset }) => {
                const active = offset === 0;
                const near = Math.abs(offset) === 1;
                const sortable =
                  !readOnly && !controlsLocked && isSortableImage(image);
                const isRemoving = removingImageId === image.imageId;
                const captionLength = countGraphemes(image.caption ?? "");
                const stateLabel = displayState(image);
                return (
                  <li
                    key={image.imageId}
                    className={[
                      styles.imageCard,
                      !image.included ? styles.imageCardMuted : "",
                      dragOverImageId === image.imageId ? styles.dragOver : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-position={offset}
                    data-removing={isRemoving || undefined}
                    aria-label={
                      "Photo " + (index + 1) + " of " + visibleImages.length
                    }
                    aria-hidden={!active && !near ? true : undefined}
                    draggable={sortable}
                    tabIndex={active && sortable ? 0 : undefined}
                    onDragStart={(event) => {
                      if (
                        !sortable ||
                        (event.target instanceof Element &&
                          event.target.closest(
                            "button, input, label, textarea",
                          ))
                      ) {
                        event.preventDefault();
                        return;
                      }
                      setDraggedImageId(image.imageId);
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", image.imageId);
                    }}
                    onDragOver={(event) => {
                      const sourceImageId =
                        draggedImageId ||
                        event.dataTransfer.getData("text/plain");
                      if (
                        !sortable ||
                        !sourceImageId ||
                        sourceImageId === image.imageId
                      )
                        return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverImageId(image.imageId);
                    }}
                    onDrop={(event) => {
                      if (event.dataTransfer.files.length > 0) return;
                      event.preventDefault();
                      const sourceImageId =
                        draggedImageId ||
                        event.dataTransfer.getData("text/plain");
                      if (sourceImageId && sortable) {
                        reorderImages(sourceImageId, image.imageId);
                      }
                      clearDragState();
                    }}
                    onDragEnd={clearDragState}
                    onKeyDown={(event) => {
                      if (!sortable || event.target !== event.currentTarget)
                        return;
                      if (
                        event.key === "ArrowUp" ||
                        event.key === "ArrowDown"
                      ) {
                        event.preventDefault();
                        moveImageByOffset(
                          image.imageId,
                          event.key === "ArrowUp" ? -1 : 1,
                        );
                      }
                    }}
                  >
                    <div className={styles.photoSurface}>
                      <ResilientImagePreview
                        key={
                          image.imageId +
                          ":" +
                          (image.localUrl ?? image.mediaUrl ?? "unavailable")
                        }
                        localUrl={image.localUrl}
                        mediaUrl={image.mediaUrl}
                      />
                    </div>
                    {!active && near ? (
                      <button
                        className={styles.selectPhoto}
                        type="button"
                        aria-label={"Show photo " + (index + 1)}
                        disabled={controlsLocked}
                        onClick={() => setActiveImageId(image.imageId)}
                      />
                    ) : null}
                    {active || near ? (
                      <div className={styles.captionPanel}>
                        {active ? (
                          <>
                            {image.state === "READY" ? (
                              <div className={styles.captionEntry}>
                                <label htmlFor={"caption-" + image.imageId}>
                                  Caption
                                </label>
                                <span
                                  className={styles.captionCount}
                                  id={"caption-" + image.imageId + "-count"}
                                  data-limit-reached={
                                    captionLength >=
                                      IMAGE_CAPTION_MAX_GRAPHEMES || undefined
                                  }
                                >
                                  {captionLength} /{" "}
                                  {IMAGE_CAPTION_MAX_GRAPHEMES}
                                </span>
                                <textarea
                                  id={"caption-" + image.imageId}
                                  className={styles.captionInput}
                                  value={image.caption ?? ""}
                                  placeholder="Add a caption for this photo"
                                  rows={2}
                                  readOnly={readOnly || controlsLocked}
                                  aria-readonly={readOnly || controlsLocked}
                                  aria-describedby={
                                    "caption-" + image.imageId + "-count"
                                  }
                                  onChange={(event) =>
                                    hasAtMostGraphemes(
                                      event.target.value,
                                      IMAGE_CAPTION_MAX_GRAPHEMES,
                                    ) &&
                                    updateImages((current) =>
                                      current.map((currentImage) =>
                                        currentImage.imageId === image.imageId
                                          ? {
                                              ...currentImage,
                                              caption: event.target.value,
                                            }
                                          : currentImage,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            ) : (
                              <p className={styles.processingState}>
                                {stateLabel}
                              </p>
                            )}
                            {!readOnly && image.state === "FAILED" ? (
                              <div className={styles.imageActions}>
                                <button
                                  className={[
                                    styles.actionButton,
                                    styles.secondaryAction,
                                  ].join(" ")}
                                  type="button"
                                  disabled={controlsLocked}
                                  onClick={() => void retryFile(image)}
                                >
                                  Retry upload
                                </button>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <p className={styles.sideCaption}>
                              {image.caption?.trim() ||
                                (image.state === "READY"
                                  ? readOnly
                                    ? "No caption"
                                    : "Add a caption"
                                  : stateLabel)}
                            </p>
                            <span className={styles.sideCaptionCount}>
                              {captionLength} / {IMAGE_CAPTION_MAX_GRAPHEMES}
                            </span>
                          </>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
            {visibleImages.length > 1 ? (
              <>
                <button
                  className={[
                    styles.carouselArrow,
                    styles.carouselArrowPrevious,
                  ].join(" ")}
                  type="button"
                  aria-label="Previous photo"
                  disabled={controlsLocked}
                  onClick={() => showImageAt(activeIndex - 1)}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m15 4-8 8 8 8" />
                  </svg>
                </button>
                <button
                  className={[
                    styles.carouselArrow,
                    styles.carouselArrowNext,
                  ].join(" ")}
                  type="button"
                  aria-label="Next photo"
                  disabled={controlsLocked}
                  onClick={() => showImageAt(activeIndex + 1)}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m9 4 8 8-8 8" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>
          {activePhoto &&
          !readOnly &&
          (activePhoto.included ||
            !activePhoto.attached ||
            activePhotoIsRemoving) ? (
            <div className={styles.removePhotoActions}>
              <button
                className={styles.removePhotoButton}
                type="button"
                aria-label={
                  activePhotoIsRemoving
                    ? "Removing photo " + (activeIndex + 1)
                    : activePhoto.attached
                      ? "Remove photo " +
                        (activeIndex + 1) +
                        " from the letter"
                      : "Delete uploaded photo " + (activeIndex + 1)
                }
                aria-busy={activePhotoIsRemoving || undefined}
                disabled={controlsLocked || activePhotoIsRemoving}
                onClick={() => void removeImage(activePhoto)}
              >
                {activePhotoIsRemoving ? (
                  <span
                    className={styles.removeSpinner}
                    aria-hidden="true"
                  />
                ) : (
                  <span className={styles.removePhotoIcon} aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path
                        d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"
                      />
                    </svg>
                  </span>
                )}
                <span>{activePhotoIsRemoving ? "Removing…" : "Remove"}</span>
              </button>
              {activePhotoIsRemoving ? (
                <span className="sr-only" role="status">
                  Removing photo {activeIndex + 1}.
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
