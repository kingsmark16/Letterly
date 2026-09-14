import { createHash } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type {
  AuthEmailType,
  AuthMailPort,
  AuthMailResult,
} from '@letterly/contracts';
import type { AppConfig } from '@letterly/config';
import type {
  CreateEmailOptions,
  CreateEmailRequestOptions,
  CreateEmailResponse,
} from 'resend';

export const AUTH_EMAIL_TIMEOUT_MS = 10_000;
export const AUTH_EMAIL_MAX_ATTEMPTS = 3;
export const AUTH_EMAIL_RETRY_BASE_MS = 250;

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';

type AuthMailFailureCategory = Extract<
  AuthMailResult,
  { ok: false }
>['category'];

type ResendEmailSender = {
  send(
    payload: CreateEmailOptions,
    options?: CreateEmailRequestOptions,
  ): Promise<CreateEmailResponse>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getSafeProviderError(statusCode: number): CreateEmailResponse {
  const name =
    statusCode === 429
      ? 'rate_limit_exceeded'
      : statusCode >= 500
        ? 'internal_server_error'
        : 'application_error';

  return {
    data: null,
    error: {
      name,
      statusCode,
      message: 'Authentication email provider request failed',
    },
    headers: null,
  };
}

function createResendEmailSender(apiKey: string): ResendEmailSender {
  return {
    async send(payload, options = {}) {
      const headers = new Headers({
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      });

      if (options.headers) {
        for (const [key, value] of new Headers(options.headers).entries()) {
          headers.set(key, value);
        }
      }

      if (options.idempotencyKey) {
        headers.set('Idempotency-Key', options.idempotencyKey);
      }

      const response = await fetch(RESEND_EMAILS_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          from: payload.from,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          ...(payload.replyTo ? { reply_to: payload.replyTo } : {}),
        }),
      });
      const responseHeaders = Object.fromEntries(response.headers.entries());

      if (!response.ok) {
        await response.text();
        return {
          ...getSafeProviderError(response.status),
          headers: responseHeaders,
        };
      }

      const responseBody = await response.text();
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(responseBody) as unknown;
      } catch {
        return {
          ...getSafeProviderError(502),
          headers: responseHeaders,
        };
      }

      if (!isRecord(parsedBody) || typeof parsedBody.id !== 'string') {
        return {
          ...getSafeProviderError(502),
          headers: responseHeaders,
        };
      }

      return {
        data: { id: parsedBody.id },
        error: null,
        headers: responseHeaders,
      };
    },
  };
}

type AuthMailLogEvent = {
  operation: 'auth_email_delivery';
  type: AuthEmailType;
  requestId?: string;
  route?: string;
  outcome: 'sent' | 'failed';
  category?: AuthMailFailureCategory;
  attempts: number;
};

export interface AuthMailLogger {
  log(event: AuthMailLogEvent): void;
}

export interface AuthMailDependencies {
  sender?: ResendEmailSender;
  logger?: AuthMailLogger;
  sleep?: (milliseconds: number) => Promise<void>;
  random?: () => number;
  timeoutMs?: number;
  maxAttempts?: number;
  retryBaseMs?: number;
}

type AuthMailConfig = Pick<
  AppConfig,
  'RESEND_API_KEY' | 'RESEND_FROM_EMAIL' | 'RESEND_REPLY_TO'
>;

class DefaultAuthMailLogger implements AuthMailLogger {
  private readonly logger = new Logger('AuthMail');

  log(event: AuthMailLogEvent): void {
    if (event.outcome === 'failed') {
      this.logger.error(event);
      return;
    }

    this.logger.log(event);
  }
}

class AuthMailTimeoutError extends Error {
  constructor() {
    super('Authentication email provider timed out');
    this.name = 'AuthMailTimeoutError';
  }
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new AuthMailTimeoutError());
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(
          error instanceof Error
            ? error
            : new Error('Authentication email provider request failed'),
        );
      },
    );
  });
}

function getStatusCode(value: unknown): number | null {
  if (!isRecord(value) || typeof value.statusCode !== 'number') {
    return null;
  }

  return value.statusCode;
}

function classifyFailure(value: unknown): AuthMailFailureCategory {
  if (value instanceof AuthMailTimeoutError) {
    return 'timeout';
  }

  const statusCode = getStatusCode(value);

  if (
    isRecord(value) &&
    value.name === 'application_error' &&
    value.statusCode === null &&
    value.message === 'Unable to fetch data. The request could not be resolved.'
  ) {
    return 'transient';
  }

  if (
    statusCode === 408 ||
    statusCode === 425 ||
    statusCode === 429 ||
    (statusCode !== null && statusCode >= 500)
  ) {
    return 'transient';
  }

  if (statusCode !== null && statusCode >= 400) {
    return 'permanent';
  }

  if (
    value instanceof Error &&
    (value.name === 'AbortError' ||
      value.name === 'TypeError' ||
      /(?:fetch failed|network|socket|timed out|timeout)/iu.test(value.message))
  ) {
    return 'transient';
  }

  return 'unknown';
}

function isTransient(category: AuthMailFailureCategory): boolean {
  return category === 'transient' || category === 'timeout';
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/gu,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character] ?? character,
  );
}

function createEmailContent(
  type: AuthEmailType,
  url: string,
): {
  html: string;
  subject: string;
  text: string;
} {
  const safeUrl = escapeHtml(url);
  const isVerification = type === 'verification';
  const subject = isVerification
    ? 'Verify your Letterly email'
    : 'Reset your Letterly password';
  const action = isVerification
    ? 'verify your email address'
    : 'reset your password';
  const expiry = isVerification ? '24 hours' : '1 hour';
  const linkLabel = isVerification
    ? 'Verify your email address'
    : 'Reset your password';

  return {
    subject,
    html: [
      '<!doctype html>',
      '<html lang="en">',
      '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>',
      subject,
      '</title></head>',
      '<body style="margin:0;background:#FAF6F0;color:#2B211D;font-family:Arial,sans-serif;line-height:1.6">',
      '<main style="max-width:560px;margin:0 auto;padding:40px 24px">',
      '<h1 style="font-family:Georgia,serif;font-size:32px;line-height:1.2">Letterly</h1>',
      '<p>Use this link to ' + action + ' for your Letterly account.</p>',
      '<p><a href="' +
        safeUrl +
        '" style="color:#7A2E3A;font-weight:700">' +
        linkLabel +
        '</a></p>',
      '<p>This link expires in ' + expiry + '.</p>',
      '<p>If you did not request this, you can safely ignore this email. Your account will not change.</p>',
      '</main>',
      '</body>',
      '</html>',
    ].join(''),
    text: [
      'Letterly',
      '',
      'Use this link to ' + action + ' for your Letterly account:',
      url,
      '',
      'This link expires in ' + expiry + '.',
      'If you did not request this, you can safely ignore this email. Your account will not change.',
    ].join('\n'),
  };
}

function createIdempotencyKey(
  type: AuthEmailType,
  userId: string,
  token: string,
): string {
  const digest = createHash('sha256')
    .update(type + ':' + userId + ':' + token)
    .digest('hex');

  return type + '/' + digest;
}

export class ResendAuthMailService implements AuthMailPort {
  private readonly sender: ResendEmailSender | undefined;
  private readonly from: string | undefined;
  private readonly replyTo: string | undefined;
  private readonly logger: AuthMailLogger;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly random: () => number;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;

  constructor(options: {
    sender?: ResendEmailSender;
    from?: string;
    replyTo?: string;
    logger?: AuthMailLogger;
    sleep?: (milliseconds: number) => Promise<void>;
    random?: () => number;
    timeoutMs?: number;
    maxAttempts?: number;
    retryBaseMs?: number;
  }) {
    this.sender = options.sender;
    this.from = options.from;
    this.replyTo = options.replyTo;
    this.logger = options.logger ?? new DefaultAuthMailLogger();
    this.sleep = options.sleep ?? wait;
    this.random = options.random ?? Math.random;
    this.timeoutMs = options.timeoutMs ?? AUTH_EMAIL_TIMEOUT_MS;
    this.maxAttempts = options.maxAttempts ?? AUTH_EMAIL_MAX_ATTEMPTS;
    this.retryBaseMs = options.retryBaseMs ?? AUTH_EMAIL_RETRY_BASE_MS;
  }

  async send(input: {
    type: AuthEmailType;
    userId: string;
    recipient: string;
    url: string;
    token: string;
    requestId?: string;
    route?: string;
  }): Promise<AuthMailResult> {
    if (!this.sender || !this.from) {
      this.logFailure(input, 'disabled', 0);
      return {
        ok: false,
        category: 'disabled',
        attempts: 0,
      };
    }

    const content = createEmailContent(input.type, input.url);
    const idempotencyKey = createIdempotencyKey(
      input.type,
      input.userId,
      input.token,
    );

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const response = await withTimeout(
          this.sender.send(
            {
              from: this.from,
              to: input.recipient,
              subject: content.subject,
              html: content.html,
              text: content.text,
              ...(this.replyTo ? { replyTo: this.replyTo } : {}),
            },
            { idempotencyKey },
          ),
          this.timeoutMs,
        );

        if (!response.error) {
          this.logger.log({
            operation: 'auth_email_delivery',
            type: input.type,
            requestId: input.requestId,
            route: input.route,
            outcome: 'sent',
            attempts: attempt,
          });
          return {
            ok: true,
            messageId: response.data?.id,
          };
        }

        const category = classifyFailure(response.error);
        if (!isTransient(category) || attempt === this.maxAttempts) {
          this.logFailure(input, category, attempt);
          return {
            ok: false,
            category,
            attempts: attempt,
          };
        }

        await this.sleep(this.retryDelay(attempt));
      } catch (error: unknown) {
        const category = classifyFailure(error);
        if (!isTransient(category) || attempt === this.maxAttempts) {
          this.logFailure(input, category, attempt);
          return {
            ok: false,
            category,
            attempts: attempt,
          };
        }

        await this.sleep(this.retryDelay(attempt));
      }
    }

    this.logFailure(input, 'unknown', this.maxAttempts);
    return {
      ok: false,
      category: 'unknown',
      attempts: this.maxAttempts,
    };
  }

  private retryDelay(attempt: number): number {
    const exponential = this.retryBaseMs * 2 ** (attempt - 1);
    const jitter = Math.floor(Math.max(0, Math.min(1, this.random())) * 100);
    return exponential + jitter;
  }

  private logFailure(
    input: {
      type: AuthEmailType;
      requestId?: string;
      route?: string;
    },
    category: AuthMailFailureCategory,
    attempts: number,
  ): void {
    this.logger.log({
      operation: 'auth_email_delivery',
      type: input.type,
      requestId: input.requestId,
      route: input.route,
      outcome: 'failed',
      category,
      attempts,
    });
  }
}

export function createAuthMailService(
  config: AuthMailConfig,
  dependencies: AuthMailDependencies = {},
): ResendAuthMailService {
  const sender =
    dependencies.sender ??
    (config.RESEND_API_KEY
      ? createResendEmailSender(config.RESEND_API_KEY)
      : undefined);

  return new ResendAuthMailService({
    sender,
    from: config.RESEND_FROM_EMAIL,
    replyTo: config.RESEND_REPLY_TO,
    ...dependencies,
  });
}
