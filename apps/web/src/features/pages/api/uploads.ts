import { type ImageUploadResponse } from "@letterly/contracts/pages";
import { sha256 } from "@noble/hashes/sha2.js";
import axios from "axios";
import { toWebApiError } from "../../../lib/api/errors";

export async function uploadImageSource(input: {
  uploadUrl: string;
  requiredHeaders: ImageUploadResponse["requiredHeaders"];
  file: Blob;
  onProgress?: (percentage: number) => void;
}): Promise<void> {
  try {
    await axios.put(input.uploadUrl, input.file, {
      timeout: 180_000,
      headers: {
        "Content-Type": input.requiredHeaders.contentType,
        "x-amz-checksum-sha256": input.requiredHeaders.sha256,
      },
      onUploadProgress: (event) => {
        if (event.total && input.onProgress) {
          input.onProgress(
            Math.min(
              100,
              Math.max(0, Math.round((event.loaded / event.total) * 100)),
            ),
          );
        }
      },
    });
  } catch (error: unknown) {
    throw toWebApiError(error);
  }
}

export async function sha256Base64(value: Blob): Promise<string> {
  const buffer = await value.arrayBuffer();
  const subtle = globalThis.crypto?.subtle;
  const bytes = subtle?.digest
    ? new Uint8Array(await subtle.digest("SHA-256", buffer))
    : sha256(new Uint8Array(buffer));
  let binary = "";

  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary);
}
