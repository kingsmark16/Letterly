import type {
  CreateEmailOptions,
  CreateEmailRequestOptions,
  CreateEmailResponse,
} from 'resend';
import {
  AUTH_EMAIL_MAX_ATTEMPTS,
  createAuthMailService,
  ResendAuthMailService,
} from './auth-mail';

function successfulResponse(messageId = 'email-123'): CreateEmailResponse {
  return {
    data: { id: messageId },
    error: null,
    headers: null,
  };
}

function failedResponse(
  statusCode: number,
  name: 'application_error' | 'internal_server_error' | 'rate_limit_exceeded',
): CreateEmailResponse {
  return {
    data: null,
    error: {
      message: 'provider detail must stay out of logs and responses',
      name,
      statusCode,
    },
    headers: null,
  };
}

type SenderMock = {
  send: jest.Mock<
    Promise<CreateEmailResponse>,
    [CreateEmailOptions, CreateEmailRequestOptions?]
  >;
};

function createSender(): SenderMock {
  return {
    send: jest
      .fn<
        Promise<CreateEmailResponse>,
        [CreateEmailOptions, CreateEmailRequestOptions?]
      >()
      .mockImplementation((payload, options) => {
        void payload;
        void options;
        return Promise.resolve(successfulResponse());
      }),
  };
}

describe('ResendAuthMailService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends accessible verification content with a derived idempotency key', async () => {
    const sender = createSender();
    const logger = { log: jest.fn() };
    const service = new ResendAuthMailService({
      sender,
      from: 'Letterly <hello@example.com>',
      replyTo: 'support@example.com',
      logger,
    });

    const result = await service.send({
      type: 'verification',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/verify-email?token=secret-token',
      token: 'secret-token',
      requestId: 'request-123',
      route: '/api/auth/sign-up/email',
    });

    expect(result).toEqual({ ok: true, messageId: 'email-123' });
    const firstCall = sender.send.mock.calls[0];
    const payload = firstCall?.[0];
    const requestOptions = firstCall?.[1];
    expect(payload).toMatchObject({
      from: 'Letterly <hello@example.com>',
      to: 'creator@example.com',
      replyTo: 'support@example.com',
      subject: 'Verify your Letterly email',
    });
    expect(payload?.html).toContain('lang="en"');
    expect(payload?.html).toContain('Verify your email address');
    expect(payload?.html).toContain('This link expires in 24 hours.');
    expect(payload?.text).toContain('verify your email address');
    expect(payload?.text).toContain('This link expires in 24 hours.');
    expect(requestOptions?.idempotencyKey).toMatch(
      /^verification\/[0-9a-f]{64}$/u,
    );
    expect(requestOptions?.idempotencyKey).not.toContain('secret-token');
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'auth_email_delivery',
        type: 'verification',
        requestId: 'request-123',
        route: '/api/auth/sign-up/email',
        outcome: 'sent',
        attempts: 1,
      }),
    );
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain(
      'creator@example.com',
    );
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('secret-token');
  });

  it('uses the one-hour reset expiry and unrequested-request guidance', async () => {
    const sender = createSender();
    const service = new ResendAuthMailService({
      sender,
      from: 'Letterly <hello@example.com>',
    });

    await service.send({
      type: 'password-reset',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/reset-password?token=reset-token',
      token: 'reset-token',
    });

    const [payload] = sender.send.mock.calls[0] ?? [];
    expect(payload?.subject).toBe('Reset your Letterly password');
    expect(payload?.html).toContain('Reset your password');
    expect(payload?.html).toContain('This link expires in 1 hour.');
    expect(payload?.html).toContain('If you did not request this');
    expect(payload?.text).toContain('This link expires in 1 hour.');
    expect(payload?.text).toContain('If you did not request this');
  });

  it('returns a safe permanent failure without retrying', async () => {
    const sender = createSender();
    sender.send.mockResolvedValue(failedResponse(400, 'application_error'));
    const logger = { log: jest.fn() };
    const sleep = jest.fn().mockResolvedValue(undefined);
    const service = new ResendAuthMailService({
      sender,
      from: 'Letterly <hello@example.com>',
      logger,
      sleep,
    });

    const result = await service.send({
      type: 'verification',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/verify-email?token=secret-token',
      token: 'secret-token',
    });

    expect(result).toEqual({ ok: false, category: 'permanent', attempts: 1 });
    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'failed',
        category: 'permanent',
        attempts: 1,
      }),
    );
    const logged = JSON.stringify(logger.log.mock.calls);
    expect(logged).not.toContain('creator@example.com');
    expect(logged).not.toContain('secret-token');
    expect(logged).not.toContain('provider detail');
  });

  it('retries transient provider responses with bounded exponential delays', async () => {
    const sender = createSender();
    sender.send
      .mockResolvedValueOnce(failedResponse(503, 'internal_server_error'))
      .mockResolvedValueOnce(successfulResponse('email-after-retry'));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const service = new ResendAuthMailService({
      sender,
      from: 'Letterly <hello@example.com>',
      sleep,
      random: () => 0,
    });

    const result = await service.send({
      type: 'password-reset',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/reset-password?token=reset-token',
      token: 'reset-token',
    });

    expect(result).toEqual({
      ok: true,
      messageId: 'email-after-retry',
    });
    expect(sender.send).toHaveBeenCalledTimes(2);
    expect(sleep.mock.calls).toEqual([[250]]);
  });

  it('stops after the configured retry bound for repeated transient failures', async () => {
    const sender = createSender();
    sender.send.mockResolvedValue(failedResponse(429, 'rate_limit_exceeded'));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const service = new ResendAuthMailService({
      sender,
      from: 'Letterly <hello@example.com>',
      sleep,
      random: () => 0,
    });

    const result = await service.send({
      type: 'verification',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/verify-email?token=secret-token',
      token: 'secret-token',
    });

    expect(result).toEqual({
      ok: false,
      category: 'transient',
      attempts: AUTH_EMAIL_MAX_ATTEMPTS,
    });
    expect(sender.send).toHaveBeenCalledTimes(AUTH_EMAIL_MAX_ATTEMPTS);
    expect(sleep.mock.calls).toEqual([[250], [500]]);
  });

  it('classifies repeated provider timeouts safely and never leaks the token', async () => {
    const sender = createSender();
    sender.send.mockImplementation(
      () => new Promise<CreateEmailResponse>(() => undefined),
    );
    const logger = { log: jest.fn() };
    const service = new ResendAuthMailService({
      sender,
      from: 'Letterly <hello@example.com>',
      logger,
      sleep: jest.fn().mockResolvedValue(undefined),
      timeoutMs: 1,
    });

    const result = await service.send({
      type: 'verification',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/verify-email?token=secret-token',
      token: 'secret-token',
    });

    expect(result).toEqual({
      ok: false,
      category: 'timeout',
      attempts: AUTH_EMAIL_MAX_ATTEMPTS,
    });
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('secret-token');
  });

  it('fails safely when email delivery is disabled in local configuration', async () => {
    const logger = { log: jest.fn() };
    const service = new ResendAuthMailService({ logger });

    const result = await service.send({
      type: 'password-reset',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/reset-password?token=reset-token',
      token: 'reset-token',
    });

    expect(result).toEqual({ ok: false, category: 'disabled', attempts: 0 });
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'failed',
        category: 'disabled',
        attempts: 0,
      }),
    );
  });

  it('uses a redacted direct Resend transport with the idempotency header', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'email-456' }), {
        status: 200,
        headers: { 'x-provider-request-id': 'provider-123' },
      }),
    );
    const service = createAuthMailService(
      {
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: 'Letterly <hello@example.com>',
        RESEND_REPLY_TO: undefined,
      },
      { random: () => 0 },
    );

    const result = await service.send({
      type: 'verification',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/verify-email?token=secret-token',
      token: 'secret-token',
    });

    expect(result).toEqual({ ok: true, messageId: 'email-456' });
    const firstCall = fetch.mock.calls[0];
    const requestOptions = firstCall?.[1];
    expect(firstCall?.[0]).toBe('https://api.resend.com/emails');
    expect(requestOptions?.method).toBe('POST');
    expect(new Headers(requestOptions?.headers).get('authorization')).toBe(
      'Bearer re_test_key',
    );
    expect(new Headers(requestOptions?.headers).get('idempotency-key')).toMatch(
      /^verification\/[0-9a-f]{64}$/u,
    );
  });

  it('keeps real Resend diagnostics out of console output and application logs', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'provider detail creator@example.com',
          secret: 'secret-token',
        }),
        { status: 422 },
      ),
    );
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const logger = { log: jest.fn() };
    const service = createAuthMailService(
      {
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: 'Letterly <hello@example.com>',
        RESEND_REPLY_TO: undefined,
      },
      { logger, sleep: jest.fn().mockResolvedValue(undefined) },
    );

    const result = await service.send({
      type: 'password-reset',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/reset-password?token=secret-token',
      token: 'secret-token',
    });

    expect(result).toEqual({ ok: false, category: 'permanent', attempts: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(consoleError).not.toHaveBeenCalled();
    const logged = JSON.stringify(logger.log.mock.calls);
    expect(logged).not.toContain('provider detail');
    expect(logged).not.toContain('creator@example.com');
    expect(logged).not.toContain('secret-token');
  });

  it('retries a transport network failure with the same bounded policy', async () => {
    const fetch = jest
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('fetch failed'));
    const sleep = jest.fn().mockResolvedValue(undefined);
    const service = createAuthMailService(
      {
        RESEND_API_KEY: 're_test_key',
        RESEND_FROM_EMAIL: 'Letterly <hello@example.com>',
        RESEND_REPLY_TO: undefined,
      },
      { sleep, random: () => 0 },
    );

    const result = await service.send({
      type: 'verification',
      userId: 'user-123',
      recipient: 'creator@example.com',
      url: 'https://letterly.example/verify-email?token=secret-token',
      token: 'secret-token',
    });

    expect(result).toEqual({
      ok: false,
      category: 'transient',
      attempts: AUTH_EMAIL_MAX_ATTEMPTS,
    });
    expect(fetch).toHaveBeenCalledTimes(AUTH_EMAIL_MAX_ATTEMPTS);
    expect(sleep.mock.calls).toEqual([[250], [500]]);
  });
});
