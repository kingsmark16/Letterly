import { createHmac, randomUUID } from 'node:crypto';
import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { loadConfig } from '@letterly/config';
import {
  getPrismaClient,
  disconnectPrisma,
  type PrismaClient,
} from '@letterly/database';
import {
  deletionPreviewSchema,
  deletionJobSummarySchema,
  deletionJobDetailSchema,
  type DeletionAcceptRequest,
} from '@letterly/contracts';
import { PrismaModule } from '../src/infrastructure/database/prisma.module';
import { configureHttpApplication } from '../src/infrastructure/http/configure-http-application';
import { AdminModule } from '../src/modules/admin/admin.module';
import { DeletionScheduler } from '../src/modules/admin/infrastructure/deletion.scheduler';
import { DeletionWorker } from '../src/modules/admin/application/deletion-worker';
import { MediaCleanupService } from '../src/modules/pages/application/media-cleanup.service';
import { MEDIA_STORAGE } from '../src/modules/pages/application/media-storage';
import { publicPageAvailabilityWhere } from '../src/modules/pages/infrastructure/public-availability';
import { PrismaMediaRecoveryRepository } from '../src/modules/admin/infrastructure/prisma-media-recovery.repository';
import { PrismaPageReportsRepository } from '../src/modules/pages/infrastructure/prisma-page-reports.repository';
import { PrismaPageMediaRepository } from '../src/modules/pages/infrastructure/prisma-page-media.repository';
import { PrismaMediaProcessingControl } from '../src/modules/pages/infrastructure/prisma-media-processing-control';
import { PageMediaService } from '../src/modules/pages/application/page-media.service';
import type { MediaStorage } from '../src/modules/pages/application/media-storage';
import { Readable } from 'node:stream';
import { canonicalHash } from '../src/modules/admin/infrastructure/deletion-canonical';
import { PrismaPagesRepository } from '../src/modules/pages/infrastructure/prisma-pages.repository';
import { PrismaMediaCleanupRepository } from '../src/modules/pages/infrastructure/prisma-media-cleanup.repository';
import { purgeDeletionJobs } from '../src/modules/admin/infrastructure/deletion-retention';
import { AdminDeletionsService } from '../src/modules/admin/application/admin-deletions.service';
import { ADMIN_DELETIONS_REPOSITORY } from '../src/modules/admin/application/admin-deletions.repository';
import { ADMIN_CURSOR } from '../src/modules/admin/application/admin-cursor';

const database =
  process.env.RUN_REAL_DB_TESTS === '1' ? describe : describe.skip;
database('Admin page deletion database path', () => {
  jest.setTimeout(60_000);
  let prisma: PrismaClient;
  let app: INestApplication<App> | undefined;
  let versionId: string;
  const prefix = `delete-${randomUUID()}`;
  const adminId = `${prefix}-admin`,
    creatorId = `${prefix}-creator`;
  const pageIds: string[] = [];
  const jobs: string[] = [];
  const cookies: Record<string, string> = {};
  const deletes: string[] = [];
  const objects = new Map<string, Buffer>();
  const actorIds = [adminId, creatorId];
  const erase = (key: string) => {
    deletes.push(key);
    objects.delete(key);
    return Promise.resolve();
  };
  beforeAll(async () => {
    prisma = getPrismaClient();
    process.env.ADMIN_DELETION_ENABLED = 'true';
    await prisma.user.createMany({
      data: [
        {
          id: adminId,
          email: `${adminId}@example.test`,
          name: 'Deletion administrator',
          role: 'ADMIN',
        },
        {
          id: creatorId,
          email: `${creatorId}@example.test`,
          name: 'Deletion fixture',
        },
      ],
    });
    for (const id of [adminId, creatorId]) {
      const token = randomUUID();
      await prisma.session.create({
        data: {
          id: randomUUID(),
          token,
          userId: id,
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      });
      cookies[id] =
        `better-auth.session_token=${encodeURIComponent(`${token}.${createHmac('sha256', loadConfig().BETTER_AUTH_SECRET).update(token).digest('base64')}`)}`;
    }
    versionId = (
      await prisma.templateVersion.findFirstOrThrow({
        where: { template: { key: 'secret-letter' } },
      })
    ).id;
    const module = await Test.createTestingModule({
      imports: [PrismaModule, AdminModule],
    })
      .overrideProvider(DeletionScheduler)
      .useValue({})
      .overrideProvider(MEDIA_STORAGE)
      .useValue({ deleteObject: erase })
      .compile();
    app = module.createNestApplication();
    configureHttpApplication(app);
    await app.init();
  });
  afterAll(async () => {
    if (prisma) {
      const ids = (
        await prisma.deletionJob.findMany({
          where: { targetId: { in: [...pageIds, ...actorIds] } },
          select: { id: true },
        })
      ).map((j) => j.id);
      await prisma.deletionJobMedia.deleteMany({
        where: { jobId: { in: ids } },
      });
      await prisma.deletionAcceptanceReceipt.deleteMany({
        where: { jobId: { in: ids } },
      });
      await prisma.mediaProcessingRecovery.deleteMany({
        where: { jobId: { in: ids } },
      });
      await prisma.uploadGrantSettlement.deleteMany({
        where: { jobId: { in: ids } },
      });
      await prisma.deletionJob.deleteMany({
        where: { id: { in: ids }, parentJobId: { not: null } },
      });
      await prisma.deletionJob.deleteMany({ where: { id: { in: ids } } });
      await prisma.pageUploadGrant.deleteMany({
        where: { pageId: { in: pageIds } },
      });
      await prisma.mediaCleanup.deleteMany({
        where: {
          OR: [
            { objectKey: { startsWith: `test-${prefix}` } },
            ...pageIds.map((id) => ({
              objectKey: { startsWith: `pages/${id}/` },
            })),
          ],
        },
      });
      await prisma.auditEvent.deleteMany({
        where: {
          OR: [{ actorId: { in: actorIds } }, { targetId: { in: pageIds } }],
        },
      });
      await prisma.page.deleteMany({ where: { id: { in: pageIds } } });
      await prisma.user.deleteMany({ where: { id: { in: actorIds } } });
    }
    await app?.close();
    await disconnectPrisma();
    delete process.env.ADMIN_DELETION_ENABLED;
  });
  function server() {
    if (!app) throw new Error('Not initialized');
    return app.getHttpServer();
  }
  function post(path: string, body: object, actor = adminId) {
    return request(server())
      .post(`/api/v1/admin${path}`)
      .set('Cookie', cookies[actor] ?? '')
      .set('Origin', 'http://localhost:3000')
      .set('X-CSRF-Token', 'deletion-fixture')
      .send(body);
  }
  async function page(owner = creatorId) {
    const slug = `${prefix}-${randomUUID()}`;
    const row = await prisma.page.create({
      data: {
        creatorId: owner,
        templateVersionId: versionId,
        slug,
        displaySlug: 'deletion fixture',
        status: 'PUBLISHED',
        content: { private: 'PRIVATE_DELETION_SENTINEL' },
        settings: {},
        slugReservations: { create: { normalizedSlug: slug } },
      },
    });
    pageIds.push(row.id);
    return row;
  }
  async function operator() {
    return {
      id: adminId,
      sessionId: (
        await prisma.session.findFirstOrThrow({ where: { userId: adminId } })
      ).id,
    };
  }
  function imageService(
    put: (input: Parameters<MediaStorage['putObject']>[0]) => Promise<void>,
    sign?: MediaStorage['createUploadUrl'],
  ) {
    const storage: MediaStorage = {
      createUploadUrl:
        sign ??
        ((input) =>
          Promise.resolve({
            key: input.key,
            uploadUrl: 'https://synthetic.example.test/upload',
            issuedAt: new Date(),
            expiresAt: new Date(Date.now() + 3_600_000),
            requiredHeaders: {
              contentType: input.contentType,
              sha256: input.sha256,
            },
          })),
      getObject: (key) =>
        Promise.resolve({
          body: objects.get(key) ?? Buffer.from('raw'),
          contentType: 'image/png',
          contentLength: 3,
          checksumSha256: 'A'.repeat(43) + '=',
        }),
      getObjectRange: () =>
        Promise.resolve({
          body: Readable.from([]),
          contentType: 'image/png',
          contentLength: 0,
          contentRange: undefined,
          totalLength: 0,
        }),
      putObject: put,
      deleteObject: erase,
    };
    return new PageMediaService(
      new PrismaPageMediaRepository(prisma),
      storage,
      {
        sanitize: () =>
          Promise.resolve({
            body: Buffer.from('webp'),
            byteSize: 4,
            checksum: 'B'.repeat(43) + '=',
            height: 1,
            width: 1,
          }),
      },
      { error: () => undefined },
      new PrismaMediaProcessingControl(prisma),
    );
  }
  async function acceptance(pageId: string) {
    const preview = deletionPreviewSchema.parse(
      (
        await post(`/pages/${pageId}/deletion-preview`, {
          expectedModerationVersion: 0,
        }).expect(200)
      ).body,
    );
    const body: DeletionAcceptRequest = {
      confirm: true,
      expectedModerationVersion: 0,
      idempotencyKey: randomUUID(),
      reasonCode: 'SPAM',
      typedTargetId: pageId,
      confirmationToken: preview.confirmationToken,
    };
    const response = await post(`/pages/${pageId}/deletions`, body).expect(202);
    const job = deletionJobSummarySchema.parse(response.body);
    jobs.push(job.id);
    return { job, body, preview };
  }
  async function drain(id: string) {
    for (let step = 0; step < 30; step++) {
      await app!.get(DeletionWorker).runOnce();
      await app!.get(MediaCleanupService).runOnce();
      const job = await prisma.deletionJob.findUniqueOrThrow({ where: { id } });
      if (['COMPLETED', 'NEEDS_ATTENTION'].includes(job.state)) return job;
    }
    throw new Error('Job did not settle');
  }

  it('AC-5 replays accepted page deletion while new acceptance is disabled', async () => {
    const target = await page();
    const { job, body } = await acceptance(target.id);
    const disabled = new AdminDeletionsService(
      app!.get(ADMIN_DELETIONS_REPOSITORY),
      app!.get(ADMIN_CURSOR),
      false,
    );
    await expect(
      disabled.accept(adminId, target.id, body, randomUUID()),
    ).resolves.toMatchObject({ id: job.id });
    await expect(
      disabled.accept(
        adminId,
        target.id,
        { ...body, reasonCode: 'OTHER' },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    const other = await page();
    await expect(
      disabled.accept(
        adminId,
        other.id,
        { ...body, idempotencyKey: randomUUID(), typedTargetId: other.id },
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DELETION_STATE' });
    expect((await drain(job.id)).state).toBe('COMPLETED');
    await expect(
      disabled.accept(adminId, target.id, body, randomUUID()),
    ).resolves.toMatchObject({ id: job.id, state: 'COMPLETED' });
  });

  it.each(['PAGE', 'CREATOR'] as const)(
    'AC-6 adopts removed processed media cleanup for an ordinary %s deletion',
    async (kind) => {
      const owner = `${prefix}-cleanup-${randomUUID()}`;
      actorIds.push(owner);
      await prisma.user.create({
        data: {
          id: owner,
          email: `${owner}@example.test`,
          name: 'Cleanup owner',
        },
      });
      const target = await page(owner);
      const unrelated = await page();
      const key = `pages/${target.id}/images/${randomUUID()}.webp`;
      const unrelatedKey = `pages/${unrelated.id}/images/${randomUUID()}.webp`;
      const image = await prisma.pageImage.create({
        data: {
          pageId: target.id,
          state: 'READY',
          storageKey: key,
          sourceMimeType: 'image/png',
          sourceByteSize: 3,
          sourceSha256: 'fixture',
          uploadExpiresAt: new Date(),
          expiresAt: new Date(Date.now() + 600_000),
        },
      });
      expect(
        await new PrismaPageMediaRepository(prisma).removeImage({
          creatorId: owner,
          pageId: target.id,
          imageId: image.id,
        }),
      ).toMatchObject({ type: 'removed' });
      await prisma.mediaCleanup.update({
        where: { objectKey: key },
        data: { status: 'REVIEW', attempts: 8 },
      });
      const otherTask = await prisma.mediaCleanup.create({
        data: { objectKey: unrelatedKey, status: 'REVIEW', attempts: 8 },
      });
      objects.set(key, Buffer.from('private processed image'));
      await prisma.$executeRaw`ALTER TABLE "PageUploadGrant" ALTER COLUMN "creatorId" SET NOT NULL`;
      try {
        let jobId: string;
        if (kind === 'PAGE') jobId = (await acceptance(target.id)).job.id;
        else {
          const preview = deletionPreviewSchema.parse(
            (
              await post(`/creators/${owner}/deletion-preview`, {
                expectedModerationVersion: 0,
              }).expect(200)
            ).body,
          );
          const result = await post(`/creators/${owner}/deletions`, {
            confirm: true,
            expectedModerationVersion: 0,
            typedTargetId: owner,
            idempotencyKey: randomUUID(),
            reasonCode: 'OTHER',
            confirmationToken: preview.confirmationToken,
          }).expect(202);
          jobId = deletionJobSummarySchema.parse(result.body).id;
        }
        const stopped = await drain(jobId);
        expect(stopped.state).toBe('NEEDS_ATTENTION');
        const child = await prisma.deletionJob.findUniqueOrThrow({
          where: {
            targetType_targetId: { targetType: 'PAGE', targetId: target.id },
          },
        });
        expect(child.detachedPage).toBe(false);
        expect(child.state).toBe('NEEDS_ATTENTION');
        expect(
          await prisma.deletionJobMedia.count({
            where: { jobId: child.id, completedAt: null },
          }),
        ).toBe(1);
        expect(objects.has(key)).toBe(true);
        expect(
          await prisma.deletionJobMedia.count({
            where: { cleanupTaskId: otherTask.id },
          }),
        ).toBe(0);
        await post(`/deletions/${jobId}/retry`, {
          confirm: true,
          expectedJobVersion: stopped.version,
          idempotencyKey: randomUUID(),
        }).expect(202);
        expect((await drain(jobId)).state).toBe('COMPLETED');
        expect(objects.has(key)).toBe(false);
        expect(deletes).not.toContain(unrelatedKey);
      } finally {
        await prisma.$executeRaw`ALTER TABLE "PageUploadGrant" ALTER COLUMN "creatorId" DROP NOT NULL`;
      }
    },
  );

  it('accepts atomically, blocks owner/public access, completes bounded metadata cleanup, and replays after removal', async () => {
    const target = await page();
    await prisma.pageReport.createMany({
      data: Array.from({ length: 225 }, () => ({
        pageId: target.id,
        reason: 'SPAM',
      })),
    });
    const { job, body, preview } = await acceptance(target.id);
    expect(preview.counts.reports).toBe(225);
    const blocked = await prisma.page.findUniqueOrThrow({
      where: { id: target.id },
    });
    expect(blocked.deletionRequestedAt).not.toBeNull();
    expect(blocked.moderationStatus).toBe('DISABLED');
    expect(
      await prisma.page.findFirst({
        where: publicPageAvailabilityWhere(target.slug),
      }),
    ).toBeNull();
    await request(server())
      .get(`/api/v1/pages/${target.id}`)
      .set('Cookie', cookies[creatorId]!)
      .expect(404);
    const completed = await drain(job.id);
    expect(completed.state).toBe('COMPLETED');
    expect(completed.databaseBatchesCompleted).toBeGreaterThanOrEqual(3);
    expect(
      await prisma.page.findUnique({ where: { id: target.id } }),
    ).toBeNull();
    await prisma.adminIdempotencyRecord.deleteMany({
      where: { actorId: adminId, operation: 'PAGE_DELETE' },
    });
    const replay = deletionJobSummarySchema.parse(
      (await post(`/pages/${target.id}/deletions`, body).expect(202)).body,
    );
    expect(replay.id).toBe(job.id);
    expect(replay.state).toBe('COMPLETED');
    await post(`/pages/${target.id}/deletions`, {
      ...body,
      reasonCode: 'OTHER',
    }).expect(409);
    const detail = deletionJobDetailSchema.parse(
      (
        await request(server())
          .get(`/api/v1/admin/deletions/${job.id}`)
          .set('Cookie', cookies[adminId]!)
          .expect(200)
      ).body,
    );
    expect(detail.pagesCompleted).toBe(1);
    expect(JSON.stringify(detail)).not.toContain('PRIVATE_DELETION_SENTINEL');
    expect(
      await prisma.pageSlugReservation.count({ where: { pageId: target.id } }),
    ).toBe(0);
  });
  it('rejects stale impact and incorrect typed IDs without starting a job', async () => {
    const target = await page();
    const preview = deletionPreviewSchema.parse(
      (
        await post(`/pages/${target.id}/deletion-preview`, {
          expectedModerationVersion: 0,
        }).expect(200)
      ).body,
    );
    await prisma.pageReport.create({
      data: { pageId: target.id, reason: 'OTHER' },
    });
    const body = {
      confirm: true,
      expectedModerationVersion: 0,
      idempotencyKey: randomUUID(),
      reasonCode: 'OTHER',
      typedTargetId: target.id,
      confirmationToken: preview.confirmationToken,
    };
    await post(`/pages/${target.id}/deletions`, body).expect(409);
    await post(`/pages/${target.id}/deletions`, {
      ...body,
      typedTargetId: randomUUID(),
    }).expect(409);
    expect(
      await prisma.deletionJob.count({ where: { targetId: target.id } }),
    ).toBe(0);
  });
  it('serializes duplicate acceptance and publishes only one job and receipt', async () => {
    const target = await page();
    const preview = deletionPreviewSchema.parse(
      (
        await post(`/pages/${target.id}/deletion-preview`, {
          expectedModerationVersion: 0,
        }).expect(200)
      ).body,
    );
    const body = {
      confirm: true,
      expectedModerationVersion: 0,
      idempotencyKey: randomUUID(),
      reasonCode: 'SPAM',
      typedTargetId: target.id,
      confirmationToken: preview.confirmationToken,
    };
    await post(`/pages/${target.id}/deletions`, {
      ...body,
      confirmationToken: `${preview.confirmationToken}x`,
    }).expect(409);
    const accept = () =>
      post(`/pages/${target.id}/deletions`, body).expect(202);
    const [first, replay] = await Promise.all([accept(), accept()]);
    const job = deletionJobSummarySchema.parse(first.body);
    expect(deletionJobSummarySchema.parse(replay.body).id).toBe(job.id);
    expect(
      await prisma.deletionJob.count({ where: { targetId: target.id } }),
    ).toBe(1);
    expect(
      await prisma.deletionAcceptanceReceipt.count({
        where: { jobId: job.id },
      }),
    ).toBe(1);
    expect((await drain(job.id)).state).toBe('COMPLETED');
  });

  it('preserves unresolved upload evidence and refuses premature media acknowledgements', async () => {
    const target = await page();
    const mediaId = randomUUID(),
      key = `test-${prefix}/${randomUUID()}`;
    await prisma.pageImage.create({
      data: {
        id: mediaId,
        pageId: target.id,
        state: 'READY',
        attachedAt: new Date(),
        storageKey: key,
        sourceMimeType: 'image/png',
        sourceByteSize: 10,
        sourceSha256: 'checksum',
        uploadExpiresAt: new Date(Date.now() - 60_000),
        expiresAt: null,
      },
    });
    await prisma.pageUploadGrant.create({
      data: {
        pageId: target.id,
        creatorId,
        mediaType: 'IMAGE',
        mediaId,
        objectKey: key,
        issuedAt: new Date(Date.now() - 120_000),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const { job } = await acceptance(target.id);
    const result = await drain(job.id);
    expect(result.state).toBe('NEEDS_ATTENTION');
    expect(result.lastFailureCode).toBe('UPLOAD_SETTLEMENT_UNKNOWN');
    expect(deletes).not.toContain(key);
    expect(
      await prisma.deletionJobMedia.count({
        where: { jobId: job.id, completedAt: null },
      }),
    ).toBe(1);
    await post(`/deletions/${job.id}/retry`, {
      confirm: true,
      expectedJobVersion: result.version,
      idempotencyKey: randomUUID(),
    }).expect(409);
    const recovery = new PrismaMediaRecoveryRepository(prisma),
      actor = await operator();
    const snapshot = await recovery.inspectUpload(actor, job.id);
    const evidence = {
      schemaVersion: 1 as const,
      jobId: job.id,
      uploadManifestSha256: snapshot.uploadManifestSha256!,
      observedAt: new Date().toISOString(),
      evidenceReference: `ops:${randomUUID()}`,
      evidenceText:
        'Synthetic provider fixture confirms every admitted upload has terminated.',
    };
    await expect(
      recovery.settleUploads(
        {
          id: creatorId,
          sessionId: (
            await prisma.session.findFirstOrThrow({
              where: { userId: creatorId },
            })
          ).id,
        },
        evidence,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const saved = await recovery.settleUploads(actor, evidence);
    const ready = await prisma.deletionJob.findUniqueOrThrow({
      where: { id: job.id },
    });
    await post(`/deletions/${job.id}/retry`, {
      confirm: true,
      expectedJobVersion: ready.version,
      idempotencyKey: randomUUID(),
    }).expect(202);
    expect((await drain(job.id)).state).toBe('COMPLETED');
    expect(deletes).toContain(key);
    expect(await recovery.settleUploads(actor, evidence)).toEqual(saved);
    await expect(
      recovery.settleUploads(actor, {
        ...evidence,
        evidenceText: 'Changed evidence',
      }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
  });
  it('requires roles and trusted origin and protects administrator owned pages', async () => {
    const target = await page(adminId);
    await post(`/pages/${target.id}/deletion-preview`, {
      expectedModerationVersion: 0,
    }).expect(409);
    await post(
      `/pages/${target.id}/deletion-preview`,
      { expectedModerationVersion: 0 },
      creatorId,
    ).expect(403);
    await request(server())
      .post(`/api/v1/admin/pages/${target.id}/deletion-preview`)
      .set('Cookie', cookies[adminId]!)
      .set('Origin', 'https://untrusted.example')
      .send({ expectedModerationVersion: 0 })
      .expect(403);
    await request(server()).get('/api/v1/admin/deletions').expect(401);
  });
  it('serializes a report count change with acceptance and refuses restore after the barrier', async () => {
    const target = await page();
    const preview = deletionPreviewSchema.parse(
      (
        await post(`/pages/${target.id}/deletion-preview`, {
          expectedModerationVersion: 0,
        }).expect(200)
      ).body,
    );
    const body = {
      confirm: true,
      expectedModerationVersion: 0,
      idempotencyKey: randomUUID(),
      reasonCode: 'SPAM',
      typedTargetId: target.id,
      confirmationToken: preview.confirmationToken,
    };
    const [accepted, report] = await Promise.all([
      post(`/pages/${target.id}/deletions`, body),
      app!
        .get(PrismaPageReportsRepository)
        .createPublicReport({ slug: target.slug, reason: 'SPAM' }),
    ]);
    if (accepted.status === 202) {
      expect(report.type).toBe('not_found');
      await post(`/pages/${target.id}/restore`, {
        confirm: true,
        expectedModerationVersion: 1,
        idempotencyKey: randomUUID(),
      }).expect(409);
    } else {
      expect(accepted.status).toBe(409);
      expect(report.type).toBe('created');
      expect(
        await prisma.deletionJob.count({ where: { targetId: target.id } }),
      ).toBe(0);
    }
  });

  it('AC-9 returns 409 DELETION_IN_PROGRESS for moderation mutations on blocked targets and 404 for missing pages', async () => {
    const barrierAdminId = `${prefix}-barrier-admin-${randomUUID()}`;
    actorIds.push(barrierAdminId);
    await prisma.user.create({
      data: {
        id: barrierAdminId,
        email: `${barrierAdminId}@example.test`,
        name: 'Barrier check administrator',
        role: 'ADMIN',
      },
    });
    const token = randomUUID();
    await prisma.session.create({
      data: {
        id: randomUUID(),
        token,
        userId: barrierAdminId,
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    cookies[barrierAdminId] =
      `better-auth.session_token=${encodeURIComponent(`${token}.${createHmac('sha256', loadConfig().BETTER_AUTH_SECRET).update(token).digest('base64')}`)}`;

    const missingPageId = randomUUID();
    const missingDisable = await post(
      `/pages/${missingPageId}/disable`,
      {
        confirm: true,
        reason: 'SPAM',
        expectedModerationVersion: 0,
        idempotencyKey: randomUUID(),
      },
      barrierAdminId,
    ).expect(404);
    expect(missingDisable.body).toMatchObject({ code: 'NOT_FOUND' });

    const target = await page();
    const report = await prisma.pageReport.create({
      data: { pageId: target.id, reason: 'SPAM' },
    });
    const { job } = await acceptance(target.id);

    const blockedRestore = await post(
      `/pages/${target.id}/restore`,
      {
        confirm: true,
        expectedModerationVersion: 1,
        idempotencyKey: randomUUID(),
      },
      barrierAdminId,
    ).expect(409);
    expect(blockedRestore.body).toMatchObject({ code: 'DELETION_IN_PROGRESS' });

    const blockedReport = await post(
      `/reports/${report.id}/review`,
      {
        confirm: true,
        reason: 'SPAM',
        expectedModerationVersion: 0,
        idempotencyKey: randomUUID(),
      },
      barrierAdminId,
    ).expect(409);
    expect(blockedReport.body).toMatchObject({ code: 'DELETION_IN_PROGRESS' });

    expect((await drain(job.id)).state).toBe('COMPLETED');

    const owner = `${prefix}-blocked-user-${randomUUID()}`;
    actorIds.push(owner);
    await prisma.user.create({
      data: {
        id: owner,
        email: `${owner}@example.test`,
        name: 'Blocked creator',
      },
    });
    await prisma.$executeRaw`ALTER TABLE "PageUploadGrant" ALTER COLUMN "creatorId" SET NOT NULL`;
    try {
      const preview = deletionPreviewSchema.parse(
        (
          await post(
            `/creators/${owner}/deletion-preview`,
            {
              expectedModerationVersion: 0,
            },
            barrierAdminId,
          ).expect(200)
        ).body,
      );
      const creatorJob = deletionJobSummarySchema.parse(
        (
          await post(
            `/creators/${owner}/deletions`,
            {
              confirm: true,
              expectedModerationVersion: 0,
              typedTargetId: owner,
              idempotencyKey: randomUUID(),
              reasonCode: 'OTHER',
              confirmationToken: preview.confirmationToken,
            },
            barrierAdminId,
          ).expect(202)
        ).body,
      );
      const blockedUserRestore = await post(
        `/users/${owner}/restore`,
        {
          confirm: true,
          expectedModerationVersion: 1,
          idempotencyKey: randomUUID(),
        },
        barrierAdminId,
      ).expect(409);
      expect(blockedUserRestore.body).toMatchObject({
        code: 'DELETION_IN_PROGRESS',
      });
      expect((await drain(creatorJob.id)).state).toBe('COMPLETED');
    } finally {
      await prisma.$executeRaw`ALTER TABLE "PageUploadGrant" ALTER COLUMN "creatorId" DROP NOT NULL`;
    }
  });
  it('removes journey history in bounded batches before removing its current graph', async () => {
    const target = await page(),
      journeyId = randomUUID(),
      draftId = randomUUID(),
      rootId = randomUUID();
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SET CONSTRAINTS ALL DEFERRED`;
      await tx.pageJourney.create({
        data: { id: journeyId, pageId: target.id, draftRevisionId: draftId },
      });
      const revisions = [
        { id: draftId, rootQuestionId: rootId, revisionNumber: 1 },
        ...Array.from({ length: 120 }, (_, index) => ({
          id: randomUUID(),
          rootQuestionId: randomUUID(),
          revisionNumber: index + 2,
        })),
      ];
      await tx.pageJourneyGraphRevision.createMany({
        data: revisions.map((row) => ({ ...row, journeyId, maxDepth: 1 })),
      });
      await tx.pageJourneyQuestion.createMany({
        data: revisions.map((row) => ({
          id: row.rootQuestionId,
          revisionId: row.id,
          key: 'root',
          prompt: 'Private graph sentinel',
          displayOrder: 0,
        })),
      });
    });
    const { job } = await acceptance(target.id);
    expect((await drain(job.id)).state).toBe('COMPLETED');
    expect(
      await prisma.pageJourneyGraphRevision.count({ where: { journeyId } }),
    ).toBe(0);
  });
  it('keeps a delayed unknown processor write fenced through expiry, recovery, and final cleanup', async () => {
    const target = await page(),
      mediaId = randomUUID(),
      source = `pages/${target.id}/sources/${mediaId}`,
      output = `pages/${target.id}/images/${mediaId}.webp`;
    objects.set(source, Buffer.from('raw'));
    const expired = new Date(Date.now() - 60_000);
    await prisma.pageImage.create({
      data: {
        id: mediaId,
        pageId: target.id,
        sourceStorageKey: source,
        sourceMimeType: 'image/png',
        sourceByteSize: 3,
        sourceSha256: 'A'.repeat(43) + '=',
        uploadExpiresAt: expired,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await prisma.pageUploadGrant.create({
      data: {
        pageId: target.id,
        creatorId,
        mediaType: 'IMAGE',
        mediaId,
        objectKey: source,
        issuedAt: new Date(expired.getTime() - 60_000),
        expiresAt: expired,
      },
    });
    let signalStarted!: () => void, release!: () => void;
    const started = new Promise<void>((resolve) => {
        signalStarted = resolve;
      }),
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
    const service = imageService(async (input) => {
      expect(input.singleAttempt).toBe(true);
      signalStarted();
      await held;
      objects.set(input.key, input.body);
      throw new Error('Synthetic lost provider response');
    });
    const completion = service
      .completeUpload({ creatorId, pageId: target.id, imageId: mediaId })
      .then(
        () => null,
        (error) => error as Error,
      );
    await started;
    const running = await prisma.pageImage.findUniqueOrThrow({
      where: { id: mediaId },
    });
    expect(running.storageWriteState).toBe('IN_FLIGHT');
    expect(running.outputManifest).toEqual([output, source].sort());
    const { job } = await acceptance(target.id);
    await prisma.pageImage.update({
      where: { id: mediaId },
      data: { processingLeaseExpiresAt: new Date(Date.now() - 1000) },
    });
    await app!.get(DeletionWorker).runOnce();
    expect(
      (await prisma.deletionJob.findUniqueOrThrow({ where: { id: job.id } }))
        .lastFailureCode,
    ).toBe('PROCESSOR_QUIESCENCE_UNKNOWN');
    await app!.get(MediaCleanupService).runOnce();
    expect(objects.has(source)).toBe(true);
    expect(objects.has(output)).toBe(false);
    release();
    expect(await completion).toBeInstanceOf(Error);
    expect(objects.has(output)).toBe(true);
    const unresolved = await prisma.pageImage.findUniqueOrThrow({
      where: { id: mediaId },
    });
    expect(unresolved.processingState).toBe('UNCERTAIN');
    expect(unresolved.storageWriteState).toBe('UNCERTAIN');
    expect(unresolved.state).not.toBe('READY');
    const recovery = new PrismaMediaRecoveryRepository(prisma),
      actor = await operator(),
      snapshot = await recovery.inspectProcessor(actor, {
        jobId: job.id,
        mediaType: 'IMAGE',
        mediaId,
      });
    const termination = randomUUID(),
      settlement = randomUUID();
    const evidence = {
      schemaVersion: 1 as const,
      jobId: job.id,
      mediaType: 'IMAGE' as const,
      mediaId,
      attemptToken: snapshot.attemptToken!,
      processingInstanceId: snapshot.processingInstanceId!,
      manifestSha256: snapshot.manifestSha256,
      termination: {
        platform: 'LOCAL' as const,
        hostIdentitySha256: canonicalHash(snapshot.processingHostIdentity),
        observedAt: new Date().toISOString(),
        evidenceReference: `ops:${termination}`,
      },
      storageSettlement: {
        basis: 'PROVIDER_CONFIRMED' as const,
        observedAt: new Date().toISOString(),
        evidenceReference: `ops:${settlement}`,
      },
      evidenceRecords: [
        {
          id: termination,
          kind: 'TERMINATION' as const,
          text: 'Synthetic control plane termination attestation for the test instance.',
        },
        {
          id: settlement,
          kind: 'STORAGE_SETTLEMENT' as const,
          text: 'Synthetic storage confirms all requests for the attempt are terminal.',
        },
      ],
    };
    const input = {
      jobId: job.id,
      mediaType: 'IMAGE' as const,
      mediaId,
      attemptToken: snapshot.attemptToken!,
      processingInstanceId: snapshot.processingInstanceId!,
      evidence,
    };
    await expect(
      recovery.recoverProcessor(actor, {
        ...input,
        evidence: {
          ...evidence,
          storageSettlement: {
            ...evidence.storageSettlement,
            basis: 'NO_UNRESOLVED_WRITE',
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_DELETION_STATE' });
    const recorded = await recovery.recoverProcessor(actor, input);
    let current = await prisma.deletionJob.findUniqueOrThrow({
      where: { id: job.id },
    });
    await post(`/deletions/${job.id}/retry`, {
      confirm: true,
      expectedJobVersion: current.version,
      idempotencyKey: randomUUID(),
    }).expect(202);
    current = await drain(job.id);
    expect(current.lastFailureCode).toBe('UPLOAD_SETTLEMENT_UNKNOWN');
    const uploads = await recovery.inspectUpload(actor, job.id);
    await recovery.settleUploads(actor, {
      schemaVersion: 1,
      jobId: job.id,
      uploadManifestSha256: uploads.uploadManifestSha256!,
      observedAt: new Date().toISOString(),
      evidenceReference: `ops:${randomUUID()}`,
      evidenceText:
        'Synthetic provider confirms the expired grant has no outstanding requests.',
    });
    current = await prisma.deletionJob.findUniqueOrThrow({
      where: { id: job.id },
    });
    await post(`/deletions/${job.id}/retry`, {
      confirm: true,
      expectedJobVersion: current.version,
      idempotencyKey: randomUUID(),
    }).expect(202);
    expect((await drain(job.id)).state).toBe('COMPLETED');
    expect(objects.has(source)).toBe(false);
    expect(objects.has(output)).toBe(false);
    const otherId = `${prefix}-recovery-admin`,
      sessionId = randomUUID();
    actorIds.push(otherId);
    await prisma.user.create({
      data: {
        id: otherId,
        role: 'ADMIN',
        name: 'Recovery reviewer',
        email: `${otherId}@example.test`,
      },
    });
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: otherId,
        token: randomUUID(),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    expect(
      await recovery.recoverProcessor({ id: otherId, sessionId }, input),
    ).toEqual(recorded);
    expect(
      (
        await prisma.mediaProcessingRecovery.findUniqueOrThrow({
          where: { id: recorded.recoveryId },
        })
      ).operatorId,
    ).toBe(adminId);
  });
  it('does not expose a signed upload URL when deletion wins during signing', async () => {
    const target = await page();
    let signingStarted!: () => void, release!: () => void;
    const started = new Promise<void>((resolve) => {
        signingStarted = resolve;
      }),
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
    const service = imageService(
      () => Promise.resolve(),
      async (input) => {
        signingStarted();
        await held;
        return {
          key: input.key,
          uploadUrl: 'https://synthetic.example.test/not-exposed',
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 3_600_000),
          requiredHeaders: {
            contentType: input.contentType,
            sha256: input.sha256,
          },
        };
      },
    );
    const preparation = service
      .prepareUpload({
        creatorId,
        pageId: target.id,
        contentType: 'image/png',
        byteSize: 3,
        sha256: 'A'.repeat(43) + '=',
      })
      .then(
        () => null,
        (error) => error as Error,
      );
    await started;
    const { job } = await acceptance(target.id);
    release();
    expect(await preparation).toBeInstanceOf(Error);
    expect(
      await prisma.pageUploadGrant.count({ where: { pageId: target.id } }),
    ).toBe(0);
    expect((await drain(job.id)).state).toBe('COMPLETED');
  });

  it('settles a removed page before completing an accepted creator job and rejects stale storage acknowledgement', async () => {
    const owner = `${prefix}-detached-owner`;
    actorIds.push(owner);
    await prisma.user.create({
      data: {
        id: owner,
        email: `${owner}@example.test`,
        name: 'Detached owner',
      },
    });
    await prisma.session.create({
      data: {
        id: randomUUID(),
        token: randomUUID(),
        userId: owner,
        expiresAt: new Date(Date.now() + 600_000),
      },
    });
    const verificationId = randomUUID();
    const unrelatedId = randomUUID();
    await prisma.verification.createMany({
      data: [
        {
          id: verificationId,
          identifier: 'reset-password:fixture',
          value: owner,
          expiresAt: new Date(),
        },
        {
          id: unrelatedId,
          identifier: 'unrelated-fixture',
          value: owner,
          expiresAt: new Date(),
        },
      ],
    });
    const target = await page(owner);
    const live = await page(owner);
    const previewPath = `/creators/${owner}/deletion-preview`;
    const deletePath = `/creators/${owner}/deletions`;
    await post(previewPath, { expectedModerationVersion: 0 }).expect(409);
    const old = new Date(Date.now() - 60_000);
    const mediaId = randomUUID(),
      key = `pages/${target.id}/sources/${mediaId}`;
    await prisma.pageImage.create({
      data: {
        id: mediaId,
        pageId: target.id,
        sourceStorageKey: key,
        sourceMimeType: 'image/png',
        sourceByteSize: 3,
        sourceSha256: 'fixture',
        uploadExpiresAt: old,
        expiresAt: old,
      },
    });
    await new PrismaMediaProcessingControl(prisma).recordGrant({
      kind: 'IMAGE',
      creatorId: owner,
      pageId: target.id,
      mediaId,
      objectKey: key,
      issuedAt: new Date(old.getTime() - 60_000),
      expiresAt: old,
    });
    expect(
      await prisma.pageUploadGrant.findFirstOrThrow({
        where: { pageId: target.id },
      }),
    ).toMatchObject({ creatorId: owner });
    expect(
      await new PrismaPagesRepository(prisma).deleteOwnedPage({
        creatorId: owner,
        pageId: target.id,
      }),
    ).toBe('deleted');
    const media = new PrismaMediaCleanupRepository(prisma);
    const [oldClaim] = await media
      .claimCleanupTasks({
        now: new Date(),
        workerId: randomUUID(),
        leaseExpiresAt: new Date(Date.now() + 60_000),
        limit: 100,
      })
      .then((claims) => claims.filter((claim) => claim.objectKey === key));
    if (!oldClaim?.leaseOwner)
      throw new Error('Expected ordinary cleanup claim');
    const acceptedPage = await acceptance(live.id);
    // Page tests install the additive schema only. Emulate the separately approved
    // constraint in this isolated test database for the creator acceptance journey.
    await prisma.$executeRaw`ALTER TABLE "PageUploadGrant" ALTER COLUMN "creatorId" SET NOT NULL`;
    try {
      const preview = deletionPreviewSchema.parse(
        (await post(previewPath, { expectedModerationVersion: 0 }).expect(200))
          .body,
      );
      expect(preview.counts.pages).toBe(2);
      const body = {
        confirm: true,
        expectedModerationVersion: 0,
        typedTargetId: owner,
        reasonCode: 'OTHER',
        idempotencyKey: randomUUID(),
        confirmationToken: preview.confirmationToken,
      };
      const creatorJob = deletionJobSummarySchema.parse(
        (await post(deletePath, body).expect(202)).body,
      );
      expect(await prisma.session.count({ where: { userId: owner } })).toBe(0);
      await expect(
        prisma.session.create({
          data: {
            id: randomUUID(),
            token: randomUUID(),
            userId: owner,
            expiresAt: new Date(Date.now() + 600_000),
          },
        }),
      ).rejects.toThrow(/Authentication account unavailable/);
      expect(
        await prisma.page.findFirst({
          where: publicPageAvailabilityWhere(live.slug),
        }),
      ).toBeNull();
      for (let i = 0; i < 10; i++) await app!.get(DeletionWorker).runOnce();
      const child = await prisma.deletionJob.findUniqueOrThrow({
        where: {
          targetType_targetId: { targetType: 'PAGE', targetId: target.id },
        },
      });
      expect(child).toMatchObject({
        parentJobId: creatorJob.id,
        detachedPage: true,
        lastFailureCode: 'UPLOAD_SETTLEMENT_UNKNOWN',
      });
      expect(
        await prisma.deletionJob.findUniqueOrThrow({
          where: { id: acceptedPage.job.id },
        }),
      ).toMatchObject({ parentJobId: creatorJob.id, state: 'COMPLETED' });
      expect(
        await prisma.deletionJob.findUniqueOrThrow({
          where: { id: creatorJob.id },
        }),
      ).toMatchObject({
        state: 'NEEDS_ATTENTION',
        lastFailureCode: 'CHILD_JOB_FAILED',
      });
      expect(await prisma.user.count({ where: { id: owner } })).toBe(1);
      const recovery = new PrismaMediaRecoveryRepository(prisma);
      const actor = await operator();
      const evidence = {
        schemaVersion: 1 as const,
        jobId: child.id,
        uploadManifestSha256: child.uploadManifestSha256!,
        observedAt: new Date().toISOString(),
        evidenceReference: `ops:${randomUUID()}`,
        evidenceText:
          'Synthetic provider verifies all requests authorized by this fixture grant have stopped.',
      };
      const [first, replay] = await Promise.all([
        recovery.settleUploads(actor, evidence),
        recovery.settleUploads(actor, evidence),
      ]);
      expect(first).toEqual(replay);
      const parent = await prisma.deletionJob.findUniqueOrThrow({
        where: { id: creatorJob.id },
      });
      await post(`/deletions/${parent.id}/retry`, {
        confirm: true,
        expectedJobVersion: parent.version,
        idempotencyKey: randomUUID(),
      }).expect(202);
      await app!.get(DeletionWorker).runOnce();
      await media.markCleanupSucceeded({
        taskId: oldClaim.id,
        workerId: oldClaim.leaseOwner,
      });
      expect(
        await prisma.deletionJobMedia.count({
          where: { jobId: child.id, completedAt: null },
        }),
      ).toBe(1);
      expect((await drain(parent.id)).state).toBe('COMPLETED');
      expect(deletes).toContain(key);
      expect(await prisma.user.count({ where: { id: owner } })).toBe(0);
      expect(
        await prisma.verification.count({ where: { id: verificationId } }),
      ).toBe(0);
      expect(
        await prisma.verification.count({ where: { id: unrelatedId } }),
      ).toBe(1);
      expect(await recovery.settleUploads(actor, evidence)).toEqual(first);
      await prisma.$executeRaw`ALTER TABLE "PageUploadGrant" ALTER COLUMN "creatorId" DROP NOT NULL`;
      expect(
        deletionJobSummarySchema.parse(
          (await post(deletePath, body).expect(202)).body,
        ).id,
      ).toBe(creatorJob.id);
    } finally {
      await prisma.$executeRaw`ALTER TABLE "PageUploadGrant" ALTER COLUMN "creatorId" DROP NOT NULL`;
      await prisma.verification.deleteMany({
        where: { id: { in: [verificationId, unrelatedId] } },
      });
    }
  });

  it('purges more than one batch of eligible children without discarding retained proof', async () => {
    const now = new Date('2020-01-01T00:00:00Z');
    const targetId = `${prefix}-retention-owner`;
    actorIds.push(targetId);
    const parent = await prisma.deletionJob.create({
      data: {
        targetType: 'CREATOR',
        targetId,
        reasonCode: 'OTHER',
        state: 'COMPLETED',
        completedAt: now,
      },
    });
    const children = Array.from({ length: 103 }, () => ({
      id: randomUUID(),
      targetId: randomUUID(),
    }));
    pageIds.push(...children.map((child) => child.targetId));
    await prisma.deletionJob.createMany({
      data: children.map((child) => ({
        ...child,
        parentJobId: parent.id,
        targetType: 'PAGE',
        reasonCode: 'OTHER',
        state: 'COMPLETED',
        completedAt: now,
      })),
    });
    await prisma.deletionAcceptanceReceipt.createMany({
      data: children.map((child) => ({
        actorId: adminId,
        operation: 'PAGE_DELETE',
        idempotencyKey: randomUUID(),
        canonicalPayloadHash: 'fixture',
        acceptedAt: now,
        jobId: child.id,
      })),
    });
    expect(await purgeDeletionJobs(prisma)).toBe(100);
    expect(
      await prisma.deletionJob.count({ where: { parentJobId: parent.id } }),
    ).toBe(3);
    expect(
      await prisma.deletionAcceptanceReceipt.count({
        where: { job: { parentJobId: parent.id } },
      }),
    ).toBe(3);
    expect(await purgeDeletionJobs(prisma)).toBe(3);
    expect(await purgeDeletionJobs(prisma)).toBe(1);
  });
});
