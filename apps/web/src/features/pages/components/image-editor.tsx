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
      sizes="(max-width: 640px) 100vw, 144px"
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

function displayState(image: EditablePageImage): string | null {
  if (image.state === "READY" && image.included) return null;
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
  onChange: (images: EditablePageImage[]) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}

export function ImageEditor({
  pageId,
  savedVersion,
  initialImages,
  readOnly = false,
  onChange,
  onDirtyChange,
  onBusyChange,
}: ImageEditorProps): React.JSX.Element {
  const [images, setImages] = useState<EditablePageImage[]>(() =>
    initialImages.map(fromOwnerImage),
  );
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const imagesRef = useRef(images);
  const dirtyRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const savedVersionRef = useRef(savedVersion);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);

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
    if (readOnly) return;

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

      updateImages((current) => [...current, preparedImage]);
      await uploadImageSource({
        uploadUrl: prepared.uploadUrl,
        requiredHeaders: prepared.requiredHeaders,
        file,
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
      setBusy(false);
    }
  }

  async function retryFile(image: EditablePageImage): Promise<void> {
    if (readOnly) return;

    if (!image.file) {
      setErrorMessage("Choose the image again to retry this upload.");
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const retried = await retryImageUpload(pageId, image.imageId);
      await uploadImageSource({
        uploadUrl: retried.uploadUrl,
        requiredHeaders: retried.requiredHeaders,
        file: image.file,
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
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | File[]): void {
    if (readOnly) return;

    const selected = Array.from(files);
    void (async () => {
      for (const file of selected) await uploadFile(file);
    })();
  }

  function removeImage(image: EditablePageImage): void {
    if (readOnly) return;

    if (image.attached && image.included) {
      updateImages((current) =>
        current.map((currentImage) =>
          currentImage.imageId === image.imageId
            ? { ...currentImage, included: false }
            : currentImage,
        ),
      );
      return;
    }

    if (image.attached && !image.included) {
      updateImages((current) =>
        current.map((currentImage) =>
          currentImage.imageId === image.imageId
            ? { ...currentImage, included: true }
            : currentImage,
        ),
      );
      return;
    }

    if (image.replacementFor) {
      updateImages((current) =>
        current
          .filter((currentImage) => currentImage.imageId !== image.imageId)
          .map((currentImage) =>
            currentImage.imageId === image.replacementFor
              ? { ...currentImage, included: true }
              : currentImage,
          ),
      );
    } else {
      updateImages((current) =>
        current.filter(
          (currentImage) => currentImage.imageId !== image.imageId,
        ),
      );
    }

    if (image.localUrl) URL.revokeObjectURL(image.localUrl);
    if (!image.imageId.startsWith("local-")) {
      void removeImageUpload(pageId, image.imageId).catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The image could not be removed.",
        );
      });
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
    if (readOnly) return;

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
    if (readOnly) return;

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

  return (
    <section className={styles.panel} aria-labelledby="image-editor-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Memories</p>
          <h3 id="image-editor-title" className={styles.title}>
            Add up to 10 images
          </h3>
        </div>
        <span className={styles.count}>
          {images.filter((image) => image.included).length} / {MAX_IMAGES}{" "}
          images
        </span>
      </div>

      {!readOnly ? (
        <div
          className={styles.dropzone}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            handleFiles(event.dataTransfer.files);
          }}
        >
          <p className="text-small text-ink-muted">
            Drop images here, or choose them from your device.
          </p>
          <button
            className={styles.chooseButton}
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            Choose images
          </button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              if (event.target.files) handleFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>
      ) : null}

      {errorMessage ? (
        <p
          className="mt-3 rounded-small border border-rose bg-rose/10 px-3 py-2 text-small text-wine"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {visibleImages.length > 0 ? (
        <ol
          className={styles.imageList}
          aria-label="Letter images"
          aria-describedby="image-reorder-help"
        >
          <li id="image-reorder-help" className="sr-only">
            {readOnly
              ? "Published images are locked until this letter is unpublished."
              : "Drag ready image cards to reorder them. Focus a card and use the up and down arrow keys to move it."}
          </li>
          {visibleImages.map((image, index) => {
            const sortable = !readOnly && isSortableImage(image);
            const stateLabel = displayState(image);

            return (
              <li
                key={image.imageId}
                className={`${styles.imageCard} ${!image.included ? styles.imageCardMuted : ""} ${sortable ? styles.sortable : ""} ${dragOverImageId === image.imageId ? styles.dragOver : ""}`}
                draggable={sortable}
                tabIndex={sortable ? 0 : undefined}
                aria-label={
                  sortable ? `Image ${index + 1}. Drag to reorder.` : undefined
                }
                onDragStart={(event) => {
                  if (!sortable) {
                    event.preventDefault();
                    return;
                  }

                  setDraggedImageId(image.imageId);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", image.imageId);
                }}
                onDragOver={(event) => {
                  const sourceImageId =
                    draggedImageId || event.dataTransfer.getData("text/plain");

                  if (
                    !sortable ||
                    !sourceImageId ||
                    sourceImageId === image.imageId
                  ) {
                    return;
                  }

                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDragOverImageId(image.imageId);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const sourceImageId =
                    draggedImageId || event.dataTransfer.getData("text/plain");

                  if (sourceImageId && sortable) {
                    reorderImages(sourceImageId, image.imageId);
                  }
                  clearDragState();
                }}
                onDragEnd={clearDragState}
                onKeyDown={(event) => {
                  if (!sortable) return;

                  if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                    event.preventDefault();
                    moveImageByOffset(
                      image.imageId,
                      event.key === "ArrowUp" ? -1 : 1,
                    );
                  }
                }}
              >
                <div className={styles.imageLayout}>
                  <div className={styles.thumbnail}>
                    <ResilientImagePreview
                      key={`${image.imageId}:${image.localUrl ?? image.mediaUrl ?? "unavailable"}`}
                      localUrl={image.localUrl}
                      mediaUrl={image.mediaUrl}
                    />
                  </div>
                  <div className={styles.imageContent}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-small font-bold text-ink">
                        Image {index + 1}
                      </p>
                      {stateLabel ? (
                        <span className="text-small text-ink-muted">
                          {stateLabel}
                        </span>
                      ) : null}
                    </div>

                    {image.state === "READY" ? (
                      <label
                        className={styles.captionLabel}
                        htmlFor={`caption-${image.imageId}`}
                      >
                        Caption
                        <input
                          id={`caption-${image.imageId}`}
                          className={styles.captionInput}
                          maxLength={500}
                          value={image.caption ?? ""}
                          readOnly={readOnly}
                          aria-readonly={readOnly}
                          onChange={(event) =>
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
                      </label>
                    ) : null}

                    {!readOnly ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {image.state === "READY" && !image.included ? (
                          <button
                            className="min-h-11 rounded-small bg-wine px-3 py-2 text-small font-bold text-surface hover:bg-wine-hover"
                            type="button"
                            onClick={() =>
                              updateImages((current) =>
                                current.map((currentImage) =>
                                  currentImage.imageId === image.imageId
                                    ? { ...currentImage, included: true }
                                    : currentImage,
                                ),
                              )
                            }
                          >
                            Add to letter
                          </button>
                        ) : null}
                        {image.state === "FAILED" ? (
                          <button
                            className="min-h-11 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold text-ink hover:border-wine hover:text-wine disabled:opacity-60"
                            type="button"
                            disabled={busy}
                            onClick={() => void retryFile(image)}
                          >
                            Retry upload
                          </button>
                        ) : null}
                        {image.state === "READY" &&
                        image.included &&
                        image.attached ? (
                          <label className="min-h-11 cursor-pointer rounded-small border border-border bg-surface px-3 py-2 text-small font-bold text-ink hover:border-wine hover:text-wine">
                            Replace
                            <input
                              className="sr-only"
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) void uploadFile(file, image.imageId);
                                event.target.value = "";
                              }}
                            />
                          </label>
                        ) : null}
                        <button
                          className="min-h-11 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold text-ink hover:border-wine hover:text-wine disabled:opacity-60"
                          type="button"
                          disabled={busy}
                          onClick={() => removeImage(image)}
                        >
                          {image.attached
                            ? image.included
                              ? "Remove"
                              : "Undo remove"
                            : "Remove"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
