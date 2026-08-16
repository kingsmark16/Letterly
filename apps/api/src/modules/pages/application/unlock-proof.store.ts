export const UNLOCK_PROOF_STORE = Symbol('UNLOCK_PROOF_STORE');

export interface UnlockProofStore {
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
  revoke(pageId: string, ttlSeconds: number): Promise<void>;
}
