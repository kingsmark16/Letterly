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
      sizes="(max-width: 640px) 100vw, 176px"
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
  if (image.state === "READY" && image.included)
    return "Included in this letter";
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
  onChange: (images: EditablePageImage[]) => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange?: (busy: boolean) => void;
}

export function ImageEditor({
  pageId,
  savedVersion,
  initialImages,
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

  useEffect(() => {
    dirtyRef.current = false;
    onDirtyChange(false);
  }, [onDirtyChange]);

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
    const selected = Array.from(files);
    void (async () => {
      for (const file of selected) await uploadFile(file);
    })();
  }

  function removeImage(image: EditablePageImage): void {
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

  function reorderImage(imageId: string, direction: -1 | 1): void {
    const ordered = imagesRef.current
      .filter((image) => image.included && image.state === "READY")
      .sort(
        (first, second) => (first.sortOrder ?? 99) - (second.sortOrder ?? 99),
      );
    const index = ordered.findIndex((image) => image.imageId === imageId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;

    const reordered = [...ordered];
    const [moved] = reordered.splice(index, 1);
    if (moved) reordered.splice(nextIndex, 0, moved);
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

  const visibleImages = [...images].sort((first, second) => {
    if (first.included !== second.included) return first.included ? -1 : 1;
    return (first.sortOrder ?? 99) - (second.sortOrder ?? 99);
  });

  return (
    <section
      className="mt-6 border-t border-border pt-5"
      aria-labelledby="image-editor-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-label font-bold uppercase tracking-[0.14em] text-wine">
            Memories
          </p>
          <h3
            id="image-editor-title"
            className="mt-2 font-display text-heading-3 font-semibold"
          >
            Add up to 10 images
          </h3>
          <p className="mt-2 max-w-xl text-small leading-relaxed text-ink-muted">
            Images are checked and cleaned before they can be saved or shared.
            Captions are optional.
          </p>
        </div>
        <span className="text-small text-ink-muted">
          {images.filter((image) => image.included).length} / {MAX_IMAGES}{" "}
          included
        </span>
      </div>

      <div
        className="mt-4 rounded-medium border border-dashed border-border bg-surface-muted p-4 text-center"
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
          className="mt-2 min-h-11 rounded-medium bg-wine px-4 py-2 text-small font-bold text-surface hover:bg-wine-hover disabled:cursor-wait disabled:opacity-60"
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

      {errorMessage ? (
        <p
          className="mt-3 rounded-small border border-rose bg-rose/10 px-3 py-2 text-small text-wine"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {visibleImages.length > 0 ? (
        <ol className="mt-4 grid gap-3" aria-label="Letter images">
          {visibleImages.map((image, index) => (
            <li
              key={image.imageId}
              className={`rounded-medium border border-border p-3 ${image.included ? "bg-surface" : "bg-surface-muted opacity-75"}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative grid aspect-[4/3] w-full shrink-0 place-items-center overflow-hidden rounded-small bg-canvas sm:w-36">
                  <ResilientImagePreview
                    key={`${image.imageId}:${image.localUrl ?? image.mediaUrl ?? "unavailable"}`}
                    localUrl={image.localUrl}
                    mediaUrl={image.mediaUrl}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-small font-bold text-ink">
                      Image {index + 1}
                    </p>
                    <span className="text-small text-ink-muted">
                      {displayState(image)}
                    </span>
                  </div>

                  {image.state === "READY" ? (
                    <label
                      className="mt-3 block text-small font-bold text-ink"
                      htmlFor={`caption-${image.imageId}`}
                    >
                      Optional caption
                      <input
                        id={`caption-${image.imageId}`}
                        className="mt-2 min-h-11 w-full rounded-small border border-border bg-surface px-3 py-2 font-normal outline-none focus:border-wine focus:ring-2 focus:ring-rose"
                        maxLength={500}
                        value={image.caption ?? ""}
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
                    {image.state === "READY" && image.included ? (
                      <>
                        <button
                          className="min-h-11 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold text-ink hover:border-wine hover:text-wine"
                          type="button"
                          disabled={busy}
                          onClick={() => reorderImage(image.imageId, -1)}
                        >
                          Move earlier
                        </button>
                        <button
                          className="min-h-11 rounded-small border border-border bg-surface px-3 py-2 text-small font-bold text-ink hover:border-wine hover:text-wine"
                          type="button"
                          disabled={busy}
                          onClick={() => reorderImage(image.imageId, 1)}
                        >
                          Move later
                        </button>
                      </>
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
                          ? "Remove on save"
                          : "Undo remove"
                        : "Remove"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
