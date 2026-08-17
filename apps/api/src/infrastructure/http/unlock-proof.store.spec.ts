import { MemoryUnlockProofStore } from './unlock-proof.store';

describe('MemoryUnlockProofStore', () => {
  it('expires proofs after their configured lifetime', async () => {
    const store = new MemoryUnlockProofStore();

    await store.set('unlock:key', 'version-1', 60);
    await expect(store.get('unlock:key')).resolves.toBe('version-1');
  });

  it('returns null for unknown proofs', async () => {
    await expect(
      new MemoryUnlockProofStore().get('unlock:missing'),
    ).resolves.toBeNull();
  });

  it('stores a page revocation marker', async () => {
    const store = new MemoryUnlockProofStore();

    await store.revoke('page-1', 60);

    await expect(store.get('unlock:revoked:page-1')).resolves.toEqual(
      expect.any(String),
    );
  });
});
