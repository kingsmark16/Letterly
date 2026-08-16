import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { loadConfig } from '@letterly/config';
import { Agent as HttpsAgent } from 'node:https';
import {
  MediaStorageUnavailableError,
  type MediaStorage,
} from './media-storage';

const OBJECT_OPERATION_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 100;
const retryableStorageErrorCodes = new Set([
  'ECONNRESET',
  'EPIPE',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'InternalError',
  'RequestTimeout',
  'SlowDown',
  'TimeoutError',
]);

function isRetryableStorageError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;

  const candidate = error as {
    $metadata?: { httpStatusCode?: number };
    code?: string;
    name?: string;
  };
  const statusCode = candidate.$metadata?.httpStatusCode;

  return (
    (candidate.code !== undefined &&
      retryableStorageErrorCodes.has(candidate.code)) ||
    (candidate.name !== undefined &&
      retryableStorageErrorCodes.has(candidate.name)) ||
    (statusCode !== undefined && statusCode >= 500)
  );
}

async function waitBeforeRetry(attempt: number): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
  });
}

@Injectable()
export class R2Storage implements MediaStorage {
  private client: S3Client | null = null;
  private bucket: string | null = null;

  async createUploadUrl(input: {
    contentType: string;
    expiresInSeconds: number;
    key: string;
    sha256: string;
  }): Promise<{
    expiresAt: Date;
    key: string;
    uploadUrl: string;
    requiredHeaders: { contentType: string; sha256: string };
  }> {
    const { client, bucket } = this.getClient();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.contentType,
      ChecksumSHA256: input.sha256,
    });
    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: input.expiresInSeconds,
      unhoistableHeaders: new Set(['x-amz-checksum-sha256']),
    });
    const expiresAt = new Date(Date.now() + input.expiresInSeconds * 1000);

    return {
      expiresAt,
      key: input.key,
      uploadUrl,
      requiredHeaders: {
        contentType: input.contentType,
        sha256: input.sha256,
      },
    };
  }

  async getObject(key: string): Promise<{
    body: Buffer;
    contentType: string | undefined;
    contentLength: number | undefined;
    checksumSha256: string | undefined;
  }> {
    const { client, bucket } = this.getClient();

    for (let attempt = 1; attempt <= OBJECT_OPERATION_ATTEMPTS; attempt += 1) {
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
            ChecksumMode: 'ENABLED',
          }),
        );

        if (!response.Body) {
          throw new MediaStorageUnavailableError();
        }

        return {
          body: Buffer.from(await response.Body.transformToByteArray()),
          contentType: response.ContentType,
          contentLength: response.ContentLength,
          checksumSha256: response.ChecksumSHA256,
        };
      } catch (error: unknown) {
        if (
          attempt === OBJECT_OPERATION_ATTEMPTS ||
          !isRetryableStorageError(error)
        ) {
          throw error;
        }

        await waitBeforeRetry(attempt);
      }
    }

    throw new MediaStorageUnavailableError();
  }

  async putObject(input: {
    body: Buffer;
    contentType: string;
    key: string;
  }): Promise<void> {
    const { client, bucket } = this.getClient();
    await this.sendWithRetry(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    const { client, bucket } = this.getClient();
    await this.sendWithRetry(
      client,
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );
  }

  private async sendWithRetry(
    client: S3Client,
    command: PutObjectCommand | DeleteObjectCommand,
  ): Promise<void> {
    for (let attempt = 1; attempt <= OBJECT_OPERATION_ATTEMPTS; attempt += 1) {
      try {
        await client.send(command);
        return;
      } catch (error: unknown) {
        if (
          attempt === OBJECT_OPERATION_ATTEMPTS ||
          !isRetryableStorageError(error)
        ) {
          throw error;
        }

        await waitBeforeRetry(attempt);
      }
    }
  }

  private getClient(): { client: S3Client; bucket: string } {
    if (this.client && this.bucket) {
      return { client: this.client, bucket: this.bucket };
    }

    const config = loadConfig();

    if (
      !config.R2_ENDPOINT ||
      !config.R2_BUCKET ||
      !config.R2_ACCESS_KEY_ID ||
      !config.R2_SECRET_ACCESS_KEY
    ) {
      throw new MediaStorageUnavailableError();
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: config.R2_ENDPOINT,
      forcePathStyle: true,
      maxAttempts: 1,
      requestHandler: {
        connectionTimeout: 20_000,
        socketTimeout: 60_000,
        httpsAgent: new HttpsAgent({
          keepAlive: true,
          maxSockets: 20,
          family: 4,
          autoSelectFamily: false,
        }),
      },
      credentials: {
        accessKeyId: config.R2_ACCESS_KEY_ID,
        secretAccessKey: config.R2_SECRET_ACCESS_KEY,
      },
    });
    this.bucket = config.R2_BUCKET;

    return { client: this.client, bucket: this.bucket };
  }
}
