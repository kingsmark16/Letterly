import { createHmac, randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { loadConfig } from '@letterly/config';
import { adminCreatorDetailSchema } from '@letterly/contracts';
import {
  disconnectPrisma,
  getPrismaClient,
  type PrismaClient,
} from '@letterly/database';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { AdminModule } from '../src/modules/admin/admin.module';

const describeDatabase =
  process.env.RUN_REAL_DB_TESTS === '1' ? describe : describe.skip;

describeDatabase(
  'Administrator creator detail through real sessions and PostgreSQL',
  () => {
    let prisma: PrismaClient;
    let app: INestApplication<App> | undefined;
    const adminId = `admin-detail-${randomUUID()}`;
    const creatorId = `creator-detail-${randomUUID()}`;
    const tokens = { admin: randomUUID(), creator: randomUUID() };
    const cookies: Record<string, string> = {};

    beforeAll(async () => {
      prisma = getPrismaClient();
      const config = loadConfig();
      await prisma.user.createMany({
        data: [
          {
            id: adminId,
            name: 'Test administrator',
            email: `${adminId}@example.test`,
            role: 'ADMIN',
          },
          {
            id: creatorId,
            name: '<script>private identity</script>',
            email: `${creatorId}@example.test`,
          },
        ],
      });
      for (const [key, userId] of [
        ['admin', adminId],
        ['creator', creatorId],
      ] as const) {
        const token = tokens[key];
        await prisma.session.create({
          data: {
            id: randomUUID(),
            userId,
            token,
            expiresAt: new Date(Date.now() + 3_600_000),
          },
        });
        const signature = createHmac('sha256', config.BETTER_AUTH_SECRET)
          .update(token)
          .digest('base64');
        cookies[key] =
          `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`;
      }
      const templateVersion = await prisma.templateVersion.findFirstOrThrow({
        where: { status: 'ACTIVE' },
        select: { id: true },
      });
      await prisma.page.createMany({
        data: [0, 1].map((index) => ({
          creatorId,
          templateVersionId: templateVersion.id,
          slug: `admin-detail-${randomUUID()}`,
          displaySlug: `test-${index}`,
          content: { private: 'PRIVATE_CONTENT_SENTINEL' },
          settings: {},
        })),
      });
      const module = await Test.createTestingModule({
        imports: [PrismaModule, AdminModule],
      }).compile();
      app = module.createNestApplication();
      configureHttpApplication(app);
      await app.init();
    });

    afterAll(async () => {
      if (prisma) {
        await prisma.page.deleteMany({ where: { creatorId } });
        await prisma.user.deleteMany({
          where: { id: { in: [adminId, creatorId] } },
        });
      }
      await app?.close();
      await disconnectPrisma();
    });

    it('reads exact database identity and counts through the protected HTTP boundary', async () => {
      if (!app) throw new Error('Test application was not initialized');
      const response = await request(app.getHttpServer())
        .get(`/api/v1/admin/creators/${creatorId}`)
        .set('Cookie', cookies.admin ?? '')
        .expect(200);
      expect(adminCreatorDetailSchema.parse(response.body)).toMatchObject({
        id: creatorId,
        name: '<script>private identity</script>',
        pageCount: 2,
        role: 'CREATOR',
      });
      expect(response.headers['cache-control']).toBe('private, no-store');
      expect(JSON.stringify(response.body)).not.toMatch(
        /PRIVATE_CONTENT_SENTINEL|token|accounts|sessions|content/,
      );
    });

    it('denies visitor and creator sessions and rechecks a disabled administrator', async () => {
      if (!app) throw new Error('Test application was not initialized');
      const path = `/api/v1/admin/creators/${creatorId}`;
      await request(app.getHttpServer()).get(path).expect(401);
      await request(app.getHttpServer())
        .get(path)
        .set('Cookie', cookies.creator ?? '')
        .expect(403);
      await prisma.user.update({
        where: { id: adminId },
        data: { moderationStatus: 'DISABLED' },
      });
      await request(app.getHttpServer())
        .get(path)
        .set('Cookie', cookies.admin ?? '')
        .expect(403);
    });
  },
);
