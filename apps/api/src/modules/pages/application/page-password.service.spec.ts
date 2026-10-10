import { hashUnlockToken } from './unlock-token';
import {
  InvalidPagePasswordError,
  PagePasswordConfigurationError,
  PagePasswordService,
} from './page-password.service';
import type { PagePasswordRepository } from './page-password.repository';
import type { UnlockProofStore } from './unlock-proof.store';

const pageId = '9de65e32-53db-4a66-95d7-6ecaa98d2f7b';

function createRepository(): jest.Mocked<PagePasswordRepository> {
  return {
    setOwnedPassword: jest.fn(),
    findPublishedPassword: jest.fn(),
  };
}

function createStore(): jest.Mocked<UnlockProofStore> {
  return {
    set: jest.fn(),
    get: jest.fn(),
    revoke: jest.fn(),
  };
}

describe('PagePasswordService', () => {
  it('encrypts a password, unlocks it, and stores a page scoped proof', async () => {
    const repository = createRepository();
    const store = createStore();
    const service = new PagePasswordService(
      repository,
      store,
      'test-encryption-key-that-is-long-enough',
      'version-1',
    );
    let encrypted: SecretLetterEncryptedPassword | null = null;
    repository.setOwnedPassword.mockImplementation((input) => {
      encrypted = input.password;
      return Promise.resolve('updated');
    });
    repository.findPublishedPassword.mockImplementation(() =>
      Promise.resolve(encrypted ? { pageId, password: encrypted } : null),
    );
    await expect(
      service.setPassword({ creatorId: 'creator', pageId, password: 'secret' }),
    ).resolves.toEqual({ passwordProtected: true });
    const encryptedPassword =
      repository.setOwnedPassword.mock.calls[0]?.[0].password;
    if (!encryptedPassword) {
      throw new Error('password was not encrypted');
    }
    expect(encryptedPassword.keyVersion).toBe('version-1');
    expect(typeof encryptedPassword.ciphertext).toBe('string');
    expect(typeof encryptedPassword.iv).toBe('string');
    expect(typeof encryptedPassword.authTag).toBe('string');
    expect(typeof encryptedPassword.passwordVersion).toBe('string');
    store.get.mockImplementation((key) => {
      if (key.startsWith('unlock:revoked:')) {
        return Promise.resolve(null);
      }
      const proof = store.set.mock.calls.find(
        ([candidate]) => candidate === key,
      )?.[1];
      return Promise.resolve(typeof proof === 'string' ? proof : null);
    });
    const unlocked = await service.unlock('letter42', 'secret');
    expect(unlocked.pageId).toBe(pageId);
    expect(typeof unlocked.token).toBe('string');
    expect(store.set.mock.calls).toContainEqual([
      expect.stringMatching(new RegExp(`^unlock:${pageId}:`)),
      expect.stringContaining(
        `"passwordVersion":"${encryptedPassword.passwordVersion}"`,
      ),
      24 * 60 * 60,
    ]);

    await expect(
      service.verifyUnlockToken(
        pageId,
        encryptedPassword.passwordVersion,
        unlocked.token,
      ),
    ).resolves.toBe(true);
  });

  it('rejects a wrong password and fails closed without key material', async () => {
    const repository = createRepository();
    const store = createStore();
    const service = new PagePasswordService(
      repository,
      store,
      'test-encryption-key-that-is-long-enough',
      'version-1',
    );
    const noKeyService = new PagePasswordService(repository, store);

    repository.setOwnedPassword.mockResolvedValue('updated');
    await service.setPassword({
      creatorId: 'creator',
      pageId,
      password: 'secret',
    });
    const protectedPage =
      repository.setOwnedPassword.mock.calls[0]?.[0].password;
    repository.findPublishedPassword.mockResolvedValue(
      protectedPage ? { pageId, password: protectedPage } : null,
    );

    await expect(service.unlock('letter42', 'wrong')).rejects.toBeInstanceOf(
      InvalidPagePasswordError,
    );
    await expect(
      noKeyService.setPassword({
        creatorId: 'creator',
        pageId,
        password: 'secret',
      }),
    ).rejects.toBeInstanceOf(PagePasswordConfigurationError);
  });

  it('AC-7 invalidates page-scoped proofs when a password is changed or removed', async () => {
    const repository = createRepository();
    const store = createStore();
    const service = new PagePasswordService(
      repository,
      store,
      'test-encryption-key-that-is-long-enough',
      'version-1',
    );
    repository.setOwnedPassword.mockResolvedValue('updated');

    await expect(
      service.setPassword({ creatorId: 'creator', pageId, password: 'secret' }),
    ).resolves.toEqual({ passwordProtected: true });
    await expect(
      service.setPassword({ creatorId: 'creator', pageId, password: null }),
    ).resolves.toEqual({ passwordProtected: false });

    expect(repository.setOwnedPassword.mock.calls[1]).toEqual([
      {
        creatorId: 'creator',
        pageId,
        password: null,
      },
    ]);
    expect(store.revoke.mock.calls).toEqual([
      [pageId, 24 * 60 * 60],
      [pageId, 24 * 60 * 60],
    ]);
  });

  it('AC-7 rejects an unlock proof issued before the page revocation marker', async () => {
    const repository = createRepository();
    const store = createStore();
    const service = new PagePasswordService(
      repository,
      store,
      'test-encryption-key-that-is-long-enough',
      'version-1',
    );
    store.get.mockImplementation((key) =>
      Promise.resolve(
        key.startsWith('unlock:revoked:')
          ? '200'
          : JSON.stringify({ passwordVersion: 'version-1', issuedAt: 100 }),
      ),
    );

    await expect(
      service.verifyUnlockToken(pageId, 'version-1', 'stale-token'),
    ).resolves.toBe(false);
  });

  it.each([undefined, null, ''])(
    'rejects a missing token without reading the proof store: %s',
    async (token) => {
      const store = createStore();
      const service = new PagePasswordService(createRepository(), store);
      await expect(
        service.verifyUnlockToken(pageId, 'version-1', token),
      ).resolves.toBe(false);
      expect(store.get.mock.calls).toHaveLength(0);
    },
  );

  it('rejects expired or cross page proofs and an outdated password version', async () => {
    const store = createStore();
    const service = new PagePasswordService(createRepository(), store);
    const proofKey = `unlock:${pageId}:${hashUnlockToken('token')}`;
    store.get.mockImplementation((key) =>
      Promise.resolve(
        key === proofKey
          ? JSON.stringify({ passwordVersion: 'version-1', issuedAt: 100 })
          : null,
      ),
    );
    await expect(
      service.verifyUnlockToken('other-page', 'version-1', 'token'),
    ).resolves.toBe(false);
    await expect(
      service.verifyUnlockToken(pageId, 'version-2', 'token'),
    ).resolves.toBe(false);
    store.get.mockResolvedValue(null);
    await expect(
      service.verifyUnlockToken(pageId, 'version-1', 'token'),
    ).resolves.toBe(false);
  });

  it('accepts a proof after revocation and fails closed on store failure', async () => {
    const store = createStore();
    const service = new PagePasswordService(createRepository(), store);
    store.get.mockImplementation((key) =>
      Promise.resolve(
        key.startsWith('unlock:revoked:')
          ? '100'
          : JSON.stringify({ passwordVersion: 'version-1', issuedAt: 101 }),
      ),
    );
    await expect(
      service.verifyUnlockToken(pageId, 'version-1', 'token'),
    ).resolves.toBe(true);
    store.get.mockRejectedValue(new Error('private provider failure'));
    await expect(
      service.verifyUnlockToken(pageId, 'version-1', 'token'),
    ).rejects.toEqual(new PagePasswordConfigurationError());
  });
});
import type { SecretLetterEncryptedPassword } from '@letterly/templates';
