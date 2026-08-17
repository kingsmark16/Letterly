export * from './errors.js';
export * from './pages.js';
export * from './questions.js';
export * from './reports.js';
export * from './submissions.js';
export * from './visitor-identity.js';
import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export interface BlobStorage {
  createUploadUrl(input: {
    contentType: string;
    expiresInSeconds: number;
    key: string;
    sha256: string;
  }): Promise<{
    expiresAt: Date;
    key: string;
    uploadUrl: string;
    requiredHeaders: {
      contentType: string;
      sha256: string;
    };
  }>;
  deleteObject(key: string): Promise<void>;
  getObject(key: string): Promise<{
    body: Uint8Array;
    contentType: string | undefined;
    contentLength: number | undefined;
    checksumSha256: string | undefined;
  }>;
}

export interface RateLimitStore {
  consume(input: {
    key: string;
    limit: number;
    windowSeconds: number;
  }): Promise<{
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  }>;
}
