import { createDecipheriv, createHash } from 'node:crypto';
import { jest } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  PAGE_PASSWORD_ENCRYPTION_KEY,
  PAGE_PASSWORD_ENCRYPTION_KEY_VERSION,
  PagePasswordConfigurationError,
  PagePasswordService,
} from '../src/modules/pages/application/page-password.service';
import {
  PAGE_PASSWORD_REPOSITORY,
  type PagePasswordRepository,
} from '../src/modules/pages/application/page-password.repository';
import {
  UNLOCK_PROOF_STORE,
  type UnlockProofStore,
} from '../src/modules/pages/application/unlock-proof.store';
import { pagePasswordServiceProvider } from '../src/modules/pages/pages.module';

const pageId = '11111111-1111-4111-8111-111111111111';
const encryptionKey = 'composition-test-key-that-is-long-enough';

function createDependencies() {
  return {
    repository: {
      setOwnedPassword: jest
        .fn<PagePasswordRepository['setOwnedPassword']>()
        .mockResolvedValue('updated'),
      findPublishedPassword:
        jest.fn<PagePasswordRepository['findPublishedPassword']>(),
    },
    store: {
      set: jest.fn<UnlockProofStore['set']>().mockResolvedValue(undefined),
      get: jest.fn<UnlockProofStore['get']>(),
      revoke: jest
        .fn<UnlockProofStore['revoke']>()
        .mockResolvedValue(undefined),
    },
  };
}

describe('Password service factory composition', () => {
  let module: TestingModule | undefined;

  afterEach(async () => {
    await module?.close();
    module = undefined;
  });

  it.each([undefined, 'configured-version'])(
    'uses token overrides, encrypts with the supplied key, and retains the version default: %s',
    async (keyVersion) => {
      const { repository, store } = createDependencies();
      const builder = Test.createTestingModule({
        providers: [
          pagePasswordServiceProvider,
          { provide: PAGE_PASSWORD_REPOSITORY, useValue: {} },
          { provide: UNLOCK_PROOF_STORE, useValue: store },
          { provide: PAGE_PASSWORD_ENCRYPTION_KEY, useValue: 'original-key' },
          ...(keyVersion === undefined
            ? []
            : [
                {
                  provide: PAGE_PASSWORD_ENCRYPTION_KEY_VERSION,
                  useValue: keyVersion,
                },
              ]),
        ],
      })
        .overrideProvider(PAGE_PASSWORD_REPOSITORY)
        .useValue(repository)
        .overrideProvider(PAGE_PASSWORD_ENCRYPTION_KEY)
        .useValue(encryptionKey);
      module = await builder.compile();
      const service = module.get(PagePasswordService);
      expect(module.get(PagePasswordService)).toBe(service);
      await service.setPassword({
        creatorId: 'creator',
        pageId,
        password: 'secret',
      });
      const encrypted = repository.setOwnedPassword.mock.calls[0]?.[0].password;
      if (!encrypted) throw new Error('Expected an encrypted password');
      expect(encrypted.keyVersion).toBe(keyVersion ?? '1');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        createHash('sha256').update(encryptionKey, 'utf8').digest(),
        Buffer.from(encrypted.iv, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(encrypted.authTag, 'base64url'));
      expect(
        Buffer.concat([
          decipher.update(Buffer.from(encrypted.ciphertext, 'base64url')),
          decipher.final(),
        ]).toString('utf8'),
      ).toBe('secret');
      repository.findPublishedPassword.mockResolvedValue({
        pageId,
        password: encrypted,
      });
      const unlocked = await service.unlock('letter42', 'secret');
      expect(unlocked.pageId).toBe(pageId);
      expect(store.set.mock.calls[0]?.[2]).toBe(24 * 60 * 60);
      expect(store.revoke.mock.calls).toEqual([[pageId, 24 * 60 * 60]]);
    },
  );

  it('resolves without optional configuration and fails safely when encryption is needed', async () => {
    const { repository, store } = createDependencies();
    module = await Test.createTestingModule({
      providers: [
        pagePasswordServiceProvider,
        { provide: PAGE_PASSWORD_REPOSITORY, useValue: repository },
        { provide: UNLOCK_PROOF_STORE, useValue: store },
      ],
    }).compile();
    const service = module.get(PagePasswordService);
    await expect(
      service.setPassword({ creatorId: 'creator', pageId, password: 'secret' }),
    ).rejects.toEqual(new PagePasswordConfigurationError());
    expect(repository.setOwnedPassword.mock.calls).toHaveLength(0);
    await expect(
      service.setPassword({ creatorId: 'creator', pageId, password: null }),
    ).resolves.toEqual({ passwordProtected: false });
    expect(store.revoke.mock.calls).toEqual([[pageId, 24 * 60 * 60]]);
  });

  it('retains service token overrides without constructing missing dependencies', async () => {
    const replacement = {
      verifyUnlockToken: jest
        .fn<PagePasswordService['verifyUnlockToken']>()
        .mockResolvedValue(false),
    };
    module = await Test.createTestingModule({
      providers: [pagePasswordServiceProvider],
    })
      .overrideProvider(PagePasswordService)
      .useValue(replacement)
      .compile();
    expect(module.get(PagePasswordService)).toBe(replacement);
    await expect(
      module.get(PagePasswordService).verifyUnlockToken(pageId, '1', 'token'),
    ).resolves.toBe(false);
  });

  it.each([PAGE_PASSWORD_REPOSITORY, UNLOCK_PROOF_STORE])(
    'rejects composition when a required dependency is absent: %s',
    async (missingToken) => {
      const { repository, store } = createDependencies();
      await expect(
        Test.createTestingModule({
          providers: [
            pagePasswordServiceProvider,
            ...(missingToken === PAGE_PASSWORD_REPOSITORY
              ? []
              : [{ provide: PAGE_PASSWORD_REPOSITORY, useValue: repository }]),
            ...(missingToken === UNLOCK_PROOF_STORE
              ? []
              : [{ provide: UNLOCK_PROOF_STORE, useValue: store }]),
          ],
        }).compile(),
      ).rejects.toThrow('dependencies');
    },
  );
});
