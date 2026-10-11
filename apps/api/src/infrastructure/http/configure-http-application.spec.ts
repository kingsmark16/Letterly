import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { apiErrorEnvelopeSchema } from '@letterly/contracts';
import request from 'supertest';
import type { App } from 'supertest/types';
import { configureHttpApplication } from './configure-http-application';

@Controller('api/v1/echo')
class EchoController {
  @Post()
  echo(@Body() body: unknown): unknown {
    return body;
  }
}

@Controller()
class HealthPathController {
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  ready(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

describe('configureHttpApplication', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [EchoController, HealthPathController],
    }).compile();

    app = module.createNestApplication({ bodyParser: false });
    configureHttpApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('AC-8 returns a safe envelope for malformed JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/echo')
      .set('Content-Type', 'application/json')
      .send('{"recipientName":')
      .expect(400);

    const body = apiErrorEnvelopeSchema.parse(response.body);

    expect(body).toEqual({
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Request cannot be processed',
      requestId: body.requestId,
    });
    expect(response.headers['x-request-id']).toBe(body.requestId);
  });

  it('AC-8 returns a safe envelope for a body over 128 KiB', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/echo')
      .send({ message: 'a'.repeat(128 * 1024) })
      .expect(413);

    const body = apiErrorEnvelopeSchema.parse(response.body);

    expect(body).toEqual({
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body is too large',
      requestId: body.requestId,
    });
    expect(response.headers['x-request-id']).toBe(body.requestId);
  });

  it.each(['/health', '/ready', '/HEALTH', '/health/', '/ReAdY/', '/HeAlTh/'])(
    'bypasses JSON parsing for the bodyless %s route and marks it no-store',
    async (path) => {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('Content-Type', 'application/json')
        .send('{ malformed json')
        .expect(200);

      expect(response.body).toEqual({ status: 'ok' });
      expect(response.headers['cache-control']).toBe('no-store');
      expect(response.headers['x-request-id']).toEqual(expect.any(String));
    },
  );
});
