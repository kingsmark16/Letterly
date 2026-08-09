export * from './errors.js';
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
  }): Promise<{
    expiresAt: Date;
    key: string;
    uploadUrl: string;
  }>;
  deleteObject(key: string): Promise<void>;
  getPublicUrl(key: string): string;
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
