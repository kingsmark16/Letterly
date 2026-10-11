import type {
  OwnerPageImage,
  SavePageRequest,
} from "@letterly/contracts/pages";

export type EditablePageImage = OwnerPageImage & {
  included: boolean;
  localUrl?: string;
  file?: File;
  replacementFor?: string;
};

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

export function sameImagePayload(
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

export function fromOwnerImage(image: OwnerPageImage): EditablePageImage {
  return {
    ...image,
    included: image.attached,
    caption: image.caption ?? "",
  };
}

export function displayState(image: EditablePageImage): string {
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
