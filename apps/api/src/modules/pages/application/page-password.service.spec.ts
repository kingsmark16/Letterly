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

    const cookie = `letterly_unlock_${pageId}=${unlocked.token}`;
    await expect(
      service.verifyRequestCookie(
        pageId,
        encryptedPassword.passwordVersion,
        cookie,
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
});
import type { SecretLetterEncryptedPassword } from '@letterly/templates';
